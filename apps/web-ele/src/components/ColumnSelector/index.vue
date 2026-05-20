<script setup lang="ts">
import type { TableColumnConfig } from '#/constants/deviceTableColumns';

import { computed, ref, watch } from 'vue';

import { Setting } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

interface Props {
  storageKey: string;
  defaultColumns: TableColumnConfig[];
}

const props = defineProps<Props>();
const emit = defineEmits(['update:columns', 'change']);

// 内部列配置
const columns = ref<TableColumnConfig[]>([...props.defaultColumns]);

// 加载本地配置
function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(props.storageKey);
    if (saved) {
      const savedConfig = JSON.parse(saved);
      if (Array.isArray(savedConfig) && savedConfig.length > 0) {
        columns.value = props.defaultColumns.map((defaultCol) => {
          const savedCol = savedConfig.find((c: any) => c.key === defaultCol.key);
          return savedCol
            ? { ...defaultCol, visible: savedCol.visible }
            : defaultCol;
        });
        return;
      }
    }
    columns.value = [...props.defaultColumns];
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
  columns.value.forEach(col => {
    if (!col.fixed) col.visible = true;
  });
  saveToLocalStorage();
  emit('update:columns', [...columns.value]);
  emit('change');
}

// 全不选（保留固定字段）
function handleDeselectAll() {
  columns.value.forEach(col => {
    if (!col.fixed) col.visible = false;
  });
  saveToLocalStorage();
  emit('update:columns', [...columns.value]);
  emit('change');
}

// 重置默认
function handleReset() {
  columns.value = props.defaultColumns.map(col => ({ ...col }));
  saveToLocalStorage();
  emit('update:columns', [...columns.value]);
  emit('change');
  ElMessage.success('已重置为默认显示字段');
}

// 变化时触发
function handleChange() {
  saveToLocalStorage();
  emit('update:columns', [...columns.value]);
  emit('change');
}

// 初始化：加载配置并同步给父组件
function init() {
  loadFromLocalStorage();
  emit('update:columns', [...columns.value]);
}

// 监听 storageKey 变化
watch(() => props.storageKey, () => {
  loadFromLocalStorage();
  emit('update:columns', [...columns.value]);
});

init();
</script>

<template>
  <el-popover
    placement="bottom-end"
    :width="420" 
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
          <div class="grid grid-cols-2 gap-x-4 gap-y-1">
            <div
              v-for="col in columns"
              :key="col.key"
              class="flex items-center px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-zinc-800 group transition-all"
            >
              <el-checkbox
                v-model="col.visible"
                :disabled="col.fixed"
                @change="handleChange"
                class="!mr-0 w-full"
              >
                <div class="flex items-center justify-between w-full pr-1">
                  <span 
                    class="text-sm truncate max-w-[120px]" 
                    :class="[
                      col.visible ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 italic',
                      col.fixed ? 'font-medium' : ''
                    ]"
                  >
                    {{ col.label }}
                  </span>
                  <el-tag 
                    v-if="col.fixed" 
                    size="small" 
                    effect="plain" 
                    class="!scale-75 !px-1 opacity-60 group-hover:opacity-100"
                  >
                    固定
                  </el-tag>
                </div>
              </el-checkbox>
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
/* 深度修改 Element Plus 样式以适配 Tailwind */
:deep(.el-checkbox) {
  display: flex;
  align-items: center;
  height: auto;
}

:deep(.el-checkbox__label) {
  flex: 1;
  padding-left: 8px;
}

/* 隐藏横向滚动条 */
:deep(.el-scrollbar__bar.is-horizontal) {
  display: none !important;
}

/* 适配暗色模式的 Popover 边框 */
:global(.el-popper.is-light) {
  border: 1px solid var(--el-border-color-lighter) !important;
}

:global(.el-popper.is-dark) {
  border: 1px solid #333 !important;
}
</style>
