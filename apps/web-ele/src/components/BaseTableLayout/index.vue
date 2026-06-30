<script lang="ts" setup>
import { computed, useSlots } from 'vue';

import { ArrowDown, ArrowUp, Refresh, Search } from '@element-plus/icons-vue';

interface Props {
  queryParams: any; // 页面查询参数
  moreParams: boolean; // 展开收起状态
  loading?: boolean; // 表格加载状态
  total: number; // 分页总条数
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits([
  'update:moreParams',
  'update:queryParams',
  'search',
  'reset',
]);

// 🌟 1. 获取全局插槽对象
const slots = useSlots();
const hasAdvancedSearch = computed(() => !!slots['search-advanced']);

const isExpanded = computed({
  get: () => props.moreParams,
  set: (val) => emit('update:moreParams', val),
});

function handleSearchClick() {
  if (props.queryParams && 'pageNo' in props.queryParams) {
    props.queryParams.pageNo = 1;
  }
  emit('search');
}
</script>

<template>
  <div class="table-pane-container">
    <div class="title-box">
      <slot name="title"></slot>
    </div>
    <div class="vben-filter-wrapper">
      <el-form :inline="true" :model="queryParams" class="filter-grid-form" @submit.prevent>
        <div class="filter-row-basic">
          <slot name="search-basic"></slot>

          <el-form-item class="filter-actions-group">
            <el-button type="primary" link class="toggle-link-btn" @click="isExpanded = !isExpanded"
              v-if="hasAdvancedSearch">
              {{ isExpanded ? '收起筛选' : '更多筛选' }}
              <el-icon class="el-icon--right">
                <component :is="isExpanded ? ArrowUp : ArrowDown" />
              </el-icon>
            </el-button>
            <el-tooltip content="查询" placement="top">
              <el-button type="primary" :icon="Search" circle @click="handleSearchClick" />
            </el-tooltip>
            <el-tooltip content="重置" placement="top">
              <el-button :icon="Refresh" circle @click="emit('reset')" />
            </el-tooltip>
          </el-form-item>
        </div>

        <div class="filter-row-expanded" :class="[{ 'is-expanded': isExpanded }]">
          <slot name="search-advanced"></slot>
        </div>
      </el-form>
    </div>

    <div class="vben-data-card-wrapper">
      <div class="card-toolbar">
        <div class="toolbar-left-box">
          <slot name="toolbar-left"></slot>
        </div>
        <div class="toolbar-right-box">
          <slot name="toolbar-right"></slot>
        </div>
      </div>

      <div class="main-table-container vben-thin-scroll" v-loading="loading">
        <slot name="table"></slot>
      </div>

      <div class="pagination-footer-box">
        <el-pagination v-model:current-page="queryParams.pageNo" v-model:page-size="queryParams.pageSize" :total="total"
          :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper" background
          @size-change="emit('search')" @current-change="emit('search')" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.table-pane-container {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: 100%;
  padding: 12px;
  overflow: hidden;
  background-color: #f8fafc;
  transition: background-color 0.3s;

  :host-context(.dark) &,
  .dark & {
    background-color: #14161a !important;
  }
}

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
        max-height: 80px;

        /* 预期最大高度 */
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

          &:hover {
            color: #409eff;
          }
        }

        &:hover {
          color: #3b82f6;
        }
      }
    }
  }
}

.vben-data-card-wrapper {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
  background: #fff;
  border-radius: 6px;

  :host-context(.dark) &,
  .dark & {
    background: #1e1e1e !important;
    box-shadow: none;
  }

  // 数据卡顶部的操作工具栏
  .card-toolbar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;

    .toolbar-left-box {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  }

  .main-table-container {
    flex: 1;
    overflow: hidden;
  }

  .pagination-footer-box {
    display: flex;
    flex-shrink: 0;
    justify-content: flex-end;
    margin-top: 14px;
  }
}

.vben-thin-scroll {
  &::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
}
</style>
