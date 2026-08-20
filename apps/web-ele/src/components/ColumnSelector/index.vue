<script setup lang="ts">
import type { TableColumnConfig } from '#/constants/tableColumns';

import { computed, ref, watch } from 'vue';

import { LucidePin } from '@vben/icons';
// 定义置顶/固定方向类型
type PinDirection = 'left' | 'right' | false;

interface ExtendedColumnConfig extends TableColumnConfig {
  pinned?: PinDirection; // 标记用户自定义固定状态：'left' | 'right' | false
}

interface Props {
  storageKey: string;
  defaultColumns: ExtendedColumnConfig[];
}

const props = defineProps<Props>();
const emit = defineEmits(['update:columns', 'change']);

// 内部列配置
const columns = ref<ExtendedColumnConfig[]>([]);

// 按 [左固定 -> 普通列 -> 右固定] 排序，保证表格和配置列表顺序一致
function sortColumns(cols: ExtendedColumnConfig[]) {
  const defaultIndexMap = new Map(
    props.defaultColumns.map((col, index) => [col.key, index])
  );

  const leftList = cols.filter(c => c.fixed === 'left' || c.pinned === 'left');
  const rightList = cols.filter(c => c.fixed === 'right' || c.pinned === 'right');
  const normalList = cols.filter(
    c => !c.fixed && !c.pinned && c.fixed !== 'left' && c.fixed !== 'right'
  );

  // 普通列保持默认定义的顺序
  normalList.sort((a, b) => {
    const indexA = defaultIndexMap.get(a.key) ?? 0;
    const indexB = defaultIndexMap.get(b.key) ?? 0;
    return indexA - indexB;
  });

  return [...leftList, ...normalList, ...rightList];
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
            // 兼容历史数据（旧版 pinned 为 boolean）
            let isPinned: PinDirection = false;
            if (typeof savedCol.pinned === 'boolean') {
              isPinned = savedCol.pinned ? 'left' : false;
            } else if (savedCol.pinned) {
              isPinned = savedCol.pinned;
            }

            return {
              ...defaultCol,
              visible: savedCol.visible,
              pinned: isPinned,
              // 如果用户指定了 pinned，以用户为准；否则走默认 fixed
              fixed: isPinned || defaultCol.fixed || false,
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
        pinned: (col.fixed as PinDirection) || false,
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

// 切换固定状态（左固定 -> 右固定 -> 取消固定）
function setPin(col: ExtendedColumnConfig, target: PinDirection) {
  if (col.fixed && !col.pinned) return; // 系统默认强固定的不可修改

  // 点击当前已固定的方向则取消固定，否则切换为目标方向
  const newPin = col.pinned === target ? false : target;
  col.pinned = newPin;
  col.fixed = newPin; // Element Plus 表格所需的 fixed 属性 ('left' | 'right' | false)

  if (newPin) {
    col.visible = true; // 固定时强行显示
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
placement="bottom-end" :width="460" trigger="click" :hide-after="0"
    popper-class="!p-0 !rounded-lg overflow-hidden border-none shadow-xl"
>
    <template #reference>
      <el-button link class="!p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors rounded-md group">
        <el-badge :value="hiddenCount" :hidden="hiddenCount === 0" type="warning" :offset="[2, 2]">
          <el-icon :size="20" class="text-gray-500 group-hover:text-primary transition-colors">
            <Setting />
          </el-icon>
        </el-badge>
      </el-button>
    </template>

    <!-- 配置面板主体 -->
    <div class="flex flex-col bg-white dark:bg-zinc-900 overflow-hidden">
      <!-- 头部：标题与重置 -->
      <div
        class="flex items-center justify-between px-4 py-3 bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-700"
>
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">表格列配置</span>
          <span
v-if="hiddenCount > 0"
            class="text-xs text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded"
>
            已隐藏 {{ hiddenCount }} 项
          </span>
        </div>
        <el-button link type="primary" size="small" class="!text-xs font-normal" @click="handleReset">
          恢复默认
        </el-button>
      </div>

      <!-- 中间：字段列表 (双列布局) -->
      <div class="p-3">
        <el-scrollbar max-height="380px">
          <div class="grid grid-cols-2 gap-x-3 gap-y-1">
            <div
v-for="col in columns" :key="col.key"
              class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-zinc-800 group transition-all border border-transparent"
              :class="{ '!bg-blue-50/40 dark:!bg-blue-950/20 !border-blue-100 dark:!border-blue-900/30': col.pinned }"
>
              <!-- 复选框及名称 -->
              <el-checkbox
v-model="col.visible" :disabled="col.fixed && !col.pinned" @change="handleChange"
                class="!mr-0 flex-1 min-w-0"
>
                <span
class="text-sm truncate block max-w-[100px]" :class="[
                  col.visible ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 italic',
                  col.pinned || col.fixed ? 'font-semibold text-primary' : ''
                ]"
>
                  {{ col.label }}
                </span>
              </el-checkbox>

              <!-- 右侧固钉/操作按钮组 -->
              <div class="flex items-center gap-0.5 ml-1">
                <!-- 系统默认强制固定的 Tag -->
                <el-tag
v-if="col.fixed && !col.pinned" size="small" type="info" effect="plain"
                  class="!scale-75 !px-1 opacity-60"
>
                  固定
                </el-tag>

                <!-- 用户可控制的左右固定按钮 -->
                <template v-else>
                  <!-- 固定到左侧 -->
                  <button
type="button" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    :class="col.pinned === 'left' ? 'text-primary font-bold' : 'text-gray-300 hover:text-gray-500'"
                    title="固定在最左侧" @click.stop="setPin(col, 'left')"
>
                    <LucidePin
      class="size-4  transition-transform"
      :class="col.pinned === 'left' ? 'text-primary' : 'text-gray-300 hover:text-gray-500'"
    />
                  </button>

                  <!-- 固定到右侧 -->
                  <button
type="button" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    :class="col.pinned === 'right' ? 'text-primary font-bold' : 'text-gray-300 hover:text-gray-500'"
                    title="固定在最右侧" @click.stop="setPin(col, 'right')"
>
                    <LucidePin
      class="size-4 -rotate-90 transition-transform"
      :class="col.pinned === 'right' ? 'text-primary' : 'text-gray-300 hover:text-gray-500'"
    />
                  </button>
                </template>
              </div>
            </div>
          </div>
        </el-scrollbar>
      </div>

      <!-- 底部：快捷操作 -->
      <div
        class="grid grid-cols-2 gap-3 p-3 border-t border-gray-100 dark:border-zinc-700 bg-gray-50/30 dark:bg-zinc-800/30"
>
        <el-button size="small" class="!rounded-md" @click="handleSelectAll">
          全选
        </el-button>
        <el-button size="small" class="!rounded-md" @click="handleDeselectAll">
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
