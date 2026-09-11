<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type {
  RecycleItem,
  RecycleItemQueryParams,
} from '#/api/operation/recycleItem';

import { h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElButton, ElImage, ElMessage, ElMessageBox, ElTag } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteRecycleItemApi,
  getRecycleItemPageApi,
} from '#/api/operation/recycleItem';

import RecycleItemEditDialog from './RecycleItemEditDialog.vue';

const editDialogRef = ref();
const queryParams = ref<RecycleItemQueryParams>({});

// 顶部搜索表单配置
const formOptions: VbenFormProps = {
  wrapperClass: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
  collapsed: false,
  showCollapseButton: false,
  submitOnEnter: true,
  schema: [
    {
      component: 'Input',
      fieldName: 'category',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '品类:'),
      }),
      componentProps: {
        placeholder: '请输入品类',
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'name',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '物品名称:'),
      }),
      componentProps: {
        placeholder: '请输入物品名称',
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'brand',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '品牌:'),
      }),
      componentProps: {
        placeholder: '请输入品牌',
        clearable: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'status',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '状态:'),
      }),
      componentProps: {
        placeholder: '请选择状态',
        clearable: true,
        options: [
          { label: '启用', value: 0 },
          { label: '禁用', value: 1 },
        ],
      },
    },
  ],
};

// 表格配置
const gridOptions: VxeTableGridOptions<RecycleItem> = {
  keepSource: true,
  height: 'auto',
  id: 'operation_recycle_item_grid',
  columns: [
    { field: 'recycleItemId', title: 'ID', width: 80, align: 'center' },
    {
      field: 'imageUrl',
      title: '物品图片',
      width: 100,
      align: 'center',
      slots: { default: 'imageUrl' },
    },
    { field: 'category', title: '品类', minWidth: 120, align: 'left' },
    { field: 'brand', title: '品牌', minWidth: 120, align: 'left' },
    { field: 'name', title: '物品名称', minWidth: 160, align: 'left' },
    { field: 'spec', title: '规格', minWidth: 120, align: 'center' },
    { field: 'useCondition', title: '使用情况', minWidth: 120, align: 'center' },
    {
      field: 'price',
      title: '参考价格',
      width: 120,
      align: 'right',
      formatter: ({ cellValue }) =>
        cellValue !== undefined && cellValue !== null
          ? `¥ ${Number(cellValue).toFixed(2)}`
          : '-',
    },
    {
      field: 'status',
      title: '状态',
      width: 90,
      align: 'center',
      slots: { default: 'status' },
    },
    { field: 'remark', title: '备注', minWidth: 160, align: 'left' },
    {
      field: 'action',
      title: '操作',
      width: 140,
      fixed: 'right',
      align: 'center',
      slots: { default: 'action' },
    },
  ],
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        const params: RecycleItemQueryParams = {
          pageNo: page.currentPage,
          pageSize: page.pageSize,
          ...formValues,
        };
        queryParams.value = params;
        const res = await getRecycleItemPageApi(params);
        return {
          items: res.records || [],
          total: res.total || 0,
        };
      },
    },
  },
};

const [Grid, gridApi] = useVbenVxeGrid<RecycleItem>({
  formOptions,
  gridOptions,
});

// 新增 / 编辑 / 删除
function handleAdd() {
  editDialogRef.value?.open();
}

function handleEdit(row: RecycleItem) {
  editDialogRef.value?.open(row);
}

async function handleDelete(row: RecycleItem) {
  try {
    await ElMessageBox.confirm(
      `确认删除回收物品「${row.name || row.category}」吗？`,
      '提示',
      { type: 'warning' },
    );
    await deleteRecycleItemApi(row.recycleItemId!);
    ElMessage.success('删除成功');
    gridApi.query();
  } catch {
    // 取消删除
  }
}
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <!-- 顶部操作区（放置新增按钮） -->
      <template #toolbar-actions>
        <ElButton type="primary" icon="Plus" @click="handleAdd">
          新增物品种类
        </ElButton>
      </template>

      <!-- 物品图片预览插槽 -->
      <template #imageUrl="{ row }">
        <div class="flex items-center justify-center py-1">
          <ElImage
            v-if="row.imageUrl"
            :src="row.imageUrl"
            :preview-src-list="[row.imageUrl]"
            preview-teleported
            fit="cover"
            class="h-10 w-10 rounded border border-gray-200"
          >
            <template #error>
              <div
                class="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-400"
              >
                无图
              </div>
            </template>
          </ElImage>
          <span v-else class="text-xs text-gray-400">暂无图片</span>
        </div>
      </template>

      <!-- 状态 Tag 渲染 -->
      <template #status="{ row }">
        <ElTag :type="row.status === 0 ? 'success' : 'danger'" size="small">
          {{ row.status === 0 ? '启用' : '禁用' }}
        </ElTag>
      </template>

      <!-- 操作按钮 -->
      <template #action="{ row }">
        <div class="flex items-center justify-center gap-1">
          <ElButton
            size="small"
            type="primary"
            link
            @click="handleEdit(row)"
          >
            编辑
          </ElButton>
          <ElButton
            size="small"
            type="danger"
            link
            @click="handleDelete(row)"
          >
            删除
          </ElButton>
        </div>
      </template>
    </Grid>

    <!-- 新增 / 编辑弹窗 -->
    <RecycleItemEditDialog
      ref="editDialogRef"
      @success="() => gridApi.query()"
    />
  </Page>
</template>
