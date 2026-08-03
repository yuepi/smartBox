<script setup lang="ts">
import type { TableColumnConfig } from '#/constants/tableColumns';

import { computed, ref, watch } from 'vue';

import { Setting } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

interface ExtendedColumnConfig extends TableColumnConfig {
  pinned?: boolean; // 标记用户是否自定义固定
}

interface Props {
  storageKey: string;
  defaultColumns: ExtendedColumnConfig[];
}

const props = defineProps<Props>();
const emit = defineEmits(['update:columns', 'change']);

// 内部列配置
const columns = ref<ExtendedColumnConfig[]>([]);

function sortColumns(cols: ExtendedColumnConfig[]) {
  const defaultIndexMap = new Map(
    props.defaultColumns.map((col, index) => [col.key, index])
  );

  const pinnedList = cols.filter(c => c.fixed || c.pinned);
  const normalList = cols.filter(c => !c.fixed && !c.pinned);

  normalList.sort((a, b) => {
    const indexA = defaultIndexMap.get(a.key) ?? 0;
    const indexB = defaultIndexMap.get(b.key) ?? 0;
    return indexA - indexB;
  });

  return [...pinnedList, ...normalList];
}
// 加载本地配置
function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(props.storageKey);
    if (saved) {
      const savedConfig = JSON.parse(saved);
      if (Array.isArray(savedConfig) && savedConfig.length > 0) {
        const merged = props.defaultColumns.map((defaultCol) => {
          const savedCol = savedConfig.find((c: any) => c.key === defaultCol.key);
          if (savedCol) {
            const isPinned = savedCol.pinned ?? false;
            return {
              ...defaultCol,
              visible: savedCol.visible,
              pinned: isPinned,
              // 如果是用户置顶的，强制赋值 Element Plus 表格所需的 fixed 属性
              fixed: defaultCol.fixed || (isPinned ? 'left' : false),
            };
          }
          return defaultCol;
        });

        columns.value = sortColumns(merged);
        return;
      }
    }
    // 没有缓存时使用默认并排序
    columns.value = sortColumns(
      props.defaultColumns.map(col => ({
        ...col,
        pinned: !!col.fixed,
      }))
    );
  } catch (error) {
    console.error('加载列配置失败:', error);
    columns.value = [...props.defaultColumns];
  }
}

// 保存到本地
function saveToLocalStorage() {
  localStorage.setItem(props.storageKey, JSON.stringify(columns.value));
}

// 隐藏的字段数量
const hiddenCount = computed(() => {
  return columns.value.filter(col => !col.fixed && !col.visible).length;
});

// 全选
function handleSelectAll() {
  columns.value.forEach((col) => {
    if (!col.fixed) col.visible = true;
  });
  notifyChange();
}

// 全不选（保留固定字段）
function handleDeselectAll() {
  columns.value.forEach((col) => {
    if (!col.fixed && !col.pinned) col.visible = false;
  });
  notifyChange();
}

// 重置默认
function handleReset() {
  columns.value = sortColumns(
    props.defaultColumns.map(col => ({
      ...col,
      pinned: false,
      fixed: col.fixed || false,
    }))
  );
  notifyChange();
  ElMessage.success('已重置为默认显示字段');
}

function togglePin(col: ExtendedColumnConfig) {
  if (col.fixed && !col.pinned) return; // 系统默认强固定的不可取消

  col.pinned = !col.pinned;
  // 设置 Element Plus el-table-column 所需的 fixed 属性
  col.fixed = col.pinned ? 'left' : false;

  if (col.pinned) {
    col.visible = true;
  }

  columns.value = sortColumns(columns.value);
  notifyChange();
}

function handleChange() {
  notifyChange();
}

function notifyChange() {
  saveToLocalStorage();
  emit('update:columns', [...columns.value]);
  emit('change');
}

// 初始化
function init() {
  loadFromLocalStorage();
  emit('update:columns', [...columns.value]);
}

// 监听 storageKey
watch(
  () => props.storageKey,
  () => {
    loadFromLocalStorage();
    emit('update:columns', [...columns.value]);
  }
);

init();
</script>

