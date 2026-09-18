<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type {
  HomeOrder,
  HomeOrderQueryParams,
  HomeOrderStatus,
} from '#/api/system/housekeeping';

import { h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElButton, ElMessage, ElMessageBox, ElTag } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  acceptHomeOrderApi,
  cancelHomeOrderApi,
  finishHomeOrderApi,
  getHomeOrderPageApi,
  refundHomeOrderApi,
  startHomeOrderApi,
} from '#/api/system/housekeeping';

const queryParams = ref<HomeOrderQueryParams>({});

// 订单状态选项
const statusOptions = [
  { label: '未支付', value: 0 },
  { label: '待接单', value: 1 },
  { label: '已接单', value: 2 },
  { label: '服务中', value: 3 },
  { label: '已完成', value: 4 },
  { label: '已取消', value: 6 },
  { label: '退款中', value: 7 },
];

// 状态 Tag 配置
const statusConfig: Record<HomeOrderStatus, { label: string; type: any }> = {
  0: { label: '未支付', type: 'info' },
  1: { label: '待接单', type: 'warning' },
  2: { label: '已接单', type: 'primary' },
  3: { label: '服务中', type: 'primary' },
  4: { label: '已完成', type: 'success' },
  5: { label: '已评价', type: 'success' },
  6: { label: '已取消', type: 'info' },
  7: { label: '退款中', type: 'danger' },
  8: { label: '异常', type: 'danger' },
};

// 筛选表单配置
const formOptions: VbenFormProps = {
  wrapperClass: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
  collapsed: false,
  showCollapseButton: true,
  submitOnEnter: true,
  schema: [
    {
      component: 'Input',
      fieldName: 'contactName',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '客户姓名:'),
      }),
      componentProps: {
        placeholder: '请输入客户姓名',
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'contactPhone',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '联系电话:'),
      }),
      componentProps: {
        placeholder: '请输入联系电话',
        clearable: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'status',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '订单状态:'),
      }),
      componentProps: {
        options: statusOptions,
        placeholder: '请选择状态',
        clearable: true,
      },
    },
  ],
};

// 解析快照中的服务名称
function getItemNameFromSnapshot(row: HomeOrder): string {
  if (row.itemSnapshotJson) {
    try {
      const snap =
        typeof row.itemSnapshotJson === 'string'
          ? JSON.parse(row.itemSnapshotJson)
          : row.itemSnapshotJson;
      return snap.itemName || '-';
    } catch {
      // 解析失败降级处理
    }
  }
  return (row as any).itemName || '-';
}

// 表格列列名重新对齐打印出的 JSON 字段
const gridOptions: VxeTableGridOptions<HomeOrder> = {
  id: 'home_order_grid',
  keepSource: true,
  height: 'auto',
  columns: [
    { field: 'homeOrderId', title: '订单ID', width: 80, align: 'center' },
    { field: 'orderNo', title: '订单编号', width: 180, align: 'center' },
    {
      field: 'itemName',
      title: '服务项目',
      minWidth: 150,
      align: 'left',
      formatter: ({ row }) => getItemNameFromSnapshot(row),
    },
    {
      field: 'comboName',
      title: '服务规格/组合',
      minWidth: 180,
      align: 'left',
    },
    { field: 'contactName', title: '客户姓名', width: 110, align: 'center' },
    { field: 'contactPhone', title: '联系电话', width: 130, align: 'center' },
    {
      field: 'payAmount',
      title: '订单金额（元）',
      width: 150,
      align: 'center',
      slots: { default: 'payAmount' },
    },
    {
      field: 'status',
      title: '订单状态',
      width: 100,
      align: 'center',
      slots: { default: 'status' },
    },
    {
      field: 'appointTime',
      title: '预约上门时间',
      width: 160,
      align: 'center',
    },
    { field: 'address', title: '服务地址', minWidth: 220, align: 'left' },
    { field: 'createdTime', title: '下单时间', width: 160, align: 'center' },
    {
      field: 'action',
      title: '操作',
      width: 200,
      fixed: 'right',
      align: 'center',
      slots: { default: 'action' },
    },
  ],
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        const params: HomeOrderQueryParams = {
          pageNo: page.currentPage,
          pageSize: page.pageSize,
          ...formValues,
        };
        queryParams.value = params;
        const res = await getHomeOrderPageApi(params);

        // 兼容后端直接返回数组，以及带 records/data/total 的对象格式
        const list = Array.isArray(res) ? res : res?.records || [];
        const total = Array.isArray(res)
          ? res.length
          : (res?.total ?? list.length);

        return {
          records: list,
          items: list,
          total,
        };
      },
    },
  },
};

