<script lang="ts" setup>
import type { HomeOrder } from '#/api/system/housekeeping';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import {
  ElAlert,
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElImage,
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
  getHomeOrderDetailApi,
  getHomeOrderPageApi,
  refundHomeOrderApi,
  rescheduleHomeOrderApi,
  startHomeOrderApi,
} from '#/api/system/housekeeping';
import HomeOrderWorkDialog from './HomeOrderWorkDialog.vue';
import HomeRepairQuoteDialog from './HomeRepairQuoteDialog.vue';
import { statusStyle } from '../statusColors';

/** 退款作为服务订单筛选项，详情中处理；平台监管只读，不渲染履约操作。 */
const props = withDefaults(
  defineProps<{ platform?: boolean }>(),
  { platform: false },
);
const route = useRoute();
const router = useRouter();
const refundOnly = computed(() => !props.platform && route.query.refundOnly === '1');
async function selectOrderScope(onlyRefund: boolean) {
  if (busy.value || refundOnly.value === onlyRefund) return;
  await router.replace({ query: { ...route.query, refundOnly: onlyRefund ? '1' : undefined } });
}
function refundStatusText(status?: string) {
  const labels: Record<string, string> = {
    '0': '未提交', '1': '处理中', '2': '退款成功', '3': '退款失败',
    PROCESSING: '处理中', SUCCESS: '退款成功', CLOSED: '退款关闭', ABNORMAL: '退款异常',
  };
  return status ? labels[status] || status : '未提交';
}
/** 历史无标记不能推断已结清；商户账本入账也不等于微信收款。 */
function settlementStatusText(status?: number | null) {
  return status === 0 ? '未入账' : status === 1 ? '已入账' : '入账情况待核对';
}
/** 只展示原订单支付记录，不从履约状态推断收款，也不将报价应补金额算作实收。 */
function paymentRecordText(order: HomeOrder) {
  if (order.paidTime?.trim() && order.wxTransactionId?.trim()) return '有支付记录';
  if (order.paidTime?.trim() || order.wxTransactionId?.trim()) return '支付记录待核实';
  return '无支付记录';
}
/** 后续加价是报价差额而非实收；保留确认状态，避免将客户拒绝的报价算入应收。 */
function repairAmountText(order: HomeOrder) {
  if (order.repairSupplementAmount == null) return '待更新接口';
  const suffix: Record<number, string> = { 0: '待确认', 1: '已确认，非收款记录', 2: '报价已拒绝', 3: '报价已失效' };
  const label = order.repairQuoteStatus == null ? '' : suffix[order.repairQuoteStatus];
  return `${order.repairSupplementAmount}${label ? `（${label}）` : ''}`;
}
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
// 状态筛选交给分页接口处理，不能只过滤当前页；空值表示全部状态。
const selectedStatus = ref<HomeOrder['status']>();
function selectStatus(status?: number) {
  if (busy.value || selectedStatus.value === status) return;
  if (status !== undefined && (!Number.isInteger(status) || status < 0 || status >= states.length)) return;
  selectedStatus.value = status as HomeOrder['status'] | undefined;
}
const visible = ref(false);
const workDialog = ref<InstanceType<typeof HomeOrderWorkDialog>>();
const repairDialog = ref<InstanceType<typeof HomeRepairQuoteDialog>>();
const detail = ref<Awaited<ReturnType<typeof getHomeOrderDetailApi>>>();
/** 使用下单快照展示附加项，不用当前目录价格改写历史费用。旧单无快照时明确提示。 */
const orderExtras = computed(() => {
  try {
    const snapshot = JSON.parse(detail.value?.order.itemSnapshotJson || '{}');
    if (!Array.isArray(snapshot.options)) return [];
    return snapshot.options.filter((item: unknown): item is { optionName: string; valueName: string; priceDelta: number | string } =>
      !!item && typeof item === 'object' &&
      'optionName' in item && typeof item.optionName === 'string' &&
      'valueName' in item && typeof item.valueName === 'string' &&
      'priceDelta' in item && (typeof item.priceDelta === 'number' || typeof item.priceDelta === 'string'),
    );
  } catch {
    return [];
  }
});
const rescheduleVisible = ref(false);
const rescheduleOrder = ref<HomeOrder>();
const nextAppointTime = ref('');
const rescheduleReason = ref('');

