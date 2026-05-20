<script setup lang="ts">
import { onMounted, onUnmounted, ref,watch } from 'vue';

import { Refresh } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

import {
  delExportTasksApi,
  ExportStatusMap,
  type ExportTask,
  getExportTasksApi,
  onceAgainExportExcelApi,
} from '#/api/common/export';

const loading = ref(false);
const tasks = ref<ExportTask[]>([]);
const retryingId = ref<null | number>(null);
const deletingId = ref<null | number>(null);
let pollingTimer: null | ReturnType<typeof setInterval> = null;

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
  return map[moduleCode] || '未知';
}

// 获取状态文本
function getStatusText(status: number): string {
  return ExportStatusMap[status]?.label || '未知';
}

// 获取状态类型
function getStatusType(status: number): string {
  return ExportStatusMap[status]?.type || 'info';
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
  
  // 方式1：直接打开链接
  window.open(fileAddr, '_blank');
  
  // 方式2：通过 a 标签下载
  // const link = document.createElement('a');
  // link.href = fileAddr;
  // link.download = fileName;
  // link.click();
}

// 重试导出
async function handleRetry(task: ExportTask) {
  retryingId.value = task.exportId;
  try {
    await onceAgainExportExcelApi(task.exportId);
    ElMessage.success('已重新发起导出，请稍后查看');
    // 延迟刷新
    setTimeout(() => loadTasks(), 2000);
  } catch {
    ElMessage.error('重试失败');
  } finally {
    retryingId.value = null;
  }
}

// 删除任务
async function handleDelete(task: ExportTask) {
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

// 轮询更新（有进行中的任务时）
function startPolling() {
  if (pollingTimer) return;
  pollingTimer = setInterval(() => {
    const hasPending = tasks.value.some(t => [0, 1].includes(t.exportStatus));
    if (hasPending) {
      loadTasks();
    }
  }, 5000); // 5秒轮询一次
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

// 监听任务变化，控制轮询
watch(tasks, (newTasks) => {
  const hasPending = newTasks.some(t => [0, 1].includes(t.exportStatus));
  if (hasPending) {
    startPolling();
  } else {
    stopPolling();
  }
}, { deep: true });

// 监听自定义事件刷新
function handleRefresh() {
  loadTasks();
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
  <div class="export-notification">
    <div class="notification-header">
      <span>导出任务</span>
      <el-button link type="primary" size="small" @click="loadTasks">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>
    
    <div v-loading="loading" class="task-list">
      <template v-if="tasks.length > 0">
        <div
          v-for="task in tasks"
          :key="task.exportId"
          class="task-item"
        >
          <div class="task-info">
            <div class="task-title">
              <span>{{ getModuleName(task.moduleCode) }}</span>
              <el-tag :type="getStatusType(task.exportStatus)" size="small">
                {{ getStatusText(task.exportStatus) }}
              </el-tag>
            </div>
            <div class="task-desc">
              导出时间：{{ task.exportTime }}
              <span v-if="task.exportCount > 0"> | 共 {{ task.exportCount }} 条</span>
            </div>
            <div v-if="task.failReason" class="task-error">
              失败原因：{{ task.failReason }}
            </div>
          </div>
          
          <div class="task-actions">
            <!-- 已导出：显示下载按钮 -->
            <el-button
              v-if="task.exportStatus === 2"
              link
              type="primary"
              size="small"
              @click="downloadFile(task.fileAddr, task.fileName)"
            >
              下载
            </el-button>
            
            <!-- 导出失败：显示重试按钮 -->
            <el-button
              v-if="task.exportStatus === 3"
              link
              type="warning"
              size="small"
              :loading="retryingId === task.exportId"
              @click="handleRetry(task)"
            >
              重试
            </el-button>
            
            <!-- 删除按钮 -->
            <el-button
              link
              type="danger"
              size="small"
              :loading="deletingId === task.exportId"
              @click="handleDelete(task)"
            >
              删除
            </el-button>
          </div>
        </div>
      </template>
      
      <el-empty v-else description="暂无导出任务" :image-size="60" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.export-notification {
  display: flex;
  flex-direction: column;
  width: 380px;
  max-height: 500px;
  
  .notification-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    font-weight: 500;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }
  
  .task-list {
    flex: 1;
    padding: 8px;
    overflow-y: auto;
  }
  
  .task-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    margin-bottom: 8px;
    background-color: var(--el-fill-color-blank);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    
    &:hover {
      background-color: var(--el-fill-color-light);
    }
    
    .task-info {
      flex: 1;
      
      .task-title {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 6px;
        font-weight: 500;
      }
      
      .task-desc {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
      
      .task-error {
        margin-top: 4px;
        font-size: 12px;
        color: var(--el-color-danger);
      }
    }
    
    .task-actions {
      display: flex;
      gap: 8px;
      margin-left: 12px;
    }
  }
}
</style>
