<script lang="ts" setup>
import type { ExportTask } from '#/api/common/export';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import {
  delExportTasksApi,
  ExportStatusMap,
  getExportTasksApi,
  onceAgainExportExcelApi,
} from '#/api/common/export';

defineOptions({ name: 'ExportPopup' });

const open = ref(false);
const loading = ref(false);
const tasks = ref<ExportTask[]>([]);
const retryingId = ref<null | number>(null);
const deletingId = ref<null | number>(null);
let pollingTimer: null | ReturnType<typeof setInterval> = null;

// 判断是否有正在导出中的任务
const hasPending = computed(() =>
  tasks.value.some((t) => [0, 1].includes(t.exportStatus)),
);

// 未读/进行中/失败的提醒数量
const unreadCount = computed(
  () => tasks.value.filter((t) => [0, 1, 3].includes(t.exportStatus)).length,
);

function close() {
  open.value = false;
}

function getModuleName(moduleCode: number): string {
  const map: Record<number, string> = {
    1: '设备管理',
    2: '回收订单',
    3: '会员管理',
    4: '用户管理',
    5: '清运任务',
    6: '分拣任务',
    7: '故障管理',
  };
  return map[moduleCode] || '未知模块';
}

function getStatusType(
  status: number,
): 'danger' | 'info' | 'success' | 'warning' {
  const map: Record<number, any> = {
    0: 'info',
    1: 'warning',
    2: 'success',
    3: 'danger',
    4: 'info',
  };
  return map[status] || 'info';
}

function formatTime(time: string): string {
  if (!time) return '';
  return new Date(time).toLocaleString();
}

async function loadTasks() {
  loading.value = true;
  try {
    const res = await getExportTasksApi({
      pageNo: 1,
      pageSize: 20,
    });
    tasks.value = res.records || [];
  } catch (error) {
    console.error('加载导出任务失败', error);
  } finally {
    loading.value = false;
  }
}

function downloadFile(fileAddr: string, _fileName: string) {
  if (!fileAddr) {
    ElMessage.error('文件地址不存在');
    return;
  }
  window.open(fileAddr, '_blank');
}

async function handleRetry(task: ExportTask, event: Event) {
  event.stopPropagation();
  retryingId.value = task.exportId;
  try {
    await onceAgainExportExcelApi(task.exportId);
    ElMessage.success('已重新发起导出，请稍后查看');
    setTimeout(() => loadTasks(), 2000);
  } catch {
    ElMessage.error('重试失败');
  } finally {
    retryingId.value = null;
  }
}

async function handleDelete(task: ExportTask, event: Event) {
  event.stopPropagation();
  deletingId.value = task.exportId;
  try {
    await delExportTasksApi(task.exportId);
    ElMessage.success('删除成功');
    await loadTasks();
  } catch {
    ElMessage.error('删除失败');
  } finally {
    deletingId.value = null;
  }
}

async function handleClear() {
  const finishedTasks = tasks.value.filter(
    (t) => t.exportStatus === 2 || t.exportStatus === 3,
  );
  if (finishedTasks.length === 0) {
    ElMessage.info('没有可清空的任务');
    return;
  }
  for (const task of finishedTasks) {
    try {
      await delExportTasksApi(task.exportId);
    } catch {
      console.error('删除失败', task.exportId);
    }
  }
  await loadTasks();
}

function handleRefresh() {
  loadTasks();
}

