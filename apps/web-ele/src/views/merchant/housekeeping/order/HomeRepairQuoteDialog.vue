<script lang="ts" setup>
import type { HomeOrder, HomeRepairLine, HomeRepairQuote } from '#/api/system/housekeeping';
import { computed, ref } from 'vue';
import { ElAlert, ElButton, ElDialog, ElInput, ElInputNumber, ElMessage, ElOption, ElSelect, ElTable, ElTableColumn } from 'element-plus';
import { getHomeOrderDetailApi, getHomeRepairQuotesApi, saveHomeRepairQuoteApi } from '#/api/system/housekeeping';
import { readOrderExtras } from './orderExtras';

const emit = defineEmits<{ success: [] }>();
const visible = ref(false);
const busy = ref(false);
const order = ref<HomeOrder>();
const history = ref<HomeRepairQuote[]>([]);
const lines = ref<HomeRepairLine[]>([]);
const description = ref('');
const pricingMode = ref<'ADDITIONAL' | 'TOTAL'>('ADDITIONAL');
const mayEdit = ref(false);
const orderExtras = computed(() => readOrderExtras(order.value));
/** 下单应付不等于实付；仅有完整支付标记时展示可抵扣金额，最终仍由后端校验。 */
const paidAmount = computed(() => order.value?.paidTime?.trim() && order.value?.wxTransactionId?.trim()
  ? order.value.payAmount : undefined);
const editable = computed(() => mayEdit.value && order.value?.status === 3 && (!history.value.length || history.value[0]?.status === 0));
const labels = ['待用户确认', '已确认，资金状态另行核实', '用户拒绝维修', '已被新版本替换'];
const types = [ { value: 'DETECTION', label: '检测费' }, { value: 'LABOR', label: '维修人工' }, { value: 'PART', label: '配件费' }, { value: 'EXTRA', label: '附加费' } ];

/** 只回放业务快照，不根据实时目录重算历史报价。异常旧数据不自动回填编辑表单。 */
function snapshot(quote: HomeRepairQuote): HomeRepairLine[] {
  try {
    const data = JSON.parse(quote.linesJson);
    return Array.isArray(data) ? data.filter((row) => row && typeof row === 'object') : [];
  } catch { return []; }
}
async function open(id: number, canEdit: boolean) {
  if (busy.value) return;
  busy.value = true;
  try {
    const [detail, quotes] = await Promise.all([getHomeOrderDetailApi(id), getHomeRepairQuotesApi(id)]);
    order.value = detail.order;
    history.value = quotes;
    mayEdit.value = canEdit;
    description.value = quotes[0]?.description || '';
    lines.value = quotes[0] ? snapshot(quotes[0]) : [];
    pricingMode.value = quotes[0] ? 'TOTAL' : 'ADDITIONAL';
    visible.value = true;
  } finally { busy.value = false; }
}
function addLine() {
  lines.value.push({ type: 'LABOR', name: '', quantity: 1, unit: '次', unitPrice: 0 });
}
async function save() {
  if (busy.value || !editable.value || !order.value) return;
  if (!description.value.trim() || !lines.value.length || lines.value.some((line) => !line.name.trim() || !line.unit.trim())) {
    ElMessage.warning('请填写检测说明及完整费用明细'); return;
  }
  busy.value = true;
  try {
    await saveHomeRepairQuoteApi({ homeOrderId: order.value.homeOrderId, expectedVersion: history.value[0]?.version || 0, description: description.value.trim(), pricingMode: pricingMode.value, lines: lines.value });
    // 保存失败保留输入；成功后读服务端金额，不用前端金额当成已收款。
    history.value = await getHomeRepairQuotesApi(order.value.homeOrderId);
    ElMessage.success('报价已记录，未发起支付或退款');
    emit('success');
  } finally { busy.value = false; }
}
defineExpose({ open });
</script>