<template>
  <el-popover
    placement="bottom-end"
    :width="440"
    trigger="click"
    :hide-after="0"
    popper-class="!p-0 !rounded-lg overflow-hidden border-none shadow-xl"
  >
    <template #reference>
      <el-button
        link
        class="!p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors rounded-md group"
      >
        <el-badge
          :value="hiddenCount"
          :hidden="hiddenCount === 0"
          type="warning"
          :offset="[2, 2]"
        >
          <el-icon
            :size="20"
            class="text-gray-500 group-hover:text-primary transition-colors"
          >
            <Setting />
          </el-icon>
        </el-badge>
      </el-button>
    </template>

    <!-- 配置面板主体 -->
    <div class="flex flex-col bg-white dark:bg-zinc-900 overflow-hidden">
      <!-- 头部：标题与重置 -->
      <div class="flex items-center justify-between px-4 py-3 bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-700">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">表格列配置</span>
          <span v-if="hiddenCount > 0" class="text-xs text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded">
            已隐藏 {{ hiddenCount }} 项
          </span>
        </div>
        <el-button
          link
          type="primary"
          size="small"
          class="!text-xs font-normal"
          @click="handleReset"
        >
          恢复默认
        </el-button>
      </div>

      <!-- 中间：字段列表 (双列布局) -->
      <div class="p-3">
        <el-scrollbar max-height="380px">
          <div class="grid grid-cols-2 gap-x-3 gap-y-1">
            <div
              v-for="col in columns"
              :key="col.key"
              class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-zinc-800 group transition-all border border-transparent"
              :class="{ '!bg-blue-50/40 dark:!bg-blue-950/20 !border-blue-100 dark:!border-blue-900/30': col.pinned }"
            >
              <!-- 复选框及名称 -->
              <el-checkbox
                v-model="col.visible"
                :disabled="col.fixed && !col.pinned"
                @change="handleChange"
                class="!mr-0 flex-1 min-w-0"
              >
                <span
                  class="text-sm truncate block max-w-[110px]"
                  :class="[
                    col.visible ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 italic',
                    col.pinned || col.fixed ? 'font-semibold text-primary' : ''
                  ]"
                >
                  {{ col.label }}
                </span>
              </el-checkbox>

              <!-- 右侧固钉操作按钮 -->
              <div class="flex items-center ml-1">
                <!-- 系统默认强制固定的 Tag -->
                <el-tag
                  v-if="col.fixed && !col.pinned"
                  size="small"
                  type="info"
                  effect="plain"
                  class="!scale-75 !px-1 opacity-60"
                >
                  固定
                </el-tag>

                <!-- 用户可自由切换固定的 Pin 图标 -->
                <button
                  v-else
                  type="button"
                  class="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                  :class="col.pinned ? 'text-primary' : 'text-gray-300 hover:text-gray-500'"
                  :title="col.pinned ? '取消固定并在最前' : '固定列到最前'"
                  @click.stop="togglePin(col)"
                >
                  <!-- Pin Icon SVG -->
                  <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                    <path d="M878.3 392.1L631.9 145.7c-6.2-6.2-16.4-6.2-22.6 0l-92 92c-6.2 6.2-6.2 16.4 0 22.6l45.2 45.2-184 184-118.8-118.8c-6.2-6.2-16.4-6.2-22.6 0l-45.2 45.2c-6.2 6.2-6.2 16.4 0 22.6l163.8 163.8-216.8 216.8c-6.2 6.2-6.2 16.4 0 22.6l45.2 45.2c6.2 6.2 16.4 6.2 22.6 0l216.8-216.8 163.8 163.8c6.2 6.2 16.4 6.2 22.6 0l45.2-45.2c6.2-6.2 6.2-16.4 0-22.6L631.9 547.3l184-184 45.2 45.2c6.2 6.2 16.4 6.2 22.6 0l92-92c6.3-6.3 6.3-16.5 0-22.7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </el-scrollbar>
      </div>

      <!-- 底部：快捷操作 -->
      <div class="grid grid-cols-2 gap-3 p-3 border-t border-gray-100 dark:border-zinc-700 bg-gray-50/30 dark:bg-zinc-800/30">
        <el-button
          size="small"
          class="!rounded-md"
          @click="handleSelectAll"
        >
          全选
        </el-button>
        <el-button
          size="small"
          class="!rounded-md"
          @click="handleDeselectAll"
        >
          清空可选项
        </el-button>
      </div>
    </div>
  </el-popover>
</template>

<style scoped lang="scss">
:deep(.el-checkbox) {
  display: flex;
  align-items: center;
  height: auto;
}

:deep(.el-checkbox__label) {
  flex: 1;
  padding-left: 6px;
  overflow: hidden;
}

:deep(.el-scrollbar__bar.is-horizontal) {
  display: none !important;
}

:global(.el-popper.is-light) {
  border: 1px solid var(--el-border-color-lighter) !important;
}

:global(.el-popper.is-dark) {
  border: 1px solid #333 !important;
}
</style>
