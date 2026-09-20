<script lang="ts" setup>
import type { HomeBookingRule } from '#/api/system/homeBookingRule';
import ServiceAreaCard from './ServiceAreaCard.vue';
import { onMounted, ref } from 'vue';
import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import {
  ElAlert,
  ElButton,
  ElCard,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElSwitch,
} from 'element-plus';
import {
  getHomeBookingRuleApi,
  saveHomeBookingRuleApi,
} from '#/api/system/homeBookingRule';
import {
  getOnsiteRecycleBookingRuleApi,
  saveOnsiteRecycleBookingRuleApi,
} from '#/api/system/onsiteRecycleBookingRule';

// 复用规则表单，业务接口和权限独立；上门回收不读取或写入家政配置。
const props = withDefaults(defineProps<{ onsite?: boolean }>(), { onsite: false });
const editPermission = props.onsite
  ? 'merchant:onsiteRecycleOrder:scope'
  : 'merchant:homeItem:edit';
const { hasAccessByCodes } = useAccess();
const form = ref<HomeBookingRule>();
const busy = ref(false);
async function load() {
  if (busy.value) return;
  busy.value = true;
  try {
    form.value = await (props.onsite ? getOnsiteRecycleBookingRuleApi() : getHomeBookingRuleApi());
  } catch {
    /* 加载失败不填充假默认值，避免误覆盖线上配置。 */
  } finally {
    busy.value = false;
  }
}
async function reload() {
  try {
    await ElMessageBox.confirm(
      '重新加载会放弃尚未保存的修改，是否继续？',
      '重新加载',
    );
    await load();
  } catch {
    /* 保留未保存编辑。 */
  }
}
async function save() {
  if (busy.value || !form.value) return;
  busy.value = true;
  try {
    await ElMessageBox.confirm(
      form.value.status === 0
        ? '启用后新下单和商户改约必须满足本规则，已存在订单不自动调整。确认保存？'
        : '停用后不再校验营业时段、提前分钟数和可预约天数。确认保存？',
      '保存预约规则',
      { type: 'warning' },
    );
    const {
      startTime,
      endTime,
      advanceMinutes,
      bookableDays,
      status,
      version,
    } = form.value;
    const saveApi = props.onsite ? saveOnsiteRecycleBookingRuleApi : saveHomeBookingRuleApi;
    await saveApi({
      startTime,
      endTime,
      advanceMinutes,
      bookableDays,
      status,
      expectedVersion: version,
    });
    // 乐观锁成功一次只增加1；不因后续重新读取失败误报保存失败。
    form.value.version = version + 1;
    ElMessage.success('预约规则已保存');
  } catch {
    /* 冲突时保留输入，用户确认后重新加载，不自动覆盖别人的配置。 */
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>

<template>
  <Page :title="props.onsite ? '上门回收预约规则' : '家政预约规则'">
    <ServiceAreaCard :onsite="props.onsite" />
    <ElAlert
      type="info"
      :closable="false"
      class="mb-4"
      :title="props.onsite
        ? '仅用于上门回收，与家政规则独立。新下单和拒单转派按接单商户规则筛选，改约按当前商户规则校验；无合适商户时拒绝新预约，拒单后无法转派则取消。北京时间、每天同一时段，不限制接单数量，不自动修改历史订单。'
        : '按实际服务商校验，自营与合作订单均适用。北京时间、每天同一营业时段，仅限制预约开始时间；暂不限制接单数量，不自动修改历史订单。'"
    />
    <ElCard v-loading="busy">
      <ElAlert
        v-if="props.onsite && form"
        type="info"
        :closable="false"
        class="mb-4"
        :title="form.version === 0
          ? '当前使用系统默认：已启用，每天08:00–18:00，提前60分钟，含今天7天。修改并保存后采用本商户配置。'
          : '当前使用本商户配置，与家政预约规则互不影响。'"
      />
      <ElForm
        v-if="form"
        label-width="140px"
        :disabled="busy || !hasAccessByCodes([editPermission])"
        style="max-width: 640px"
      >
        <ElFormItem label="启用预约规则"
          ><ElSwitch
            v-model="form.status"
            :active-value="0"
            :inactive-value="1"
        /></ElFormItem>
        <ElFormItem label="营业开始时间" required
          ><ElInput v-model="form.startTime" placeholder="08:00" :maxlength="5"
        /></ElFormItem>
        <ElFormItem label="营业结束时间" required>
          <ElInput
            v-model="form.endTime"
            placeholder="18:00，全天结束填24:00"
            :maxlength="5"
          />
          <span class="text-gray-500"
            >开始时间包含在内，结束时刻不接预约；暂不支持跨日营业。</span
          >
        </ElFormItem>
        <ElFormItem label="最少提前预约" required
          ><ElInputNumber
            v-model="form.advanceMinutes"
            :min="0"
            :max="10080"
            :precision="0"
          /><span class="ml-2">分钟</span></ElFormItem
        >
        <ElFormItem label="可预约日期范围" required
          ><ElInputNumber
            v-model="form.bookableDays"
            :min="1"
            :max="365"
            :precision="0"
          /><span class="ml-2">天（包含今天）</span></ElFormItem
        >
      </ElForm>
      <ElAlert
        v-else
        type="warning"
        title="规则未加载，请重试；不会用默认内容覆盖配置。"
        :closable="false"
        class="mb-4"
      />
      <ElButton :disabled="busy" @click="form ? reload() : load()"
        >重新加载</ElButton
      >
      <ElButton
        v-if="hasAccessByCodes([editPermission])"
        type="primary"
        :disabled="!form || busy"
        @click="save"
        >保存规则</ElButton
      >
    </ElCard>
  </Page>
</template>