<template>
  <ElDialog v-model="visible" title="维修报价与费用记录" width="1000px" :close-on-click-modal="false" :show-close="!busy" :close-on-press-escape="!busy">
    <ElAlert :title="pricingMode === 'ADDITIONAL' ? '只填写本次新增费用，原单已付费用由后端自动计入，请勿重复添加。例如原单89元、新增5元，整单总价94元、用户补款5元。保存后须由用户确认并支付。' : '当前编辑整单费用明细，包含原单已付费用。应补金额由后端按整单总价减去已付金额计算，保存后须由用户确认。'" type="info" :closable="false" class="mb-4" />
    <div class="mb-4">
      <div class="mb-2">下单金额：{{ order?.payAmount ?? '-' }} 元 · 已付金额：{{ paidAmount == null ? '支付记录待核对' : `${paidAmount} 元` }}</div>
      <div class="mb-2">下单时已选加价明细（已包含在下单金额内，请勿重复计费）</div>
      <ElTable v-if="orderExtras.items.length" :data="orderExtras.items">
        <ElTableColumn prop="optionName" label="加价项目" />
        <ElTableColumn prop="valueName" label="已选选项" />
        <ElTableColumn prop="priceDelta" label="金额（元）" />
      </ElTable>
      <div v-if="!orderExtras.complete">历史加价明细缺失或不完整，请核对后报价。</div>
      <div v-else-if="!orderExtras.items.length">下单时未选择加价项目。</div>
      <div class="mt-2">下单加价合计：{{ order?.optionAmount ?? '-' }} 元</div>
    </div>
    <template v-if="editable">
      <div class="mb-2">{{ pricingMode === 'ADDITIONAL' ? '新增费用说明及服务范围' : '检测结果及维修范围' }}</div>
      <ElInput v-model="description" type="textarea" :maxlength="500" :disabled="busy" placeholder="说明检测结果、维修内容和费用范围" />
      <ElTable :data="lines" class="my-3">
        <ElTableColumn label="费用类型" width="145"><template #default="{ row }"><ElSelect v-model="row.type" :disabled="busy"><ElOption v-for="type in types" :key="type.value" :label="type.label" :value="type.value" /></ElSelect></template></ElTableColumn>
        <ElTableColumn label="项目/配件名称"><template #default="{ row }"><ElInput v-model="row.name" :maxlength="100" :disabled="busy" /></template></ElTableColumn>
        <ElTableColumn label="数量" width="155"><template #default="{ row }"><ElInputNumber v-model="row.quantity" :min="0.001" :precision="3" :disabled="busy" controls-position="right" style="width: 130px" /></template></ElTableColumn>
        <ElTableColumn label="中文单位" width="100"><template #default="{ row }"><ElInput v-model="row.unit" :maxlength="10" :disabled="busy" /></template></ElTableColumn>
        <ElTableColumn label="单价（元）" width="155"><template #default="{ row }"><ElInputNumber v-model="row.unitPrice" :min="0" :precision="2" :disabled="busy" controls-position="right" style="width: 130px" /></template></ElTableColumn>
        <ElTableColumn label="操作" width="75"><template #default="{ $index }"><ElButton link type="danger" :disabled="busy" @click="lines.splice($index, 1)">移除</ElButton></template></ElTableColumn>
      </ElTable>
      <ElButton :disabled="busy || lines.length >= 50" @click="addLine">添加费用项</ElButton>
      <ElButton type="primary" :loading="busy" @click="save">保存并等待用户确认</ElButton>
    </template>
    <div v-if="!history.length" class="my-4">暂无报价记录</div>
    <div v-for="quote in history" :key="quote.quoteId" class="mt-5">
      <div>第 {{ quote.version }} 版 · {{ labels[quote.status] || '未知状态' }} · {{ quote.createdTime }}</div>
      <div class="my-2">{{ quote.description }}</div>
      <div class="mb-2">报价总价 {{ quote.totalAmount }} 元 · 已付金额抵扣 {{ quote.deductionAmount }} 元 · 报价应补 {{ quote.supplementAmount }} 元（不代表已收款）</div>
      <ElTable :data="snapshot(quote)">
        <ElTableColumn prop="name" label="费用名称" /><ElTableColumn prop="quantity" label="数量" /><ElTableColumn prop="unit" label="单位" /><ElTableColumn prop="unitPrice" label="单价（元）" />
      </ElTable>
    </div>
  </ElDialog>
</template>
