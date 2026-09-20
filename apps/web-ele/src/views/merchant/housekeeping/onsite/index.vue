<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { OnsiteItem, OnsiteOrder } from '#/api/system/onsiteRecycle';

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import {
  ElAlert,
  ElButton,
  ElCheckbox,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElInputNumber,
  ElInput,
  ElImage,
  ElForm,
  ElFormItem,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTimeline,
  ElTimelineItem,
} from 'element-plus';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  finishOnsite,
  getOnsiteDetail,
  getOnsitePage,
  operateOnsite,
} from '#/api/system/onsiteRecycle';
import UploadImage from '#/components/UploadImage/index.vue';
import OnsiteWorkDialog from './OnsiteWorkDialog.vue';
import { statusStyle } from '../statusColors';

/** 家政菜单下的独立上门回收订单；不展示或操作旧设备表里的历史预约。 */
const { hasAccessByCodes } = useAccess();
const router = useRouter();
const props = withDefaults(defineProps<{ platform?: boolean }>(), {
  platform: false,
});
const can = (action: string) =>
  !props.platform &&
  hasAccessByCodes([`merchant:onsiteRecycleOrder:${action}`]);
const statusLabels = ['预约中', '上门中', '已完成', '已取消'];
const busy = ref(false);
// 展开状态筛选只负责传递后端状态值，不在前端过滤当前页；undefined 表示全部。
const selectedStatus = ref<number>();
function selectStatus(status?: number) {
  if (busy.value || selectedStatus.value === status) return;
  if (status !== undefined && (!Number.isInteger(status) || status < 0 || status >= statusLabels.length)) return;
  selectedStatus.value = status;
  // 重置到第一页，同时保留订单号搜索条件。
  void gridApi.reload();
}
const detailVisible = ref(false);
const detail = ref<OnsiteOrder>();
const finishVisible = ref(false);
const finishItems = ref<OnsiteItem[]>([]);
const offlinePaid = ref(false);
const sceneImages = ref<string[]>([]);
const paymentImages = ref<string[]>([]);
const completionNote = ref('');
const workDialog = ref<InstanceType<typeof OnsiteWorkDialog>>();

