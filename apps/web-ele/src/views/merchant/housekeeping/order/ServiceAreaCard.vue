<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAccess } from '@vben/access';
import { ElAlert, ElButton, ElCard, ElCascader, ElMessage, ElMessageBox } from 'element-plus';
import { requestClient } from '#/api/request';
import { getProvinceCityDistrictApi } from '#/api/common/area';
import type { Area } from '#/api/common/area';

const { hasAccessByCodes } = useAccess();
const props = withDefaults(defineProps<{ onsite?: boolean }>(), { onsite: false });
const label = props.onsite ? '上门回收' : '家政';
const endpoint = props.onsite ? '/restful/merchant/onsiteServiceArea' : '/restful/merchant/homeServiceArea';
const permission = props.onsite ? 'merchant:onsiteRecycleOrder:scope' : 'merchant:homeItem:edit';
const error = ref('');
const options = ref<Area[]>([]);
const selected = ref<string[]>([]);
const version = ref(0);
const loaded = ref(false);
const busy = ref(false);
const cascaderProps = { multiple: true, emitPath: false, value: 'cityCode', label: 'cityName', children: 'children' };
async function load() {
  if (busy.value) return;
  busy.value = true; loaded.value = false; error.value = '';
  try {
    const [tree, scope] = await Promise.all([
      getProvinceCityDistrictApi(),
      requestClient.get<{ districtCodes: string; version: number }>(endpoint + '/detail'),
    ]);
    options.value = tree;
    selected.value = scope.districtCodes ? scope.districtCodes.split(',') : [];
    version.value = scope.version; loaded.value = true;
  } catch {
    error.value = '服务范围加载失败，请检查后端是否已更新、SQL是否已执行及账号权限，再点击重新加载。';
  } finally { busy.value = false; }
}
async function save() {
  if (!loaded.value || busy.value) return;
  busy.value = true;
  try {
    await ElMessageBox.confirm(selected.value.length
      ? '确认本商户可覆盖所选区县的全部区域？新下单立即按此范围校验，已有订单不变。'
      : `清空后停止接收新的${label}订单，已有订单仍需履约。确认清空？`, `保存${label}服务范围`, { type: 'warning' });
    await requestClient.post(endpoint + '/save', { districtCodes: selected.value, expectedVersion: version.value });
    version.value += 1;
    ElMessage.success(`${label}服务范围已保存`);
  } catch { /* 请求层显示错误；取消或冲突保留编辑内容。 */ }
  finally { busy.value = false; }
}
onMounted(() => { void load().catch(() => {}); });
</script>
<template>
  <ElCard class="mb-5" :header="label + '可服务区县'">
    <ElAlert v-if="error" class="mb-4" type="error" :closable="false" :title="error" />
    <ElAlert class="mb-4" type="warning" :closable="false" title="只勾选确实能够上门的区县；未配置或清空后不接收新订单。商户所在地不代表服务范围，营业时间开关不影响本范围。" />
    <ElCascader v-model="selected" :options="options" :props="cascaderProps" :disabled="busy || !loaded || !hasAccessByCodes([permission])" filterable collapse-tags clearable placeholder="选择可服务省、市、区县（多选）" style="width: 100%; max-width: 700px" />
    <div class="mt-4">
      <ElButton :loading="busy" @click="load().catch(() => {})">重新加载</ElButton>
      <ElButton v-if="hasAccessByCodes([permission])" type="primary" :disabled="!loaded || busy" @click="save">保存服务范围</ElButton>
    </div>
  </ElCard>
</template>