/** 打开时重新读取订单，提交旧时间和旧状态，失败后保留用户输入。 */
async function showReschedule(row: HomeOrder) {
  if (busy.value) return;
  busy.value = true;
  try {
    const result = await getHomeOrderDetailApi(row.homeOrderId);
    if (![0, 1, 2].includes(result.order.status)) {
      ElMessage.warning('订单状态已变化，当前不能改约');
      await gridApi.query();
      return;
    }
    rescheduleOrder.value = result.order;
    nextAppointTime.value = result.order.appointTime || '';
    rescheduleReason.value = '';
    rescheduleVisible.value = true;
  } catch {
    /* 不使用过期列表数据打开弹窗，接口错误由统一拦截器提示。 */
  } finally {
    busy.value = false;
  }
}

async function saveReschedule() {
  if (busy.value || !rescheduleOrder.value) return;
  if (!nextAppointTime.value || !rescheduleReason.value.trim()) {
    ElMessage.warning('请填写新预约时间和改约原因');
    return;
  }
  busy.value = true;
  try {
    await rescheduleHomeOrderApi({
      homeOrderId: rescheduleOrder.value.homeOrderId,
      expectedStatus: rescheduleOrder.value.status,
      expectedAppointTime: rescheduleOrder.value.appointTime || null,
      appointTime: nextAppointTime.value,
      reason: rescheduleReason.value.trim(),
    });
    rescheduleVisible.value = false;
    ElMessage.success('预约时间已修改');
    await gridApi.query();
  } catch {
    /* 冲突或校验失败时保留输入，具体原因由统一拦截器提示。 */
  } finally {
    busy.value = false;
  }
}
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
    ],
  },
  gridOptions: {
    height: 'auto',
    stripe: true,
    border: 'inner',
    rowConfig: { isHover: true },
    pagerConfig: { enabled: true },
    columns: [
      { field: 'orderNo', title: '订单编号', minWidth: 225, fixed: 'left', slots: { default: 'orderIdentity' } },
      {
        field: 'itemSnapshotJson',
        title: '服务项目',
        minWidth: 160,
        slots: { default: 'serviceIdentity' },
      },
      { field: 'contactName', title: '联系人', width: 110 },
      { field: 'contactPhone', title: '联系电话', width: 140 },
      { field: 'payAmount', title: '订单金额（元）', width: 140 },
      { field: 'repairSupplementAmount', title: '后续加价（元）', minWidth: 210, showOverflow: false, formatter: ({ row }) => repairAmountText(row) },
      { field: 'paidTime', title: '支付记录', width: 150, slots: { default: 'paymentRecord' } },
      { field: 'settlementStatus', title: '商户余额入账', width: 150, slots: { default: 'settlement' } },
      {
        field: 'status',
        title: '状态',
        width: 100,
        slots: { default: 'status' },
      },
      { field: 'refundStatus', title: '退款状态', width: 140,
        slots: { default: 'refundStatus' } },
      { field: 'appointTime', title: '预约时间', width: 170 },
      { field: 'assignedUserName', title: '服务人员', width: 120 },
      { field: 'address', title: '服务地址', minWidth: 200 },
      {
        title: '操作',
        width: props.platform ? 80 : 280,
        fixed: 'right',
        // 操作按钮允许折行，不继承全局单行省略，避免隐藏后续操作。
        showOverflow: false,
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
              status: selectedStatus.value,
              pageNo: page.currentPage,
              pageSize: page.pageSize,
              refundOnly: refundOnly.value,
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
// 切换筛选时回到第一页；退款详情操作不改变当前筛选范围。
watch(refundOnly, () => gridApi.reload());
watch(selectedStatus, () => gridApi.reload());
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
    if (visible.value && detail.value?.order.homeOrderId === row.homeOrderId) {
      detail.value = await getHomeOrderDetailApi(row.homeOrderId, props.platform);
    }
  } catch {
    /* 用户取消不发送请求，失败不伪造成功状态。 */
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <Page auto-content-height class="home-orders-page">
    <section class="order-status-filter" aria-label="订单状态筛选">
      <span class="filter-label">订单状态</span>
      <div class="status-options">
        <button type="button" :class="{ active: selectedStatus === undefined }" :aria-pressed="selectedStatus === undefined" :disabled="busy" @click="selectStatus()">全部状态</button>
        <button v-for="(label, value) in states" :key="value" type="button" :class="{ active: selectedStatus === value }" :aria-pressed="selectedStatus === value" :disabled="busy" @click="selectStatus(value)">{{ label }}</button>
      </div>
    </section>
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
      <template #orderIdentity="{ row }">
        <div class="order-identity">{{ row.orderNo }}</div>
        <div class="order-secondary">下单 {{ row.createdTime || '—' }}</div>
      </template>
      <template #serviceIdentity="{ row }">
        <div class="service-identity">{{ itemName(row) }}</div>
        <div class="order-secondary">{{ row.comboName || '—' }}</div>
      </template>
      <template v-if="!platform" #toolbar-tools>
        <ElButton :type="!refundOnly ? 'primary' : 'default'" :disabled="busy" @click="selectOrderScope(false)">
          全部订单
        </ElButton>
        <ElButton :type="refundOnly ? 'primary' : 'default'" :disabled="busy" @click="selectOrderScope(true)">
          退款订单
        </ElButton>
      </template>
      <template #status="{ row }"
        ><ElTag :style="statusStyle('home', row.status)">{{ row.statusText || states[row.status] || '未知状态' }}</ElTag></template
      >
      <template #paymentRecord="{ row }">
        <ElTag :style="statusStyle('payment', paymentRecordText(row))">{{ paymentRecordText(row) }}</ElTag>
      </template>
      <template #settlement="{ row }">
        <ElTag :style="statusStyle('settlement', row.settlementStatus)" :title="row.settlementStatus == null ? '旧订单缺少入账标记，需要核对商户余额收支明细；不能据此判断已入账或未入账。' : '表示这笔订单收入是否已记入商户余额，不代表用户付款或银行到账。'">{{ settlementStatusText(row.settlementStatus) }}</ElTag>
      </template>
      <template #refundStatus="{ row }">
        <ElTag :style="statusStyle('refund', row.refundStatus)">{{ refundStatusText(row.refundStatus) }}</ElTag>
      </template>
      <template #action="{ row }">
        <div class="order-actions">
        <ElButton v-if="can('view')" link type="primary" :disabled="busy" @click="repairDialog?.open(row.homeOrderId, can('accept'))">维修报价</ElButton>
        <ElButton link type="primary" :disabled="busy" @click="showDetail(row)"
          >详情</ElButton
        >
        <ElButton
          v-if="[0, 1, 2].includes(row.status) && can('accept')"
          link
          type="primary"
          :disabled="busy"
          @click="showReschedule(row)"
          >改约</ElButton
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
          v-if="row.status === 2 && can('accept')"
          link
          type="primary"
          :disabled="busy"
          @click="workDialog?.open(row.homeOrderId, 'assign')"
          >{{ row.assignedUserId ? '改派' : '派工' }}</ElButton
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
          @click="workDialog?.open(row.homeOrderId, 'complete')"
          >记录履约完成</ElButton
        >
        <ElButton
          v-if="[0, 1, 2, 3].includes(row.status) && can('cancel')"
          link
          type="danger"
          :disabled="busy"
          @click="operate(row, 'cancel')"
          >取消</ElButton
        >
        </div>
      </template>
    </Grid>
    <HomeOrderWorkDialog ref="workDialog" @success="gridApi.query()" />
    <HomeRepairQuoteDialog ref="repairDialog" @success="gridApi.query()" />
    <ElDialog
      v-model="rescheduleVisible"
      title="修改预约时间"
      width="540px"
      :close-on-click-modal="false"
      :close-on-press-escape="!busy"
      :show-close="!busy"
    >
      <ElAlert
        title="请先与客户协商确认；本次仅修改预约时间，不调整费用，也不会自动通知客户。"
        type="info"
        :closable="false"
        class="mb-4"
      />
      <ElForm label-width="100px" :disabled="busy">
        <ElFormItem label="原预约时间">{{
          rescheduleOrder?.appointTime || '未填写'
        }}</ElFormItem>
        <ElFormItem label="新预约时间" required>
          <ElDatePicker
            v-model="nextAppointTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择北京时间"
          />
        </ElFormItem>
        <ElFormItem label="改约原因" required>
          <ElInput
            v-model="rescheduleReason"
            type="textarea"
            :maxlength="100"
            show-word-limit
            :rows="3"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton :disabled="busy" @click="rescheduleVisible = false"
          >取消</ElButton
        >
        <ElButton type="primary" :loading="busy" @click="saveReschedule"
          >确认改约</ElButton
        >
      </template>
    </ElDialog>
    <ElDialog v-model="visible" title="家政订单详情" width="850px">
      <template v-if="detail">
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="订单号">{{
            detail.order.orderNo
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="状态">{{
            detail.order.statusText || states[detail.order.status]
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
          <ElDescriptionsItem label="服务人员"
            >{{ detail.order.assignedUserName || '未指派' }}
            <span v-if="detail.order.assignedUserPhone?.trim()"> / {{ detail.order.assignedUserPhone.trim() }}</span></ElDescriptionsItem
          >
          <ElDescriptionsItem label="服务地址">{{
            detail.order.address
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="订单金额（元）">{{ detail.order.payAmount ?? '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="后续加价（元）">{{ repairAmountText(detail.order) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="支付记录">{{ paymentRecordText(detail.order) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="支付时间">{{
            detail.order.paidTime || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="账面抽佣（元）">{{ detail.order.commissionAmount ?? 0 }}</ElDescriptionsItem>
          <ElDescriptionsItem label="金额说明" :span="2">订单金额为下单金额，包含下单时已选加价项目；后续加价为最新有效维修报价扣除下单已付金额后的应补金额，不代表已收款。支付记录不包含后续补款，也不代表退款后净收款或商户余额已入账。</ElDescriptionsItem>
          <ElDescriptionsItem label="履约完成时间">{{ detail.order.serviceCompletedTime || '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="商户余额入账">{{ settlementStatusText(detail.order.settlementStatus) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="入账说明" :span="2">{{ detail.order.settlementStatus == null ? '旧订单缺少入账标记，需要核对商户余额收支明细；不能据此判断已入账或未入账。' : '表示这笔订单收入是否已记入商户余额，不代表用户付款或银行到账。' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="附加费用合计（元）">{{
            detail.order.optionAmount ?? '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="附加费用明细" :span="2">
            <div v-for="(extra, index) in orderExtras" :key="index">
              {{ extra.optionName }}：{{ extra.valueName }}（{{ extra.priceDelta }} 元）
            </div>
            <span v-if="!orderExtras.length">{{
              detail.order.optionAmount ? '历史订单未记录附加项明细' : '无附加项'
            }}</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="退款原因">{{
            detail.order.refundReason || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="退款单号">{{
            detail.order.refundNo || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="微信退款状态">{{
            refundStatusText(detail.order.refundStatus)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="退款成功时间">{{
            detail.order.refundTime || '-'
          }}</ElDescriptionsItem>
        </ElDescriptions>
        <div v-if="detail.order.status === 7 && can('refund')" class="mt-4">
          <ElButton type="warning" :disabled="busy" @click="operate(detail.order, 'refund')">
            {{ detail.order.refundNo ? '重试原退款单' : '执行退款' }}
          </ElButton>
          <span class="ml-3 text-gray-500">提交退款不等于退款成功，请以最终结果为准。</span>
        </div>
        <div v-if="detail.images?.length" class="mt-4 flex flex-wrap gap-3">
          <ElImage
            v-for="(photo, index) in detail.images"
            :key="photo.orderImageId"
            :src="photo.imageUrl"
            :preview-src-list="detail.images.map((item) => item.imageUrl)"
            :initial-index="index"
            preview-teleported
            fit="cover"
            style="width: 100px; height: 100px"
          />
        </div>
        <ElTimeline class="mt-5">
          <ElTimelineItem
            v-for="flow in detail.flows"
            :key="flow.flowId"
            :timestamp="flow.createdTime"
            >{{ flow.operatorName || flow.operatorType }}：{{
              flow.remark
            }}</ElTimelineItem
          >
        </ElTimeline>
      </template>
    </ElDialog>
  </Page>
</template>

<style scoped>
.order-status-filter {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 20px;
  margin-bottom: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  background: var(--el-bg-color);
}
.filter-label { flex-shrink: 0; line-height: 36px; color: var(--el-text-color-secondary); }
.status-options { display: flex; flex-wrap: wrap; gap: 8px; }
.status-options button {
  padding: 7px 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  cursor: pointer;
}
.status-options button:hover, .status-options button.active {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}
.status-options button.active { font-weight: 600; }
.status-options button:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
.status-options button:disabled { cursor: not-allowed; opacity: .6; }
.order-identity { font-weight: 650; color: var(--el-text-color-primary); font-variant-numeric: tabular-nums; }
.service-identity { font-weight: 600; }
.order-secondary { margin-top: 6px; font-size: 12px; color: var(--el-text-color-secondary); }
/* 行分隔覆盖固定列，浅灰交替底色与留白共同区分相邻订单。 */
.home-orders-page :deep(.vxe-body--column) { padding-top: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--el-border-color); }
.home-orders-page :deep(.vxe-body--row.row--stripe .vxe-body--column) { background-color: var(--el-fill-color-lighter); }
@media (max-width: 768px) {
  .order-status-filter { flex-direction: column; gap: 8px; padding: 12px; }
  .status-options button { padding: 7px 12px; }
}
.order-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 12px;
  padding: 4px 0;
}

/* 按钮间距由容器统一控制，换行后不保留相邻按钮的左边距。 */
.order-actions :deep(.el-button) {
  margin-left: 0;
}
</style>
