<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { HomeOrder, HomeOrderQueryParams, HomeOrderStatus } from '#/api/system/housekeeping';

import { h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  acceptHomeOrderApi,
  cancelHomeOrderApi,
  finishHomeOrderApi,
  getHomeOrderListApi,
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

// 状态 Tag 颜色映射
const statusConfig: Record<HomeOrderStatus, { label: string; type: any }> = {
  0: { label: '未支付', type: 'info' },
  1: { label: '待接单', type: 'warning' },
  2: { label: '已接单', type: 'primary' },
  3: { label: '服务中', type: 'primary' },
  4: { label: '已完成', type: 'success' },
  6: { label: '已取消', type: 'info' },
  7: { label: '退款中', type: 'danger' },
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
      fieldName: 'memberName',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () => h('span', { class: 'text-sm text-gray-400 mr-1' }, '客户姓名:'),
      }),
      componentProps: {
        placeholder: '请输入客户姓名',
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'memberPhone',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () => h('span', { class: 'text-sm text-gray-400 mr-1' }, '联系电话:'),
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
        prefix: () => h('span', { class: 'text-sm text-gray-400 mr-1' }, '订单状态:'),
      }),
      componentProps: {
        options: statusOptions,
        placeholder: '请选择状态',
        clearable: true,
      },
    },
  ],
};

// 表格配置
const gridOptions: VxeTableGridOptions<HomeOrder> = {
  keepSource: true,
  height: 'auto',
  id: 'home_order_grid',
  columns: [
    { field: 'homeOrderId', title: '订单ID', width: 90 },
    { field: 'itemName', title: '服务项目', minWidth: 160, align: 'left' },
    { field: 'memberName', title: '客户', width: 120 },
    { field: 'memberPhone', title: '联系电话', width: 130 },
    {
      field: 'payAmount',
      title: '支付金额',
      width: 110,
      slots: { default: 'payAmount' },
    },
    {
      field: 'status',
      title: '状态',
      width: 110,
      slots: { default: 'status' },
    },
    { field: 'appointmentTime', title: '预约时间', width: 170 },
    { field: 'address', title: '服务地址', minWidth: 200, align: 'left' },
    {
      field: 'action',
      title: '操作',
      width: 220,
      fixed: 'right',
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
        return await getHomeOrderListApi(params);
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
  await ElMessageBox.confirm('确认已完成服务并结算吗？完成结算后款项将划入账户。', '提示', { type: 'warning' });
  await finishHomeOrderApi(row.homeOrderId);
  ElMessage.success('订单已完成结算');
  gridApi.query();
}

async function handleCancel(row: HomeOrder) {
  await ElMessageBox.confirm('确认取消该订单吗？已支付订单将发起退款。', '警告', { type: 'warning' });
  await cancelHomeOrderApi(row.homeOrderId);
  ElMessage.success('订单已取消');
  gridApi.query();
}

async function handleRefund(row: HomeOrder) {
  await ElMessageBox.confirm('确认同意并退款给用户吗？退款将直接返还至会员钱包。', '退款确认', { type: 'warning' });
  await refundHomeOrderApi(row.homeOrderId);
  ElMessage.success('退款成功');
  gridApi.query();
}
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <!-- 支付金额自定义渲染 -->
      <template #payAmount="{ row }">
        <span class="text-red-500 font-bold">￥{{ row.payAmount ?? 0 }}</span>
      </template>

      <!-- 状态 Tag 渲染 -->
      <template #status="{ row }">
        <el-tag :type="statusConfig[row.status]?.type" size="small">
          {{ statusConfig[row.status]?.label ?? '未知' }}
        </el-tag>
      </template>

      <!-- 操作按钮（统一样式） -->
      <template #action="{ row }">
        <div class="action-buttons">
          <!-- 待接单：状态 1 -->
          <el-button
            v-if="row.status === 1"
            size="small"
            type="primary"
            @click="handleAccept(row)"
          >
            接单
          </el-button>

          <!-- 已接单：状态 2 -->
          <el-button
            v-if="row.status === 2"
            size="small"
            type="primary"
            @click="handleStart(row)"
          >
            开始服务
          </el-button>

          <!-- 服务中：状态 3 -->
          <el-button
            v-if="row.status === 3"
            size="small"
            type="success"
            @click="handleFinish(row)"
          >
            完成结算
          </el-button>

          <!-- 退款中：状态 7 -->
          <el-button
            v-if="row.status === 7"
            size="small"
            type="danger"
            @click="handleRefund(row)"
          >
            退款
          </el-button>

          <!-- 待接单/处理中允许取消：状态 1, 2, 3 -->
          <el-button
            v-if="[1, 2, 3].includes(row.status)"
            size="small"
            type="warning"
            @click="handleCancel(row)"
          >
            取消
          </el-button>
        </div>
      </template>
    </Grid>
  </Page>
</template>
