<!-- components/ExportFloatingBall/index.vue -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { Close, Delete, Download, Refresh, RefreshRight } from '@element-plus/icons-vue';
import { ElBadge, ElButton, ElMessage, ElScrollbar, ElTag } from 'element-plus';

import {
  delExportTasksApi,
  ExportStatusMap,
  type ExportTask,
  getExportTasksApi,
  onceAgainExportExcelApi,
} from '#/api/common/export';

defineOptions({ name: 'ExportFloatingBall' });

// 悬浮球位置
const position = ref({ x: window.innerWidth - 80, y: window.innerHeight - 120 });
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const showPanel = ref(false);
const loading = ref(false);
const tasks = ref<ExportTask[]>([]);
const retryingId = ref<null | number>(null);
const deletingId = ref<null | number>(null);
let pollingTimer: null | ReturnType<typeof setInterval> = null;

// 是否有进行中的任务
const hasPending = computed(() => tasks.value.some(t => [0, 1].includes(t.exportStatus)));
const hasUnread = computed(() => tasks.value.some(t => [0, 1, 3].includes(t.exportStatus)));

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

// 清空已完成/失败的任务
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

// 刷新
function handleRefresh() {
  loadTasks();
}

// 轮询
function startPolling() {
  if (pollingTimer) return;
  pollingTimer = setInterval(() => {
    if (hasPending.value && showPanel.value) {
      loadTasks();
    } else if (hasPending.value) {
      // 后台更新，不刷新UI，只更新红点提示
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

// 悬浮球拖拽逻辑
function handleMouseDown(e: MouseEvent) {
  isDragging.value = true;
  dragOffset.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y,
  };
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return;
  let newX = e.clientX - dragOffset.value.x;
  let newY = e.clientY - dragOffset.value.y;
  
  // 边界限制
  newX = Math.max(10, Math.min(window.innerWidth - 70, newX));
  newY = Math.max(10, Math.min(window.innerHeight - 70, newY));
  
  position.value = { x: newX, y: newY };
}

function handleMouseUp() {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
}

function togglePanel() {
  if (!isDragging.value) {
    showPanel.value = !showPanel.value;
    if (showPanel.value) {
      loadTasks();
    }
  }
}

// 监听窗口大小变化，调整位置
function handleResize() {
  position.value = {
    x: Math.min(position.value.x, window.innerWidth - 70),
    y: Math.min(position.value.y, window.innerHeight - 70),
  };
}

onMounted(() => {
  loadTasks();
  window.addEventListener('resize', handleResize);
  window.addEventListener('refresh-export-tasks', handleRefresh);
});

onUnmounted(() => {
  stopPolling();
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('refresh-export-tasks', handleRefresh);
});
</script>

<template>
  <div class="export-floating-ball">
    <!-- 悬浮球 -->
    <div
      class="floating-ball"
      :style="{ left: `${position.x}px`, top: `${position.y}px` }"
      @mousedown="handleMouseDown"
      @click="togglePanel"
    >
      <ElBadge :value="hasUnread ? '' : undefined" :is-dot="hasUnread">
        <div class="ball-content">
          <el-icon :size="24"><Download /></el-icon>
          <span v-if="hasPending" class="pending-dot"></span>
        </div>
      </ElBadge>
    </div>

    <!-- 导出任务面板 -->
    <transition name="fade">
      <div
        v-if="showPanel"
        class="export-panel"
        :style="{ left: `${position.x - 380}px`, top: `${position.y - 200}px` }"
      >
        <div class="panel-header">
          <span class="panel-title">导出任务</span>
          <div class="panel-actions">
            <ElButton link :icon="Refresh" :loading="loading" @click="handleRefresh" />
            <ElButton link :icon="Delete" :disabled="tasks.length === 0" @click="handleClear" />
            <ElButton link :icon="Close" @click="showPanel = false" />
          </div>
        </div>

        <ElScrollbar v-if="tasks.length > 0" max-height="400px">
          <div class="task-list">
            <div
              v-for="task in tasks"
              :key="task.exportId"
              class="task-item"
            >
              <div class="task-header">
                <div class="flex items-center gap-2">
                  <span class="task-title">{{ getModuleName(task.moduleCode) }}</span>
                  <ElTag :type="getStatusType(task.exportStatus)" size="small">
                    {{ ExportStatusMap[task.exportStatus]?.label || '未知' }}
                  </ElTag>
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
                  <ElButton
                    v-if="task.exportStatus === 2"
                    link
                    size="small"
                    :icon="Download"
                    @click.stop="downloadFile(task.fileAddr, task.fileName)"
                  >
                    下载
                  </ElButton>
                  <ElButton
                    v-if="task.exportStatus === 3"
                    link
                    size="small"
                    :icon="RefreshRight"
                    :loading="retryingId === task.exportId"
                    @click.stop="handleRetry(task, $event)"
                  >
                    重试
                  </ElButton>
                  <ElButton
                    link
                    size="small"
                    type="danger"
                    :icon="Delete"
                    :loading="deletingId === task.exportId"
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
          <el-empty description="暂无导出任务" :image-size="80" />
        </div>

        <div class="panel-footer">
          <span class="text-xs text-gray-400">导出任务异步生成，请稍后下载</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="scss">
.export-floating-ball {
  position: relative;
  z-index: 9999;
}

.floating-ball {
  position: fixed;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  cursor: pointer;
  background: linear-gradient(135deg, #409eff, #53a8ff);
  border-radius: 50%;
  box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    box-shadow: 0 6px 16px rgb(0 0 0 / 20%);
    transform: scale(1.05);
  }
  
  .ball-content {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    
    .pending-dot {
      position: absolute;
      top: -4px;
      right: -12px;
      width: 10px;
      height: 10px;
      background-color: #f56c6c;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(0.8);
  }

  70% {
    opacity: 0.7;
    transform: scale(1.2);
  }

  100% {
    opacity: 1;
    transform: scale(0.8);
  }
}

.export-panel {
  position: fixed;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  width: 380px;
  overflow: hidden;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 15%);
  
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #f5f7fa;
    border-bottom: 1px solid #ebeef5;
    
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
    padding: 12px;
    margin-bottom: 8px;
    background: white;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    
    &:hover {
      background: #f5f7fa;
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
        font-size: 11px;
        color: #909399;
      }
    }
    
    .task-name {
      margin-bottom: 8px;
      font-size: 13px;
      color: #606266;
    }
    
    .task-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .task-error {
      margin-top: 8px;
      font-size: 11px;
      color: #f56c6c;
    }
  }
  
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    padding: 20px;
  }
  
  .panel-footer {
    padding: 10px 16px;
    text-align: center;
    background: #f5f7fa;
    border-top: 1px solid #ebeef5;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
