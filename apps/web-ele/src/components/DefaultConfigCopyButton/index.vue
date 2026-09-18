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
const { hasAccessByCodes } = useAccess();
const visible = ref(false);
const busy = ref(false);
const housekeeping = ref(false);
const onsiteRecycle = ref(false);
const canHome = () => hasAccessByCodes(['merchant:homeItem:add']);
const canOnsite = () => hasAccessByCodes(['merchant:onsiteRecycleOrder:scope']);
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
    >复制默认配置</ElButton
  >
  <ElDialog
    v-model="visible"
    title="复制 huixiaofen 默认配置"
    width="540px"
    :close-on-click-modal="false"
    :close-on-press-escape="!busy"
    :show-close="!busy"
  >
    <ElAlert
      title="只补充缺少的配置，已有项目、价格和停用状态不覆盖。复制后可独立改价，不随默认商户后续改价同步；回收自定义价为空的仍使用平台默认价。"
      type="info"
      :closable="false"
      class="mb-4"
    />
    <ElCheckbox v-if="canHome()" v-model="housekeeping" :disabled="busy"
      >家政服务、规格、图片和附加项</ElCheckbox
    >
    <ElCheckbox v-if="canOnsite()" v-model="onsiteRecycle" :disabled="busy"
      >上门回收可收范围和价格</ElCheckbox
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
        >确认复制</ElButton
      >
    </template>
  </ElDialog>
</template>
