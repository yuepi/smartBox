<script lang="ts" setup>
import type { HomeOrder } from '#/api/system/housekeeping';
import { ref } from 'vue';
import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import {
  ElAlert,
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElMessage,
  ElMessageBox,
  ElTag,
  ElTimeline,
  ElTimelineItem,
} from 'element-plus';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  acceptHomeOrderApi,
  cancelHomeOrderApi,
  finishHomeOrderApi,
  getHomeOrderDetailApi,
  getHomeOrderPageApi,
  refundHomeOrderApi,
  startHomeOrderApi,
} from '#/api/system/housekeeping';

/** 服务订单、退款处理、平台监管复用同一查询组件；监管页只读，不渲染履约操作。 */
const props = withDefaults(
  defineProps<{ platform?: boolean; refundOnly?: boolean }>(),
  { platform: false, refundOnly: false },
);
const { hasAccessByCodes } = useAccess();
const can = (action: string) =>
  !props.platform && hasAccessByCodes([`merchant:homeOrder:${action}`]);
const states = [
  '待支付',
  '待接单',
  '已接单',
  '服务中',
  '已完成',
  '已评价',
  '已取消',
  '退款中',
  '异常',
];
const busy = ref(false);
const visible = ref(false);
const detail = ref<Awaited<ReturnType<typeof getHomeOrderDetailApi>>>();
function itemName(row: HomeOrder) {
  try {
    return (
      JSON.parse(row.itemSnapshotJson || '{}').itemName || row.itemName || '-'
    );
  } catch {
    return row.itemName || '-';
  }
}
const [Grid, gridApi] = useVbenVxeGrid<HomeOrder>({
  formOptions: {
    showCollapseButton: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-4',
    submitOnEnter: true,
    schema: [
      { component: 'Input', fieldName: 'orderNo', label: '订单号' },
      { component: 'Input', fieldName: 'contactName', label: '联系人' },
      { component: 'Input', fieldName: 'contactPhone', label: '联系电话' },
      {
        component: 'Select',
        fieldName: 'status',
        label: '状态',
        componentProps: {
          clearable: true,
          options: states.map((label, value) => ({ label, value })),
        },
      },
    ],
  },
  gridOptions: {
    height: 'auto',
    pagerConfig: { enabled: true },
    columns: [
      { field: 'orderNo', title: '订单编号', minWidth: 220 },
      {
        field: 'itemSnapshotJson',
        title: '服务项目',
        minWidth: 160,
        formatter: ({ row }: { row: HomeOrder }) => itemName(row),
      },
      { field: 'comboName', title: '服务规格', minWidth: 150 },
      { field: 'contactName', title: '联系人', width: 110 },
      { field: 'contactPhone', title: '联系电话', width: 140 },
      { field: 'payAmount', title: '实付（元）', width: 110 },
      {
        field: 'status',
        title: '状态',
        width: 100,
        slots: { default: 'status' },
      },
      { field: 'refundStatus', title: '微信退款状态', width: 140 },
      { field: 'appointTime', title: '预约时间', width: 170 },
      { field: 'address', title: '服务地址', minWidth: 200 },
      { field: 'createdTime', title: '下单时间', width: 170 },
      {
        title: '操作',
        width: props.platform ? 80 : 280,
        fixed: 'right',
        slots: { default: 'action' },
      },
    ],
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          filters: Record<string, unknown>,
        ) => {
          const result = await getHomeOrderPageApi(
            {
              ...filters,
              pageNo: page.currentPage,
              pageSize: page.pageSize,
              refundOnly: props.refundOnly,
            },
            props.platform,
          );
          return {
            items: result.records,
            records: result.records,
            total: result.total,
          };
        },
      },
    },
  },
});
async function showDetail(row: HomeOrder) {
  if (busy.value) return;
  busy.value = true;
  try {
    detail.value = await getHomeOrderDetailApi(row.homeOrderId, props.platform);
    visible.value = true;
  } catch {
    /* 保留列表，接口错误由统一拦截器显示。 */
  } finally {
    busy.value = false;
  }
}
const actions = {
  accept: { api: acceptHomeOrderApi, prompt: '确认接单？', success: '已接单' },
  start: {
    api: startHomeOrderApi,
    prompt: '确认开始服务？',
    success: '已开始服务',
  },
  finish: {
    api: finishHomeOrderApi,
    prompt: '确认服务完成？完成后按订单金额结算，不可直接取消退款。',
    success: '服务已完成',
  },
  cancel: {
    api: cancelHomeOrderApi,
    prompt:
      '确认取消？未支付订单直接取消；已支付订单进入退款申请，不代表退款成功。',
    success: '取消申请已处理，请以最新订单状态为准',
  },
  refund: {
    api: refundHomeOrderApi,
    prompt:
      '确认向微信提交原路退款？资金不会退入会员钱包，最终结果以微信确认为准。',
    success: '退款请求已处理，请查看微信退款状态',
  },
};
async function operate(row: HomeOrder, action: keyof typeof actions) {
  if (busy.value) return;
  busy.value = true;
  try {
    await ElMessageBox.confirm(actions[action].prompt, '操作确认', {
      type: 'warning',
    });
    await actions[action].api(row.homeOrderId);
    ElMessage.success(actions[action].success);
    await gridApi.query();
  } catch {
    /* 用户取消不发送请求，失败不伪造成功状态。 */
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <Page auto-content-height>
    <ElAlert
      v-if="platform || refundOnly"
      :title="
        platform
          ? '平台监管仅提供只读查询，不能代替商户履约、退款或结算。'
          : '退款处理包含申请中和已有退款记录的订单；提交退款不等于退款成功。'
      "
      type="info"
      :closable="false"
      class="mb-3"
    />
    <Grid>
      <template #status="{ row }"
        ><ElTag>{{ states[row.status] ?? '未知状态' }}</ElTag></template
      >
      <template #action="{ row }">
        <ElButton link type="primary" :disabled="busy" @click="showDetail(row)"
          >详情</ElButton
        >
        <ElButton
          v-if="row.status === 1 && can('accept')"
          link
          type="primary"
          :disabled="busy"
          @click="operate(row, 'accept')"
          >接单</ElButton
        >
        <ElButton
          v-if="row.status === 2 && can('start')"
          link
          type="primary"
          :disabled="busy"
          @click="operate(row, 'start')"
          >开始服务</ElButton
        >
        <ElButton
          v-if="row.status === 3 && can('finish')"
          link
          type="success"
          :disabled="busy"
          @click="operate(row, 'finish')"
          >完成结算</ElButton
        >
        <ElButton
          v-if="[0, 1, 2, 3].includes(row.status) && can('cancel')"
          link
          type="danger"
          :disabled="busy"
          @click="operate(row, 'cancel')"
          >取消</ElButton
        >
        <ElButton
          v-if="row.status === 7 && can('refund')"
          link
          type="warning"
          :disabled="busy"
          @click="operate(row, 'refund')"
          >{{ row.refundNo ? '重试原退款单' : '执行退款' }}</ElButton
        >
      </template>
    </Grid>
    <ElDialog v-model="visible" title="家政订单详情" width="850px">
      <template v-if="detail">
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="订单号">{{
            detail.order.orderNo
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="状态">{{
            states[detail.order.status]
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="服务项目">{{
            itemName(detail.order)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="规格快照">{{
            detail.order.comboName || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="联系人"
            >{{ detail.order.contactName }} /
            {{ detail.order.contactPhone }}</ElDescriptionsItem
          >
          <ElDescriptionsItem label="预约时间">{{
            detail.order.appointTime
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="服务地址">{{
            detail.order.address
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="实付/抽佣（元）"
            >{{ detail.order.payAmount }} /
            {{ detail.order.commissionAmount ?? 0 }}</ElDescriptionsItem
          >
          <ElDescriptionsItem label="支付时间">{{
            detail.order.paidTime || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="退款原因">{{
            detail.order.refundReason || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="退款单号">{{
            detail.order.refundNo || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="微信退款状态">{{
            detail.order.refundStatus || '未提交'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="退款成功时间">{{
            detail.order.refundTime || '-'
          }}</ElDescriptionsItem>
        </ElDescriptions>
        <ElTimeline class="mt-5">
          <ElTimelineItem
            v-for="flow in detail.flows"
            :key="flow.flowId"
            :timestamp="flow.createdTime"
            >{{ flow.operatorType }}：{{ flow.remark }}</ElTimelineItem
          >
        </ElTimeline>
      </template>
    </ElDialog>
  </Page>
</template>
