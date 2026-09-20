<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import DefaultConfigCopyButton from '#/components/DefaultConfigCopyButton/index.vue';
import {
  ElAlert,
  ElButton,
  ElImage,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';
import type { OnsiteCategory } from '#/api/system/onsiteRecycle';
import {
  getOnsiteCategories,
  getOnsiteScopePrices,
  saveOnsiteScope,
} from '#/api/system/onsiteRecycle';

/** 自定义价留空即跟随平台默认价；多行编辑后只提交一次，不展示重复价格列。 */
const options = ref<(OnsiteCategory & { label: string })[]>([]);
const ids = ref<number[]>([]);
const prices = ref<Record<number, number | undefined>>({});
const busy = ref(false);
const loaded = ref(false);
function leaves(
  rows: OnsiteCategory[],
  parent = '',
): (OnsiteCategory & { label: string })[] {
  return rows.flatMap((row) => {
    const label = parent + row.name;
    return row.children?.length
      ? leaves(row.children, label + ' / ')
      : [{ ...row, label }];
  });
}
function unit(id: number) {
  const value = options.value.find(
    (row) => row.recycleItemId === id,
  )?.pricingUnit;
  return value === 'kg'
    ? '元/公斤'
    : value === 'piece'
      ? '元/件'
      : '平台未配置';
}
async function load() {
  if (busy.value) return;
  busy.value = true;
  loaded.value = false;
  try {
    const [tree, quotes] = await Promise.all([
      getOnsiteCategories(),
      getOnsiteScopePrices(),
    ]);
    options.value = leaves(tree);
    ids.value = quotes
      .filter((row) => row.status === 0)
      .map((row) => row.recycleItemId);
    prices.value = {};
    for (const row of quotes) {
      if (row.referencePrice != null)
        prices.value[row.recycleItemId] = row.referencePrice;
      if (
        row.status === 0 &&
        !options.value.some((item) => item.recycleItemId === row.recycleItemId)
      )
        options.value.push({
          recycleItemId: row.recycleItemId,
          name: '已停用品类',
          label: '已停用品类（' + row.recycleItemId + '），请移除',
        });
    }
    loaded.value = true;
  } catch {
    /* 加载失败禁止保存，避免误清空配置。 */
  } finally {
    busy.value = false;
  }
}
async function save() {
  if (busy.value || !loaded.value) return;
  if (
    ids.value.some(
      (id) =>
        !(
          (prices.value[id] ??
            options.value.find((row) => row.recycleItemId === id)
              ?.defaultPrice ??
            0) > 0
        ),
    )
  ) {
    ElMessage.warning('没有默认价的品类，请填写自定义价格');
    return;
  }
  busy.value = true;
  try {
    await ElMessageBox.confirm(
      ids.value.length
        ? '确认保存本商户回收报价？新预约使用新价，已有订单快照不变。'
        : '清空后暂停承接新预约，确认继续？',
      '保存范围与报价',
    );
    await saveOnsiteScope(
      ids.value,
      Object.fromEntries(ids.value.map((id) => [id, prices.value[id] ?? null])),
    );
    ElMessage.success('本商户范围与报价已保存');
  } catch {
    /* 取消或失败保留编辑内容。 */
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>
<template>
  <Page title="可收品类与商户报价">
    <ElAlert
      title="自定义价格留空使用平台默认价，填写后以自定义价为准。可多行修改后一次提交；采用默认价的品类会跟随平台调价，历史订单不变。"
      type="info"
      :closable="false"
      class="mb-5"
    />
    <ElButton :loading="busy" @click="load">刷新 / 重试</ElButton>
    <DefaultConfigCopyButton business="onsiteRecycle" @success="load" />
    <ElButton
      :disabled="busy || !loaded"
      @click="
        ids = options
          .filter(
            (row) =>
              row.imageUrl && row.pricingUnit && (row.defaultPrice ?? 0) > 0,
          )
          .map((row) => row.recycleItemId)
      "
      >全选有默认价的品类</ElButton
    >
    <ElButton
      :disabled="busy || !loaded"
      @click="ids.forEach((id) => (prices[id] = undefined))"
      >所选品类全部采用默认价</ElButton
    >
    <ElSelect
      v-model="ids"
      multiple
      filterable
      class="my-5 w-full"
      :disabled="busy || !loaded"
      placeholder="请选择本商户可收品类"
    >
      <ElOption
        v-for="item in options"
        :key="item.recycleItemId"
        :value="item.recycleItemId"
        :label="item.label + '（' + item.recycleItemId + '）'"
      />
    </ElSelect>
    <ElTable
      :data="options.filter((row) => ids.includes(row.recycleItemId))"
      border
    >
      <ElTableColumn label="图片" width="110"
        ><template #default="{ row }"
          ><ElImage
            v-if="row.imageUrl"
            :src="row.imageUrl"
            :preview-src-list="[row.imageUrl]"
            preview-teleported
            style="width: 64px; height: 64px"
            fit="cover"
          /><span v-else>平台待补充</span></template
        ></ElTableColumn
      >
      <ElTableColumn prop="label" label="回收品类" />
      <ElTableColumn label="默认价格" width="130"
        ><template #default="{ row }">{{
          row.defaultPrice ?? '未配置'
        }}</template></ElTableColumn
      >
      <ElTableColumn label="自定义价格" width="230"
        ><template #default="{ row }"
          ><ElInputNumber
            v-model="prices[row.recycleItemId]"
            :min="0.01"
            :max="999999.99"
            :precision="2"
            placeholder="留空按默认价"
            :disabled="busy" /></template
      ></ElTableColumn>
      <ElTableColumn label="单位" width="140"
        ><template #default="{ row }">{{
          unit(row.recycleItemId)
        }}</template></ElTableColumn
      >
    </ElTable>
    <ElButton
      type="primary"
      class="mt-5"
      :loading="busy"
      :disabled="!loaded"
      @click="save"
      >一次提交全部配置</ElButton
    >
  </Page>
</template>
