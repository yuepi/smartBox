<!-- components/ExportNotification/index.vue -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { Bell, Delete, Download, Refresh, RefreshRight } from '@element-plus/icons-vue';
import { useToggle } from '@vueuse/core';

import {
  delExportTasksApi,
  ExportStatusMap,
  type ExportTask,
  getExportTasksApi,
  onceAgainExportExcelApi,
} from '#/api/common/export';

defineOptions({ name: 'ExportNotificationPopup' });

const emit = defineEmits<{
  clear: [];
}>();

const [open, toggle] = useToggle();
const loading = ref(false);
const tasks = ref<ExportTask[]>([]);
const retryingId = ref<null | number>(null);
const deletingId = ref<null | number>(null);
let pollingTimer: null | ReturnType<typeof setInterval> = null;
let refreshTimer: null | ReturnType<typeof setTimeout> = null;

// 获取模块名称
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

// 获取状态文本
function getStatusText(status: number): string {
  return ExportStatusMap[status]?.label || '未知';
}

// 获取状态类型
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

// 格式化时间
function formatTime(time: string): string {
  if (!time) return '';
  return new Date(time).toLocaleString();
}

// 加载任务列表
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

// 下载文件
function downloadFile(fileAddr: string, fileName: string) {
  if (!fileAddr) {
    ElMessage.error('文件地址不存在');
    return;
  }
  window.open(fileAddr, '_blank');
}

// 重试导出
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

// 删除任务
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

// 清空所有已完成/失败的任务
async function handleClear() {
  const finishedTasks = tasks.value.filter(
    t => t.exportStatus === 2 || t.exportStatus === 3
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
  emit('clear');
}

// 轮询更新
function startPolling() {
  if (pollingTimer) return;
  pollingTimer = setInterval(() => {
    const hasPending = tasks.value.some(t => [0, 1].includes(t.exportStatus));
    if (hasPending) {
      loadTasks();
    }
  }, 5000);
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

watch(tasks, (newTasks) => {
  const hasPending = newTasks.some(t => [0, 1].includes(t.exportStatus));
  if (hasPending) {
    startPolling();
  } else {
    stopPolling();
  }
}, { deep: true });

function handleRefresh() {
  loadTasks();
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    loadTasks();
  }, 2000);
}

const hasUnread = computed(() => {
  return tasks.value.some(t => [0, 1, 3].includes(t.exportStatus));
});

function close() {
  open.value = false;
}

onMounted(() => {
  loadTasks();
  window.addEventListener('refresh-export-tasks', handleRefresh);
});

onUnmounted(() => {
  stopPolling();
  if (refreshTimer) clearTimeout(refreshTimer);
  window.removeEventListener('refresh-export-tasks', handleRefresh);
});
</script>

<template>
  <el-popover
    v-model:visible="open"
    placement="bottom-end"
    :width="380"
    trigger="click"
    :hide-after="0"
  >
    <template #reference>
      <div class="flex-center h-full mr-2" @click.stop="toggle()">
        <el-badge :value="hasUnread ? '' : undefined" :is-dot="hasUnread">
          <el-button :icon="Bell" link class="bell-button" />
        </el-badge>
      </div>
    </template>

    <div class="export-notification">
      <div class="notification-header">
        <span class="text-foreground">导出任务</span>
        <div class="flex gap-1">
          <el-button link :icon="Refresh" :loading="loading" @click="handleRefresh">
            刷新
          </el-button>
          <el-button link :icon="Delete" :disabled="tasks.length === 0" @click="handleClear">
            清空
          </el-button>
        </div>
      </div>

      <el-scrollbar v-if="tasks.length > 0" max-height="400px">
        <div class="task-list">
          <div
            v-for="task in tasks"
            :key="task.exportId"
            class="task-item"
          >
            <div class="task-header">
              <div class="flex items-center gap-2">
                <span class="task-title">{{ getModuleName(task.moduleCode) }}</span>
                <el-tag :type="getStatusType(task.exportStatus)" size="small">
                  {{ getStatusText(task.exportStatus) }}
                </el-tag>
              </div>
              <span class="task-time">{{ formatTime(task.exportTime) }}</span>
            </div>

            <div class="task-name">
              {{ task.fileName || `${getModuleName(task.moduleCode)}导出` }}
            </div>

            <div class="task-footer">
              <div class="flex gap-3 text-xs text-gray-400">
                <span v-if="task.exportCount > 0">共 {{ task.exportCount }} 条</span>
              </div>
              
              <div class="flex gap-1">
                <!-- 已导出：下载按钮 -->
                <el-button
                  v-if="task.exportStatus === 2"
                  link
                  size="small"
                  :icon="Download"
                  @click.stop="downloadFile(task.fileAddr, task.fileName)"
                >
                  下载
                </el-button>
                
                <!-- 失败：重试按钮 -->
                <el-button
                  v-if="task.exportStatus === 3"
                  link
                  size="small"
                  :icon="RefreshRight"
                  :loading="retryingId === task.exportId"
                  @click.stop="handleRetry(task, $event)"
                >
                  重试
                </el-button>
                
                <!-- 删除按钮 -->
                <el-button
                  link
                  size="small"
                  type="danger"
                  :icon="Delete"
                  :loading="deletingId === task.exportId"
                  @click.stop="handleDelete(task, $event)"
                >
                  删除
                </el-button>
              </div>
            </div>

            <!-- 失败原因 -->
            <div
              v-if="task.failReason && task.exportStatus === 3"
              class="task-error"
            >
              失败原因：{{ task.failReason }}
            </div>
          </div>
        </div>
      </el-scrollbar>

      <div v-else class="empty-state">
        <el-empty description="暂无导出任务" :image-size="80" />
      </div>

      <div class="notification-footer">
        <div class="text-xs text-gray-400">
          导出任务异步生成，请稍后下载
        </div>
        <el-button size="small" @click="close">关闭</el-button>
      </div>
    </div>
  </el-popover>
</template>

<style scoped lang="scss">
.bell-button {
  &:hover {
    svg {
      animation: bell-ring 1s both;
    }
  }
}

@keyframes bell-ring {
  0%,
  100% {
    transform-origin: top;
  }

  15% {
    transform: rotateZ(10deg);
  }

  30% {
    transform: rotateZ(-10deg);
  }

  45% {
    transform: rotateZ(5deg);
  }

  60% {
    transform: rotateZ(-5deg);
  }

  75% {
    transform: rotateZ(2deg);
  }
}

.export-notification {
  display: flex;
  flex-direction: column;
  
  .notification-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    font-weight: 500;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }
  
  .task-list {
    padding: 8px;
  }
  
  .task-item {
    padding: 12px;
    margin-bottom: 8px;
    background-color: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    
    &:hover {
      background-color: var(--el-fill-color-light);
    }
    
    .task-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      
      .task-title {
        font-size: 14px;
        font-weight: 500;
      }
      
      .task-time {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }
    
    .task-name {
      margin-bottom: 8px;
      font-size: 13px;
      color: var(--el-text-color-regular);
    }
    
    .task-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .task-error {
      margin-top: 8px;
      font-size: 12px;
      color: var(--el-color-danger);
    }
  }
  
  .empty-state {
    padding: 20px;
  }
  
  .notification-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mr-2 {
  margin-right: 8px;
}
</style>