const formOptions: VbenFormProps = {
  wrapperClass: 'grid-cols-1 md:grid-cols-3',
  showCollapseButton: false,
  submitOnEnter: true,
  schema: [
    {
      component: 'Input',
      fieldName: 'orderNo',
      label: '订单号',
      componentProps: { clearable: true },
    },
  ],
};
const gridOptions: VxeTableGridOptions<OnsiteOrder> = {
  height: 'auto',
  pagerConfig: { enabled: true },
  columns: [
    { field: 'orderNo', title: '上门订单号', minWidth: 260 },
    { field: 'contactName', title: '联系人', width: 110 },
    { field: 'contactPhone', title: '联系电话', width: 140 },
    { field: 'pickupAddress', title: '上门地址', minWidth: 200 },
    { field: 'reserveTime', title: '预约时间', width: 170 },
    { field: 'assignedUserName', title: '回收人员', width: 120 },
    {
      field: 'orderStatus',
      title: '状态',
      width: 100,
      slots: { default: 'status' },
    },
    { field: 'realAmount', title: '成交金额（元）', width: 140 },
    { title: '操作', width: 280, fixed: 'right', slots: { default: 'action' } },
  ],
  proxyConfig: {
    ajax: {
      query: async ({ page }, values) => {
        const result = await getOnsitePage(
          { ...values, orderStatus: selectedStatus.value, pageNo: page.currentPage, pageSize: page.pageSize },
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
};
const [Grid, gridApi] = useVbenVxeGrid<OnsiteOrder>({
  formOptions,
  gridOptions,
});

/** 请求拦截器统一显示接口错误；弹窗取消不作为异常提示，finally 必须释放提交锁。 */
async function showDetail(row: OnsiteOrder, finishing = false) {
  if (busy.value) return;
  busy.value = true;
  try {
    detail.value = await getOnsiteDetail(row.onsiteOrderId, props.platform);
    if (finishing) {
      if (detail.value.orderStatus !== 1) {
        ElMessage.warning('订单状态已变化，请刷新列表');
        await gridApi.query();
        return;
      }
      finishItems.value = (detail.value.items ?? []).map((item) => ({
        ...item,
        // 只预选原报价单位，成交单价仍由商户现场确认填写，不自动视为已成交。
        pricingType: item.quoteUnit === 'piece' ? 2 : 1,
      }));
      offlinePaid.value = false;
      sceneImages.value = [];
      paymentImages.value = [];
      completionNote.value = '';
      finishVisible.value = true;
    } else {
      detailVisible.value = true;
    }
  } catch {
    /* 接口失败保留列表，用户可以重新查看。 */
  } finally {
    busy.value = false;
  }
}

async function operate(
  row: OnsiteOrder,
  action: 'cancel' | 'reject' | 'start',
) {
  if (busy.value) return;
  busy.value = true;
  try {
    let reason: string | undefined;
    if (action === 'start') {
      await ElMessageBox.confirm(
        '确认开始上门？开始后会员不能自行取消。',
        '开始上门',
      );
    } else {
      const result = await ElMessageBox.prompt(
        action === 'reject'
          ? '拒单后转派给其他可承接商户；无人可接时自动取消。'
          : '请填写取消原因。',
        action === 'reject' ? '拒单转派' : '取消预约',
        {
          inputValidator: (value) =>
            (!!value?.trim() && value.length <= 255) || '请填写1至255字原因',
        },
      );
      reason = result.value.trim();
    }
    await operateOnsite(action, row.onsiteOrderId, reason);
    ElMessage.success('操作成功');
    await gridApi.query();
  } catch {
    /* 用户取消不提交，接口错误由统一拦截器展示。 */
  } finally {
    busy.value = false;
  }
}

async function submitFinish() {
  if (busy.value || !detail.value) return;
  if (
    !sceneImages.value.length ||
    !paymentImages.value.length ||
    !completionNote.value.trim()
  ) {
    ElMessage.warning('请上传现场照片、线下付款凭证并填写成交说明');
    return;
  }
  if (
    !offlinePaid.value ||
    finishItems.value.length === 0 ||
    finishItems.value.some(
      (item) =>
        !(Number(item.unitPrice) > 0) ||
        !(item.pricingType === 1
          ? Number(item.realWeight) > 0
          : Number(item.quantity) > 0),
    )
  ) {
    ElMessage.warning('请完整填写每项成交信息，并确认已经线下付款');
    return;
  }
  busy.value = true;
  try {
    await ElMessageBox.confirm(
      '确认逐项成交信息及线下付款？完成后不可修改成交金额。',
      '确认成交',
      { type: 'warning' },
    );
    await finishOnsite(
      detail.value.onsiteOrderId,
      finishItems.value,
      offlinePaid.value,
      {
        sceneImageUrls: sceneImages.value,
        paymentImageUrls: paymentImages.value,
        completionNote: completionNote.value.trim(),
      },
    );
    finishVisible.value = false;
    ElMessage.success('上门回收已完成');
    await gridApi.query();
  } catch {
    /* 失败保留表单，可使用相同内容安全重试。 */
  } finally {
    busy.value = false;
  }
}

function showScope() {
  router.push('/housekeeping/onsite-scope');
}
</script>

<template>
  <Page auto-content-height>
    <section class="order-status-filter" aria-label="上门回收订单状态筛选">
      <span class="filter-label">订单状态</span>
      <div class="status-options">
        <button type="button" :class="{ active: selectedStatus === undefined }" :aria-pressed="selectedStatus === undefined" :disabled="busy" @click="selectStatus()">全部状态</button>
        <button v-for="(label, value) in statusLabels" :key="value" type="button" :class="{ active: selectedStatus === value }" :aria-pressed="selectedStatus === value" :disabled="busy" @click="selectStatus(value)">{{ label }}</button>
      </div>
    </section>
    <ElAlert
      title="此页面仅管理独立上门回收新单；历史预约暂保留原入口，不包含回收箱订单。"
      type="info"
      :closable="false"
      class="mb-3"
    />
    <Grid>
      <template #toolbar-actions>
        <ElButton v-if="can('scope')" :disabled="busy" @click="showScope"
          >配置可收类目</ElButton
        >
      </template>
      <template #status="{ row }"
        ><ElTag :style="statusStyle('onsite', row.orderStatus)">{{
          statusLabels[row.orderStatus] ?? '未知状态'
        }}</ElTag></template
      >
      <template #action="{ row }">
        <ElButton link type="primary" :disabled="busy" @click="showDetail(row)"
          >详情</ElButton
        >
        <ElButton
          v-if="row.orderStatus === 0 && can('start')"
          link
          type="primary"
          :disabled="busy"
          @click="workDialog?.open(row.onsiteOrderId, 'reschedule')"
          >改约</ElButton
        >
        <ElButton
          v-if="row.orderStatus === 0 && can('start')"
          link
          type="primary"
          :disabled="busy"
          @click="workDialog?.open(row.onsiteOrderId, 'assign')"
          >{{ row.assignedUserId ? '改派' : '派工' }}</ElButton
        >
        <ElButton
          v-if="row.orderStatus === 0 && can('start')"
          link
          type="primary"
          :disabled="busy"
          @click="operate(row, 'start')"
          >开始上门</ElButton
        >
        <ElButton
          v-if="row.orderStatus === 0 && can('reject')"
          link
          type="warning"
          :disabled="busy"
          @click="operate(row, 'reject')"
          >拒单</ElButton
        >
        <ElButton
          v-if="row.orderStatus === 1 && can('finish')"
          link
          type="success"
          :disabled="busy"
          @click="showDetail(row, true)"
          >确认成交</ElButton
        >
        <ElButton
          v-if="[0, 1].includes(row.orderStatus) && can('cancel')"
          link
          type="danger"
          :disabled="busy"
          @click="operate(row, 'cancel')"
          >取消</ElButton
        >
      </template>
    </Grid>
    <OnsiteWorkDialog ref="workDialog" @success="gridApi.query()" />

    <ElDialog v-model="detailVisible" title="上门回收详情" width="850px">
      <template v-if="detail">
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="订单号">{{
            detail.orderNo
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="状态">{{
            statusLabels[detail.orderStatus]
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="联系人"
            >{{ detail.contactName }} /
            {{ detail.contactPhone }}</ElDescriptionsItem
          >
          <ElDescriptionsItem label="预约时间">{{
            detail.reserveTime
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="地址">{{
            detail.pickupAddress
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="回收人员"
            >{{ detail.assignedUserName || '未指派' }}
            <span v-if="detail.assignedUserPhone?.trim()"> / {{ detail.assignedUserPhone.trim() }}</span></ElDescriptionsItem
          >
          <ElDescriptionsItem label="成交说明">{{
            detail.completionNote || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="备注">{{
            detail.remark || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="成交总额"
            >{{ detail.realAmount }} 元</ElDescriptionsItem
          >
          <ElDescriptionsItem label="取消原因">{{
            detail.closeReason || '-'
          }}</ElDescriptionsItem>
        </ElDescriptions>
        <ElTable :data="detail.items" class="my-4">
          <ElTableColumn prop="itemName" label="回收类目" />
          <ElTableColumn label="下单参考价"
            ><template #default="{ row }">{{
              row.quotePrice == null
                ? '历史订单未记录'
                : row.quotePrice +
                  (row.quoteUnit === 'kg' ? ' 元/公斤' : ' 元/件')
            }}</template></ElTableColumn
          >
          <ElTableColumn prop="quoteMerchantId" label="原报价商户ID" />
          <ElTableColumn prop="realWeight" label="实际重量（公斤）" />
          <ElTableColumn prop="quantity" label="实际件数" />
          <ElTableColumn prop="unitPrice" label="单价（元/公斤或件）" />
          <ElTableColumn prop="realAmount" label="成交金额（元）" />
        </ElTable>
        <div
          v-for="group in [
            { title: '现场照片', urls: detail.sceneImageUrls },
            { title: '线下付款凭证', urls: detail.paymentImageUrls },
          ]"
          :key="group.title"
          class="mb-4"
        >
          <template v-if="group.urls?.length">
            <p class="mb-2">{{ group.title }}</p>
            <ElImage
              v-for="(url, index) in group.urls"
              :key="url"
              :src="url"
              :preview-src-list="group.urls"
              :initial-index="index"
              preview-teleported
              fit="cover"
              class="mr-3"
              style="width: 100px; height: 100px"
            />
          </template>
        </div>
        <ElTimeline>
          <ElTimelineItem
            v-for="(flow, index) in detail.flows"
            :key="index"
            :timestamp="flow.createdTime"
          >
            {{ flow.operatorRole }}：{{ flow.description }}
          </ElTimelineItem>
        </ElTimeline>
      </template>
    </ElDialog>

    <ElDialog
      v-model="finishVisible"
      title="逐项确认成交"
      width="900px"
      :close-on-click-modal="false"
      :show-close="!busy"
      :close-on-press-escape="!busy"
    >
      <ElAlert
        title="金额按实际重量或件数 × 单价计算；每项截取至分后汇总。此操作不发起在线付款。"
        type="warning"
        :closable="false"
      />
      <ElTable :data="finishItems">
        <ElTableColumn prop="itemName" label="回收类目" />
        <ElTableColumn label="计价" width="130">
          <template #default="{ row }"
            ><ElSelect v-model="row.pricingType" :disabled="busy"
              ><ElOption :value="1" label="按重量" /><ElOption
                :value="2"
                label="按件" /></ElSelect
          ></template>
        </ElTableColumn>
        <ElTableColumn label="重量（公斤）/件数" width="200">
          <template #default="{ row }">
            <ElInputNumber
              v-if="row.pricingType === 1"
              v-model="row.realWeight"
              :min="0.001"
              :max="100000"
              :precision="3"
              :disabled="busy"
            />
            <ElInputNumber
              v-else
              v-model="row.quantity"
              :min="1"
              :max="100000"
              :precision="0"
              :disabled="busy"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="单价（元/公斤或件）" width="200">
          <template #default="{ row }"
            ><ElInputNumber
              v-model="row.unitPrice"
              :min="0.01"
              :max="999999.99"
              :precision="2"
              :disabled="busy"
          /></template>
        </ElTableColumn>
      </ElTable>
      <ElForm label-width="110px" :disabled="busy" class="mt-4">
        <ElFormItem label="现场照片" required
          ><div :style="busy ? { pointerEvents: 'none' } : undefined">
            <UploadImage v-model="sceneImages" :limit="9" /></div
        ></ElFormItem>
        <ElFormItem label="付款凭证" required
          ><div :style="busy ? { pointerEvents: 'none' } : undefined">
            <UploadImage v-model="paymentImages" :limit="9" /></div
        ></ElFormItem>
        <ElFormItem label="成交说明" required
          ><ElInput
            v-model="completionNote"
            type="textarea"
            :maxlength="100"
            show-word-limit
            :rows="3"
        /></ElFormItem>
      </ElForm>
      <ElAlert
        title="请上传实际现场及付款凭证，并遮挡与本订单无关的信息。现金支付可上传客户确认的收款凭据；上传凭证不会发起转账。"
        type="info"
        :closable="false"
      />
      <ElCheckbox v-model="offlinePaid" :disabled="busy" class="mt-4"
        >我已向会员线下付清全部回收款</ElCheckbox
      >
      <template #footer
        ><ElButton :disabled="busy" @click="finishVisible = false"
          >取消</ElButton
        ><ElButton type="primary" :loading="busy" @click="submitFinish"
          >确认成交</ElButton
        ></template
      >
    </ElDialog>
  </Page>
</template>

<style scoped>
/* 与家政订单展开筛选保持一致，仅作用于上门回收列表，不改变业务状态或操作权限。 */
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
@media (max-width: 768px) {
  .order-status-filter { flex-direction: column; gap: 8px; padding: 12px; }
  .status-options button { padding: 7px 12px; }
}
</style>
