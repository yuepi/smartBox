<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { HomeItem, HomeItemQueryParams } from '#/api/system/housekeeping';

import { h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElButton,
  ElImage,
  ElMessage,
  ElMessageBox,
  ElTag,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteHomeItemApi,
  getHomeItemPageApi,
} from '#/api/system/housekeeping';

import HomeItemEditDialog from './HomeItemEditDialog.vue';

const editDialogRef = ref();
const queryParams = ref<HomeItemQueryParams>({});

// 顶部搜索表单配置
const formOptions: VbenFormProps = {
  wrapperClass: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
  collapsed: false,
  showCollapseButton: false,
  submitOnEnter: true,
  schema: [
    {
      component: 'Input',
      fieldName: 'itemName',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '服务名称:'),
      }),
      componentProps: {
        placeholder: '请输入服务名称',
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'categoryId',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '类目ID:'),
      }),
      componentProps: {
        placeholder: '请输入类目ID',
        clearable: true,
      },
    },
  ],
};

function getFirstImage(urls?: string | string[]): string {
  if (!urls) return '';
  return getImageList(urls)[0] || '';
}

function getImageList(urls?: string | string[]): string[] {
  if (!urls) return [];
  return (Array.isArray(urls) ? urls : urls.split(','))
    .map((url) => url.trim())
    .filter(Boolean);
}

// 表格配置
const gridOptions: VxeTableGridOptions<HomeItem> = {
  keepSource: true,
  height: 'auto',
  id: 'home_item_grid',
  columns: [
    { field: 'homeItemId', title: '服务ID', width: 80, align: 'center' },
    {
      field: 'imageUrls',
      title: '服务图片',
      width: 90,
      align: 'center',
      slots: { default: 'imageUrls' },
    },
    { field: 'itemName', title: '服务名称', minWidth: 150, align: 'left' },
    { field: 'categoryId', title: '类目ID', width: 80, align: 'center' },
    { field: 'unit', title: '单位', width: 70, align: 'center' },
    {
      field: 'skuComboList',
      title: 'SKU规格',
      width: 110,
      align: 'center',
      slots: { default: 'skuComboList' },
    },
    { field: 'description', title: '服务描述', minWidth: 160, align: 'left' },
    { field: 'sort', title: '排序', width: 70, align: 'center' },
    {
      field: 'status',
      title: '状态',
      width: 80,
      align: 'center',
      slots: { default: 'status' },
    },
    { field: 'createdName', title: '创建人', width: 100, align: 'center' },
    { field: 'createdTime', title: '创建时间', width: 160, align: 'center' },
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
        const params: HomeItemQueryParams = {
          current: page.currentPage,
          size: page.pageSize,
          ...formValues,
        };
        queryParams.value = params;
        return await getHomeItemPageApi(params);
      },
    },
  },
};

const [Grid, gridApi] = useVbenVxeGrid<HomeItem>({
  formOptions,
  gridOptions,
});

function handleAdd() {
  editDialogRef.value?.open();
}

function handleEdit(row: HomeItem) {
  editDialogRef.value?.open(row);
}

async function handleDelete(row: HomeItem) {
  try {
    await ElMessageBox.confirm(
      `确认删除服务项「${row.itemName}」吗？`,
      '提示',
      { type: 'warning' },
    );
    await deleteHomeItemApi(row.homeItemId!);
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
      <template #toolbar-actions>
        <ElButton type="primary" icon="Plus" @click="handleAdd">
          新增服务项
        </ElButton>
      </template>

      <!-- 服务图片插槽 -->
      <template #imageUrls="{ row }">
        <div class="flex items-center justify-center py-1">
          <ElImage
            v-if="row.imageUrls"
            :src="getFirstImage(row.imageUrls)"
            :preview-src-list="getImageList(row.imageUrls)"
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

      <!-- SKU 规格摘要插槽 -->
      <template #skuComboList="{ row }">
        <ElTag v-if="row.skuComboCount" type="info" size="small">
          {{ row.skuComboCount }} 个可售规格
        </ElTag>
        <span v-else class="text-xs text-gray-400">暂无可售规格</span>
      </template>

      <!-- 状态 Tag 插槽 -->
      <template #status="{ row }">
        <ElTag :type="row.status === 0 ? 'success' : 'danger'" size="small">
          {{ row.status === 0 ? '启用' : '禁用' }}
        </ElTag>
      </template>

      <!-- 操作插槽 -->
      <template #action="{ row }">
        <div class="flex items-center justify-center gap-1">
          <ElButton size="small" type="primary" link @click="handleEdit(row)">
            编辑
          </ElButton>
          <ElButton size="small" type="danger" link @click="handleDelete(row)">
            删除
          </ElButton>
        </div>
      </template>
    </Grid>

    <HomeItemEditDialog ref="editDialogRef" @success="() => gridApi.query()" />
  </Page>
</template>
