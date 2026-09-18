<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import {
  ElAlert,
  ElButton,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
} from 'element-plus';
import type { OnsiteCategory } from '#/api/system/onsiteRecycle';
import {
  getOnsiteCategories,
  getOnsiteScope,
  saveOnsiteScope,
} from '#/api/system/onsiteRecycle';

/** 可收范围独立菜单，沿用订单页相同接口，不存前端固定类目。 */
const options = ref<{ label: string; value: number }[]>([]);
const ids = ref<number[]>([]);
const busy = ref(false);
const loaded = ref(false);
function leaves(
  rows: OnsiteCategory[],
  parent = '',
): { label: string; value: number }[] {
  return rows.flatMap((row) => {
    const label = `${parent}${row.name}`;
    return row.children?.length
      ? leaves(row.children, `${label} / `)
      : [
          {
            label: `${label}（${row.recycleItemId}）`,
            value: row.recycleItemId,
          },
        ];
  });
}
async function load() {
  if (busy.value) return;
  busy.value = true;
  loaded.value = false;
  try {
    const [tree, scope] = await Promise.all([
      getOnsiteCategories(),
      getOnsiteScope(),
    ]);
    options.value = leaves(tree);
    for (const id of scope)
      if (!options.value.some((item) => item.value === id))
        options.value.push({ label: `已停用类目（${id}），请移除`, value: id });
    ids.value = scope;
    loaded.value = true;
  } catch {
    /* 加载失败不可保存空范围，允许重试。 */
  } finally {
    busy.value = false;
  }
}
async function save() {
  if (busy.value || !loaded.value) return;
  busy.value = true;
  try {
    await ElMessageBox.confirm(
      ids.value.length
        ? '确认按所选类目承接新预约？已有订单不受影响。'
        : '清空后将暂停承接全部新预约，确认继续？',
      '保存可收范围',
    );
    await saveOnsiteScope(ids.value);
    ElMessage.success('可收范围已保存');
  } catch {
    /* 取消或失败保留编辑值。 */
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>
<template>
  <Page title="可收类目配置">
    <ElAlert
      title="只有支持订单全部类目的商户才可承接。选择实际可回收的末级类目；停用不影响已有订单处理。"
      type="info"
      :closable="false"
      class="mb-5"
    />
    <ElButton :loading="busy" @click="load">刷新 / 重试</ElButton>
    <div class="my-5">
      <ElSelect
        v-model="ids"
        multiple
        filterable
        class="w-full"
        :disabled="busy || !loaded"
        placeholder="请选择可收类目"
        ><ElOption
          v-for="item in options"
          :key="item.value"
          :label="item.label"
          :value="item.value"
      /></ElSelect>
    </div>
    <ElButton type="primary" :loading="busy" :disabled="!loaded" @click="save"
      >保存范围</ElButton
    >
  </Page>
</template>
