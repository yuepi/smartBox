<script setup lang="ts">
import type { TableColumnConfig } from '#/constants/deviceTableColumns';

import { computed } from 'vue';

import { Setting } from '@element-plus/icons-vue';

interface Props {
  columns: TableColumnConfig[];
}

const props = defineProps<Props>();
const emit = defineEmits(['change', 'reset']);

// 隐藏的字段数量
const hiddenCount = computed(() => {
  return props.columns.filter(col => !col.fixed && !col.visible).length;
});

// 全选
function handleSelectAll() {
  props.columns.forEach(col => {
    if (!col.fixed) col.visible = true;
  });
  emit('change');
}

// 全不选（保留固定字段）
function handleDeselectAll() {
  props.columns.forEach(col => {
    if (!col.fixed) col.visible = false;
  });
  emit('change');
}

// 重置默认
function handleReset() {
  emit('reset');
}

// 变化时触发
function handleChange() {
  emit('change');
}
</script>

<template>
  <el-popover
    placement="bottom-end"
    :width="280"
    trigger="click"
    :hide-after="0"
  >
    <template #reference>
      <el-button link class="setting-btn">
        <el-badge :value="hiddenCount" :hidden="hiddenCount === 0" type="warning">
          <el-icon :size="18"><Setting /></el-icon>
        </el-badge>
      </el-button>
    </template>

    <div class="column-selector">
      <div class="selector-header">
        <span>自定义显示字段</span>
        <el-button link size="small" @click="handleReset">重置</el-button>
      </div>
      <el-divider />
      <div class="selector-list">
        <div
          v-for="col in columns"
          :key="col.key"
          class="selector-item"
        >
          <el-checkbox
            v-model="col.visible"
            :disabled="col.fixed"
            @change="handleChange"
          >
            <span class="checkbox-label">{{ col.label }}</span>
            <el-tag v-if="col.fixed" size="small" type="info" class="fixed-tag">固定</el-tag>
          </el-checkbox>
        </div>
      </div>
      <div class="selector-footer">
        <el-button size="small" @click="handleSelectAll">全选</el-button>
        <el-button size="small" @click="handleDeselectAll">清空</el-button>
      </div>
    </div>
  </el-popover>
</template>

<style scoped lang="scss">
.setting-btn {
  padding: 8px;
  
  &:hover {
    background-color: var(--el-fill-color-light);
    border-radius: 4px;
  }
}

.column-selector {
  padding: 8px 0;
  
  .selector-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    font-size: 14px;
    font-weight: 500;
  }
  
  .selector-list {
    max-height: 320px;
    padding: 0 12px;
    overflow-y: auto;
    
    .selector-item {
      padding: 10px 0;
      border-bottom: 1px solid var(--el-border-color-lighter);
      
      &:last-child {
        border-bottom: none;
      }
      
      .checkbox-label {
        font-size: 13px;
      }
      
      .fixed-tag {
        margin-left: 8px;
        font-size: 10px;
      }
    }
  }
  
  .selector-footer {
    display: flex;
    gap: 12px;
    justify-content: space-between;
    padding: 12px 12px 8px;
    border-top: 1px solid var(--el-border-color-lighter);
    
    .el-button {
      flex: 1;
      font-size: 12px;
    }
  }
}
</style>
