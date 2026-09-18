<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { HomeItem, HomeItemQueryParams } from '#/api/system/housekeeping';
import type { HomeCategory } from '#/api/system/homeCategory';

import { h, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useAccess } from '@vben/access';
import HomeItemBatchDialog from './HomeItemBatchDialog.vue';

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
  getHomeItemCategoriesApi,
} from '#/api/system/housekeeping';

import HomeItemEditDialog from './HomeItemEditDialog.vue';
import DefaultConfigCopyButton from '#/components/DefaultConfigCopyButton/index.vue';

const editDialogRef = ref();
const batchDialogRef = ref();
const { hasAccessByCodes } = useAccess();
const queryParams = ref<HomeItemQueryParams>({});
const categories = ref<HomeCategory[]>([]);
let categoryLoading: Promise<HomeCategory[]> | undefined;
function loadCategories() {
  if (!categoryLoading) {
    categoryLoading = getHomeItemCategoriesApi()
      .then((rows) => {
        categories.value = rows;
        return rows;
      })
      .catch((error) => {
        categoryLoading = undefined;
        throw error;
      });
  }
  return categoryLoading;
}
function categoryName(id?: number) {
  const names: string[] = [];
  const visited = new Set<number>();
  while (id && !visited.has(id)) {
    visited.add(id);
    const category = categories.value.find((row) => row.categoryId === id);
    if (!category) break;
    names.unshift(category.categoryName);
    id = category.parentId;
  }
  return names.join(' / ') || '类目已停用或不存在';
}
function unitName(unit: string) {
  return (
    (
      {
        time: '次',
        pcs: '台',
        hour: '小时',
        kg: '公斤',
        piece: '件',
        sqm: '平方米',
      } as Record<string, string>
    )[unit] || (/^[\u4e00-\u9fa5]+$/.test(unit) ? unit : '待配置')
  );
}

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
      component: 'ApiSelect',
      fieldName: 'categoryId',
      label: '服务类目',
      componentProps: {
        api: async () => {
          const rows = await loadCategories();
          return rows
            .filter(
              (row) => !rows.some((child) => child.parentId === row.categoryId),
            )
            .map((row) => ({
              label: categoryName(row.categoryId),
              value: row.categoryId,
            }));
        },
        labelField: 'label',
        valueField: 'value',
        placeholder: '选择中文服务类目',
        filterable: true,
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
    {
      field: 'categoryId',
      title: '服务类目',
      minWidth: 240,
      align: 'left',
      formatter: ({ row }) => categoryName(row.categoryId),
    },
    {
      field: 'unit',
      title: '单位',
      width: 70,
      align: 'center',
      formatter: ({ row }) => unitName(row.unit),
    },
    {
      field: 'skuComboList',
      title: 'SKU规格',
      width: 110,
      align: 'center',
      slots: { default: 'skuComboList' },
    },
    {
      field: 'optionValueCount',
      title: '加价选项',
      width: 130,
      align: 'center',
      slots: { default: 'optionValueCount' },
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
        await loadCategories();
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
        <DefaultConfigCopyButton @success="() => gridApi.query()" />
        <ElButton
          v-if="hasAccessByCodes(['merchant:homeItem:edit'])"
          @click="batchDialogRef.open()"
          >批量改价 / 上下架</ElButton
        >
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
      <template #optionValueCount="{ row }">
        <ElTag v-if="row.optionValueCount" type="info" size="small">
          {{ row.optionValueCount }} 个加价选项
        </ElTag>
        <span v-else class="text-xs text-gray-400">{{ row.optionValueCount == null ? '待更新接口' : '暂无加价选项' }}</span>
      </template>

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
    <HomeItemBatchDialog
      ref="batchDialogRef"
      :category-name="categoryName"
      :unit-name="unitName"
      @success="() => gridApi.query()"
    />
  </Page>
</template>
