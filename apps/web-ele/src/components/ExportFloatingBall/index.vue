<script setup lang="ts">


import type { ExportTask } from '#/api/common/export';

import { delExportTasksApi, ExportStatusMap, getExportTasksApi, onceAgainExportExcelApi } from '#/api/common/export';

defineOptions({ name: 'ExportFloatingBall' });

const showPanel = ref(false);
const loading = ref(false);
const tasks = ref<ExportTask[]>([]);
const retryingId = ref<null | number>(null);
const deletingId = ref<null | number>(null);
let pollingTimer: null | ReturnType<typeof setInterval> = null;

const hasPending = computed(() => tasks.value.some(t => [0, 1].includes(t.exportStatus)));

const unreadCount = computed(() =>
  tasks.value.filter(t => [0, 1, 3].includes(t.exportStatus)).length
);

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

function getStatusType(status: number): 'danger' | 'info' | 'success' | 'warning' {
  const map: Record<number, any> = {
    2: 'success',
    3: 'danger',
    1: 'warning',
    0: 'info',
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

function downloadFile(fileAddr: string, fileName: string) {
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
  const finishedTasks = tasks.value.filter(t => t.exportStatus === 2 || t.exportStatus === 3);
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

function startPolling() {
  if (pollingTimer) return;
  pollingTimer = setInterval(() => {
    if (hasPending.value && showPanel.value) {
      loadTasks();
    } else if (hasPending.value) {
      getExportTasksApi({ pageNo: 1, pageSize: 20 }).then(res => {
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

function togglePanel() {
  showPanel.value = !showPanel.value;
  if (showPanel.value) {
    loadTasks();
  }
}

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
  <div class="export-sidebar" :class="{ 'is-open': showPanel }">
    <!-- 触发表单 -->
    <div class="export-trigger" @click="togglePanel" v-show="!showPanel">
      <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99" :offset="[-10, 0]">
        <div class="trigger-icon">
          <el-icon :size="20">
            <Download />
          </el-icon>
        </div>
      </el-badge>
    </div>

    <!-- 导出任务面板 -->
    <transition name="slide">
      <div v-if="showPanel" class="export-panel">
        <div class="panel-header">
          <span class="panel-title">导出任务</span>
          <div class="panel-actions">
            <el-button link size="small" icon="Refresh" :loading="loading" @click="handleRefresh" />
            <el-button link size="small" icon="Delete" :disabled="tasks.length === 0" @click="handleClear" />
            <el-button link size="small" icon="Close" @click="showPanel = false" />
          </div>
        </div>

        <el-scrollbar v-if="tasks.length > 0" max-height="400px">
          <div class="task-list">
            <div v-for="task in tasks" :key="task.exportId" class="task-item">
              <div class="task-header">
                <div class="flex items-center gap-2">
                  <span class="task-title">{{ getModuleName(task.moduleCode) }}</span>
                  <el-tag :type="getStatusType(task.exportStatus)" size="small">
                    {{ ExportStatusMap[task.exportStatus]?.label || '未知' }}
                  </el-tag>
                </div>
                <span class="task-time">{{ formatTime(task.exportTime) }}</span>
              </div>

              <div class="task-name">{{ task.fileName || `${getModuleName(task.moduleCode)}导出` }}</div>

              <div class="task-footer">
                <span v-if="task.exportCount > 0" class="task-count">共 {{ task.exportCount }} 条</span>
                <div class="task-actions">
                  <el-button
v-if="task.exportStatus === 2" link size="small" type="primary" icon="Download"
                    @click.stop="downloadFile(task.fileAddr, task.fileName)"
>
                    下载
                  </el-button>
                  <el-button
v-if="task.exportStatus === 3" link size="small" icon="RefreshRight"
                    :loading="retryingId === task.exportId" @click.stop="handleRetry(task, $event)"
>
                    重试
                  </el-button>
                  <el-button
link size="small" type="danger" icon="Delete" :loading="deletingId === task.exportId"
                    @click.stop="handleDelete(task, $event)"
>
                    删除
                  </el-button>
                </div>
              </div>

              <div v-if="task.failReason && task.exportStatus === 3" class="task-error">
                失败原因：{{ task.failReason }}
              </div>
            </div>
          </div>
        </el-scrollbar>

        <div v-else class="empty-state">
          <el-empty description="暂无导出任务" :image-size="60" />
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="scss">
.export-sidebar {
  position: fixed;
  top: 50%;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  transform: translateY(-50%);
}

.export-trigger {
  .trigger-icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    cursor: pointer;
    background: white;
    border-radius: 8px 0 0 8px;
    box-shadow: -2px 0 12px rgb(0 0 0 / 8%);
    transition: all 0.3s;

    &:hover {
      background: #f5f7fa;
      box-shadow: -2px 0 16px rgb(0 0 0 / 12%);
    }

    .el-icon {
      color: #409eff;
    }
  }
}

.export-panel {
  width: 380px;
  max-height: 500px;
  margin-right: 8px;
  overflow: hidden;
  background: white;
  border-radius: 12px 0 0 12px;
  box-shadow: -4px 0 24px rgb(0 0 0 / 8%);

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;

    .panel-title {
      font-size: 14px;
      font-weight: 600;
    }

    .panel-actions {
      display: flex;
      gap: 4px;
    }
  }

  .task-list {
    padding: 8px 12px;
  }

  .task-item {
    padding: 10px 12px;
    margin-bottom: 8px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    transition: background 0.2s;

    &:hover {
      background: #f5f7fa;
    }

    .task-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;

      .task-title {
        font-size: 13px;
        font-weight: 500;
      }

      .task-time {
        font-size: 11px;
        color: #909399;
      }
    }

    .task-name {
      margin-bottom: 6px;
      font-size: 13px;
      color: #606266;
    }

    .task-footer {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;

      .task-count {
        font-size: 12px;
        color: #909399;
      }

      .task-actions {
        display: flex;
        gap: 4px;
      }
    }

    .task-error {
      margin-top: 6px;
      font-size: 12px;
      color: #f56c6c;
    }
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    padding: 20px;
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  width: 0;
  opacity: 0;
  transform: translateX(20px);
}

.slide-enter-to,
.slide-leave-from {
  width: 380px;
  opacity: 1;
  transform: translateX(0);
}
</style>
