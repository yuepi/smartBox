<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { HomeItem, HomeItemQueryParams } from '#/api/system/housekeeping';

import { h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteHomeItemApi, getHomeItemPageApi } from '#/api/system/housekeeping';

import HomeItemEditDialog from './HomeItemEditDialog.vue';

const editDialogRef = ref();
const queryParams = ref<HomeItemQueryParams>({});

// 简单的搜索表单项
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
        prefix: () => h('span', { class: 'text-sm text-gray-400 mr-1' }, '服务名称:'),
      }),
      componentProps: {
        placeholder: '请输入服务名称',
        clearable: true,
      },
    },
  ],
};

// 表格配置
const gridOptions: VxeTableGridOptions<HomeItem> = {
  keepSource: true,
  height: 'auto',
  id: 'home_item_grid',
  columns: [
    { field: 'homeItemId', title: '服务ID', width: 90 },
    { field: 'itemName', title: '服务名称', minWidth: 160, align: 'left' },
    { field: 'unit', title: '单位', width: 80 },
    { field: 'description', title: '服务描述', minWidth: 200, align: 'left' },
    { field: 'sort', title: '排序', width: 80 },
    {
      field: 'status',
      title: '状态',
      width: 90,
      slots: { default: 'status' },
    },
    {
      field: 'action',
      title: '操作',
      width: 160,
      fixed: 'right',
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

// 新增 / 编辑 / 删除
function handleAdd() {
  editDialogRef.value?.open();
}

function handleEdit(row: HomeItem) {
  editDialogRef.value?.open(row);
}

async function handleDelete(row: HomeItem) {
  try {
    await ElMessageBox.confirm(`确认删除服务项「${row.itemName}」吗？`, '提示', {
      type: 'warning',
    });
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
      <!-- 顶部操作区（放置新增按钮） -->
      <template #toolbar-actions>
        <el-button type="primary" icon="Plus" @click="handleAdd">
          新增服务项
        </el-button>
      </template>

      <!-- 状态 Tag 渲染 -->
      <template #status="{ row }">
        <el-tag :type="row.status === 0 ? 'success' : 'danger'" size="small">
          {{ row.status === 0 ? '启用' : '禁用' }}
        </el-tag>
      </template>

      <!-- 操作按钮 -->
      <template #action="{ row }">
        <div class="action-buttons">
          <el-button size="small" type="primary" @click="handleEdit(row)">
            编辑
          </el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">
            删除
          </el-button>
        </div>
      </template>
    </Grid>

    <!-- 新增 / 编辑弹窗 -->
    <HomeItemEditDialog ref="editDialogRef" @success="() => gridApi.query()" />
  </Page>
</template>