const [Grid, gridApi] = useVbenVxeGrid<HomeOrder>({
  formOptions,
  gridOptions,
});

// 操作逻辑
async function handleAccept(row: HomeOrder) {
  await ElMessageBox.confirm('确认接单吗？', '提示', { type: 'info' });
  await acceptHomeOrderApi(row.homeOrderId);
  ElMessage.success('接单成功');
  gridApi.query();
}

async function handleStart(row: HomeOrder) {
  await ElMessageBox.confirm('确认开始服务吗？', '提示', { type: 'info' });
  await startHomeOrderApi(row.homeOrderId);
  ElMessage.success('服务已开始');
  gridApi.query();
}

async function handleFinish(row: HomeOrder) {
  await ElMessageBox.confirm(
    '确认已完成服务并结算吗？完成结算后款项将划入账户。',
    '提示',
    { type: 'warning' },
  );
  await finishHomeOrderApi(row.homeOrderId);
  ElMessage.success('订单已完成结算');
  gridApi.query();
}

async function handleCancel(row: HomeOrder) {
  await ElMessageBox.confirm(
    '确认取消该订单吗？已支付订单将发起退款。',
    '警告',
    { type: 'warning' },
  );
  await cancelHomeOrderApi(row.homeOrderId);
  ElMessage.success('订单已取消');
  gridApi.query();
}

async function handleRefund(row: HomeOrder) {
  await ElMessageBox.confirm(
    '确认同意并退款给用户吗？退款将直接返还至会员钱包。',
    '退款确认',
    { type: 'warning' },
  );
  await refundHomeOrderApi(row.homeOrderId);
  ElMessage.success('退款成功');
  gridApi.query();
}
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions> </template>

      <!-- 支付金额自定义渲染 -->
      <template #payAmount="{ row }">
        <span class="font-bold text-red-500">￥{{ row.payAmount ?? 0 }}</span>
      </template>

      <!-- 状态 Tag 渲染 -->
      <template #status="{ row }">
        <ElTag :type="statusConfig[row.status]?.type" size="small">
          {{ statusConfig[row.status]?.label ?? '未知' }}
        </ElTag>
      </template>

      <!-- 操作按钮 -->
      <template #action="{ row }">
        <div class="action-buttons flex items-center justify-center gap-1">
          <!-- 待接单：状态 1 -->
          <ElButton
            v-if="row.status === 1"
            size="small"
            type="primary"
            @click="handleAccept(row)"
          >
            接单
          </ElButton>

          <!-- 已接单：状态 2 -->
          <ElButton
            v-if="row.status === 2"
            size="small"
            type="primary"
            @click="handleStart(row)"
          >
            开始服务
          </ElButton>

          <!-- 服务中：状态 3 -->
          <ElButton
            v-if="row.status === 3"
            size="small"
            type="success"
            @click="handleFinish(row)"
          >
            完成结算
          </ElButton>

          <!-- 退款中：状态 7 -->
          <ElButton
            v-if="row.status === 7"
            size="small"
            type="danger"
            @click="handleRefund(row)"
          >
            退款
          </ElButton>

          <!-- 待接单/处理中允许取消：状态 1, 2, 3 -->
          <ElButton
            v-if="[1, 2, 3].includes(row.status)"
            size="small"
            type="warning"
            @click="handleCancel(row)"
          >
            取消
          </ElButton>
        </div>
      </template>
    </Grid>
  </Page>
</template>
