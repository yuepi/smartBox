<script lang="ts" setup>
import { computed } from 'vue';

import { ArrowDown, ArrowUp, Refresh, Search } from '@element-plus/icons-vue';

interface Props {
  expanded: boolean;      // 展开状态
  modelValue: any;        // 表单绑定的 queryParams 数据对象
}

const props = defineProps<Props>();
const emit = defineEmits(['update:expanded', 'search', 'reset']);

// 按钮文字切换
const toggleText = computed(() => props.expanded ? '收起筛选' : '更多筛选');
</script>

<template>
  <div class="vben-filter-wrapper">
    <el-form :inline="true" :model="modelValue" class="filter-grid-form" @submit.prevent>
<div class="filter-row-basic">
        <slot></slot>

        <el-form-item class="filter-actions-group">
          <el-button type="primary" link class="toggle-link-btn" @click="emit('update:expanded', !expanded)">
            {{ toggleText }}
            <el-icon class="el-icon--right">
              <component :is="expanded ? ArrowUp : ArrowDown" />
            </el-icon>
          </el-button>
          
          <el-tooltip content="查询" placement="top">
            <el-button type="primary" :icon="Search" circle @click="emit('search')" />
          </el-tooltip>
          <el-tooltip content="重置" placement="top">
            <el-button :icon="Refresh" circle @click="emit('reset')" />
          </el-tooltip>
        </el-form-item>
      </div>

      <div class="filter-row-expanded" :class="[{ 'is-expanded': expanded }]">
        <slot name="advanced"></slot>
      </div>
</el-form>
  </div>
</template>

<style lang="scss" scoped>
.vben-filter-wrapper {
  flex-shrink: 0;
  padding: 16px 16px 12px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 3%);
  transition: background-color 0.3s, box-shadow 0.3s;

  .dark & {
    background: #1e1e1e !important; // 联动你上面 pane 的暗色背景 #2a2a2a 或者 #1e1e1e
    box-shadow: none;
  }

  .filter-grid-form {
    display: flex;
    flex-direction: column;

    :deep(.el-form-item) {
      margin-right: 0 !important;
      margin-bottom: 0 !important;
      
      .el-form-item__label {
        padding-right: 8px;
        font-size: 13px;
        font-weight: 500;
        color: #475569;
      }
    }

    .filter-row-basic {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }

    // ⚡ 核心组件级动效：自闭环，不污染全局
    .filter-row-expanded {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      max-height: 0;
      padding-top: 0;
      margin-top: 0;
      overflow: hidden;
      border-top: 1px dashed transparent;
      opacity: 0;
      transition: 
        max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1),
        opacity 0.2s ease,
        padding-top 0.28s ease,
        margin-top 0.28s ease;

      &.is-expanded {
        max-height: 80px; /* 预期最大高度 */
        padding-top: 12px;
        margin-top: 12px;
        border-top-color: #f1f5f9;
        opacity: 1;

        .dark & {
          border-top-color: #334155;
        }
      }
    }

    .filter-actions-group {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-left: auto !important;

      .toggle-link-btn {
        padding-left: 4px;
        font-size: 13px;
        font-weight: normal;
        color: #64748b;

        .dark & {
          color: #94a3b8;

          &:hover { color: #409eff; }
        }

        &:hover { color: #3b82f6; }
      }
    }
  }
}
</style>