// 轮询管理
function startPolling() {
  if (pollingTimer) return;
  pollingTimer = setInterval(() => {
    if (hasPending.value && open.value) {
      loadTasks();
    } else if (hasPending.value) {
      getExportTasksApi({ pageNo: 1, pageSize: 20 }).then((res) => {
        tasks.value = res.records || [];
      });
    }
  }, 10_000);
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

watch(hasPending, (newVal) => {
  if (newVal) {
    startPolling();
  } else {
    stopPolling();
  }
});

// 监听弹窗打开时刷最新列表
watch(open, (val) => {
  if (val) {
    loadTasks();
  }
});

onMounted(() => {
  loadTasks();
  window.addEventListener('refresh-export-tasks', handleRefresh);
});

onUnmounted(() => {
  stopPolling();
  window.removeEventListener('refresh-export-tasks', handleRefresh);
});
</script>

<template>
  <ElPopover v-model:visible="open" placement="bottom-end" popper-class="export-popover" :width="380" trigger="click">
    <template #reference>
      <div class="mr-1 flex-center cursor-pointer">
        <ElBadge :hidden="unreadCount === 0" :max="99" :offset="[-2, 6]" :value="unreadCount">
          <ElButton class="export-trigger-btn hover:animate-[shrink_0.3s_ease-in-out]" link>
            <el-icon :size="18">
              <Download />
            </el-icon>
          </ElButton>
        </ElBadge>
      </div>
    </template>

    <div class="export-popup">
      <div class="export-popup-header">
        <span class="export-popup-title">导出任务</span>
        <div class="header-actions">
          <ElButton :loading="loading" class="action-btn" link title="刷新" @click="handleRefresh">
            <el-icon>
              <Refresh />
            </el-icon>
          </ElButton>
          <ElButton :disabled="tasks.length === 0" class="action-btn" link title="清空已完成/失败" @click="handleClear">
            <el-icon>
              <Delete />
            </el-icon>
          </ElButton>
          <ElButton class="action-btn" link title="关闭" @click="close">
            <el-icon>
              <Close />
            </el-icon>
          </ElButton>
        </div>
      </div>

      <ElScrollbar v-if="tasks.length > 0" max-height="360px">
        <div class="task-list">
          <div v-for="task in tasks" :key="task.exportId" class="task-item">
            <div class="task-header">
              <div class="flex items-center gap-2">
                <span class="task-title">{{
                  getModuleName(task.moduleCode)
                  }}</span>
                <ElTag :type="getStatusType(task.exportStatus)" effect="light" size="small">
                  {{
                    (ExportStatusMap as Record<number, { label: string }>)[task.exportStatus]?.label || '未知'
                  }}
                </ElTag>
              </div>
              <span class="task-time">{{
                formatTime(task.exportTime)
                }}</span>
            </div>

            <div class="task-name">
              {{ task.fileName || `${getModuleName(task.moduleCode)}导出` }}
            </div>

            <div class="task-footer">
              <span v-if="task.exportCount > 0" class="task-count">
                共 {{ task.exportCount }} 条
              </span>
              <span v-else></span>

              <div class="task-actions">
                <ElButton
v-if="task.exportStatus === 2" icon="Download" link size="small" type="primary"
                  @click.stop="downloadFile(task.fileAddr, task.fileName)"
>
                  下载
                </ElButton>

                <ElButton
v-if="task.exportStatus === 3" :loading="retryingId === task.exportId" icon="RefreshRight"
                  link size="small" @click.stop="handleRetry(task, $event)"
>
                  重试
                </ElButton>

                <ElButton
:loading="deletingId === task.exportId" icon="Delete" link size="small" type="danger"
                  @click.stop="handleDelete(task, $event)"
>
                  删除
                </ElButton>
              </div>
            </div>

            <div v-if="task.failReason && task.exportStatus === 3" class="task-error">
              失败原因：{{ task.failReason }}
            </div>
          </div>
        </div>
      </ElScrollbar>

      <div v-else class="empty-state">
        <ElEmpty :image-size="60" description="暂无导出任务" />
      </div>

      <div class="export-popup-footer">
        <ElButton size="small" @click="close">关闭</ElButton>
      </div>
    </div>
  </ElPopover>
</template>

<style lang="scss">
.export-popover.el-popper {
  padding: 0 !important;
}
</style>

<style scoped lang="scss">
/* ===== 触发按钮样式 ===== */
.export-trigger-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: hsl(var(--foreground)) !important;
  border-radius: 9999px;
  transition: all 0.2s;

  &:hover {
    background-color: hsl(var(--accent)) !important;
  }

  &:active {
    transform: scale(0.95);
  }
}

@keyframes shrink {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(0.8);
  }

  100% {
    transform: scale(1);
  }
}

/* ===== 弹出面板样式 ===== */
.export-popup {
  .export-popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    .export-popup-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .header-actions {
      display: flex;
      gap: 4px;

      .action-btn {
        padding: 4px;
        font-size: 14px;
        color: var(--el-text-color-secondary);

        &:hover {
          color: var(--el-color-primary);
        }
      }
    }
  }

  /* 任务列表 */
  .task-list {
    padding: 8px 12px;
  }

  .task-item {
    padding: 10px 12px;
    margin-bottom: 8px;
    background: var(--el-fill-color-blank);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    transition: background 0.2s;

    &:hover {
      background: var(--el-fill-color-light);
    }

    .task-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;

      .task-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }

      .task-time {
        font-size: 11px;
        color: var(--el-text-color-secondary);
      }
    }

    .task-name {
      margin-bottom: 6px;
      font-size: 12px;
      color: var(--el-text-color-regular);
      word-break: break-all;
    }

    .task-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .task-count {
        font-size: 11px;
        color: var(--el-text-color-placeholder);
      }

      .task-actions {
        display: flex;
        gap: 6px;
      }
    }

    .task-error {
      margin-top: 6px;
      font-size: 11px;
      color: var(--el-color-danger);
    }
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 140px;
    padding: 16px;
  }

  .export-popup-footer {
    display: flex;
    justify-content: flex-end;
    padding: 8px 14px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}
</style>
