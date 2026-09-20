<script setup lang="ts">
import { ref } from 'vue';
import { useAccess } from '@vben/access';
import {
  ElAlert,
  ElButton,
  ElCheckbox,
  ElDialog,
  ElMessage,
} from 'element-plus';
import { requestClient } from '#/api/request';

const emit = defineEmits<{ (event: 'success'): void }>();
const props = defineProps<{ business: 'housekeeping' | 'onsiteRecycle' }>();
const { hasAccessByCodes } = useAccess();
const visible = ref(false);
const busy = ref(false);
const housekeeping = ref(false);
const onsiteRecycle = ref(false);
const canHome = () => props.business === 'housekeeping' && hasAccessByCodes(['merchant:homeItem:add']);
const canOnsite = () => props.business === 'onsiteRecycle' && hasAccessByCodes(['merchant:onsiteRecycleOrder:scope']);
function open() {
  housekeeping.value = canHome();
  onsiteRecycle.value = canOnsite();
  visible.value = true;
}
async function copy() {
  if (busy.value || (!housekeeping.value && !onsiteRecycle.value)) return;
  busy.value = true;
  try {
    const result = await requestClient.post<{
      homeCopied: number;
      homeSkipped: number;
      onsiteCopied: number;
      onsiteSkipped: number;
    }>('/restful/merchant/defaultConfig/copy', {
      housekeeping: housekeeping.value,
      onsiteRecycle: onsiteRecycle.value,
    });
    ElMessage.success(
      `家政新增 ${result.homeCopied} 项、跳过 ${result.homeSkipped} 项；上门回收新增 ${result.onsiteCopied} 类、跳过 ${result.onsiteSkipped} 类。`,
    );
    visible.value = false;
    emit('success');
  } catch {
    // 接口统一显示错误；事务失败不会留下半套配置，保留选择以便重试。
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <ElButton v-if="canHome() || canOnsite()" @click="open"
    >{{ business === 'onsiteRecycle' ? '使用平台品类' : '使用平台默认配置' }}</ElButton
  >
  <ElDialog
    v-model="visible"
    :title="business === 'onsiteRecycle' ? '使用平台回收品类' : '使用平台家政默认配置'"
    width="540px"
    :close-on-click-modal="false"
    :close-on-press-escape="!busy"
    :show-close="!busy"
  >
    <ElAlert
      :title="business === 'onsiteRecycle' ? '直接使用平台已启用且配置完整的具体回收品类，不读取其他商户。图片、单位和默认价沿用平台数据；自定义价留空时跟随平台。只新增缺少的品类并启用，已有价格和停用状态不覆盖。' : '使用平台末级分类下已启用的默认服务、规格价格、图片和加价项，不读取其他商户。已有同类服务直接跳过，不覆盖价格、名称或停用状态；新增后由本商户独立维护，平台后续改价不会同步覆盖。'"
      type="info"
      :closable="false"
      class="mb-4"
    />
    <ElCheckbox v-if="canHome()" v-model="housekeeping" :disabled="busy"
      >平台家政服务、规格、图片和加价项</ElCheckbox
    >
    <ElCheckbox v-if="canOnsite()" v-model="onsiteRecycle" :disabled="busy"
      >平台回收品类及默认报价</ElCheckbox
    >
    <p class="mt-4 text-sm text-gray-500">
      不复制订单、客户、权限或回收箱配置。请先保存当前页面的修改，复制成功后会刷新配置。
    </p>
    <template #footer>
      <ElButton :disabled="busy" @click="visible = false">取消</ElButton>
      <ElButton
        type="primary"
        :loading="busy"
        :disabled="!housekeeping && !onsiteRecycle"
        @click="copy"
        >{{ business === 'onsiteRecycle' ? '确认使用' : '确认复制' }}</ElButton
      >
    </template>
  </ElDialog>
</template>
