<script setup lang="ts">
import type { HomeItem } from '#/api/system/housekeeping';
import { computed, ref } from 'vue';
import {
  ElAlert,
  ElButton,
  ElDialog,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';
import { requestClient } from '#/api/request';
import {
  getHomeItemDetailApi,
  getHomeItemPageApi,
} from '#/api/system/housekeeping';

const emit = defineEmits<{ (event: 'success'): void }>();
const props = defineProps<{
  categoryName: (id?: number) => string;
  unitName: (unit: string) => string;
}>();
const visible = ref(false);
const busy = ref(false);
const page = ref(1);
const total = ref(0);
const rows = ref<HomeItem[]>([]);
const original = ref<HomeItem[]>([]);
const selected = ref<HomeItem[]>([]);
const changed = computed(() =>
  rows.value.filter(
    (row, index) =>
      JSON.stringify(row) !== JSON.stringify(original.value[index]),
  ),
);

async function load(current: number) {
  if (busy.value) return;
  if (changed.value.length) {
    ElMessage.warning('请先保存当前页修改，或取消后重新打开');
    return;
  }
  busy.value = true;
  rows.value = [];
  original.value = [];
  selected.value = [];
  try {
    const result = await getHomeItemPageApi({ current, size: 100 });
    // 沿用详情契约，每页最多100个服务；任何详情失败都不开放半套数据编辑。
    const details: HomeItem[] = [];
    for (let offset = 0; offset < result.records.length; offset += 8) {
      details.push(
        ...(await Promise.all(
          result.records
            .slice(offset, offset + 8)
            .map((row) => getHomeItemDetailApi(row.homeItemId!)),
        )),
      );
    }
    rows.value = details;
    original.value = JSON.parse(JSON.stringify(details));
    page.value = current;
    total.value = result.total;
  } catch {
    ElMessage.error('配置加载失败，请重试');
  } finally {
    busy.value = false;
  }
}
async function open() {
  visible.value = true;
  rows.value = [];
  original.value = [];
  page.value = 1;
  total.value = 0;
  await load(1);
}
async function close(done?: () => void) {
  if (busy.value) return;
  if (changed.value.length) {
    try {
      await ElMessageBox.confirm(
        '当前修改尚未保存，确认放弃？',
        '退出批量配置',
        { type: 'warning' },
      );
    } catch {
      return;
    }
  }
  visible.value = false;
  done?.();
}
function setSelectedStatus(status: number) {
  selected.value.forEach((row) => {
    row.status = status;
  });
}
async function save() {
  if (busy.value || !changed.value.length) return;
  const invalid = changed.value.some(
    (row) =>
      !row.skuComboList?.length ||
      row.skuComboList.some(
        (combo) =>
          !Number.isFinite(combo.price) ||
          combo.price <= 0 ||
          combo.price > 999999.99,
      ) ||
      (row.status === 0 &&
        !row.skuComboList.some((combo) => combo.status === 0)),
  );
  if (invalid) {
    ElMessage.warning('请填写有效售价；上架服务至少保留一个启用规格');
    return;
  }
  const items = changed.value.map((row) => {
    const old = original.value.find(
      (item) => item.homeItemId === row.homeItemId,
    )!;
    return {
      homeItemId: row.homeItemId,
      expectedStatus: old.status,
      status: row.status,
      combos: row.skuComboList!.map((combo) => {
        const previous = old.skuComboList!.find(
          (item) => item.comboId === combo.comboId,
        )!;
        return {
          comboId: combo.comboId,
          price: combo.price,
          status: combo.status,
          expectedPrice: previous.price,
          expectedStatus: previous.status,
        };
      }),
    };
  });
  busy.value = true;
  try {
    await requestClient.post('/restful/merchant/homeItem/batchEdit', { items });
    ElMessage.success(`已保存 ${items.length} 个服务的价格和上下架配置`);
    original.value = JSON.parse(JSON.stringify(rows.value));
    emit('success');
  } catch {
    // 保留输入供核对；服务端冲突或校验失败时整批回滚，不自动覆盖最新配置。
  } finally {
    busy.value = false;
  }
}
defineExpose({ open });
</script>

<template>
  <ElDialog
    v-model="visible"
    title="家政批量配置"
    width="1100px"
    :before-close="close"
    :close-on-click-modal="false"
    :close-on-press-escape="!busy"
  >
    <ElAlert
      title="多项改价后一次保存，仅影响后续下单，不修改历史订单。批量上架不会自动启用已停用的规格。"
      type="info"
      :closable="false"
    />
    <div class="my-3 flex gap-2">
      <ElButton
        :disabled="busy || !selected.length"
        @click="setSelectedStatus(0)"
        >所选服务上架</ElButton
      >
      <ElButton
        :disabled="busy || !selected.length"
        @click="setSelectedStatus(1)"
        >所选服务下架</ElButton
      >
      <ElButton :disabled="busy || !!changed.length" @click="load(page)"
        >刷新配置</ElButton
      >
      <span>待保存 {{ changed.length }} 项</span>
    </div>
    <ElTable
      v-loading="busy"
      :data="rows"
      row-key="homeItemId"
      max-height="540"
      @selection-change="selected = $event"
    >
      <ElTableColumn type="selection" width="45" :selectable="() => !busy" />
      <ElTableColumn label="服务 / 类目" min-width="220">
        <template #default="{ row }"
          ><div>{{ row.itemName }}</div>
          <div class="text-xs text-gray-500">
            {{ props.categoryName(row.categoryId) }}
          </div>
          <div>单位：{{ props.unitName(row.unit) }}</div></template
        >
      </ElTableColumn>
      <ElTableColumn label="服务状态" width="120">
        <template #default="{ row }"
          ><ElSelect v-model="row.status" :disabled="busy"
            ><ElOption label="上架" :value="0" /><ElOption
              label="下架"
              :value="1" /></ElSelect
        ></template>
      </ElTableColumn>
      <ElTableColumn label="规格 / 售价（元） / 规格状态" min-width="500">
        <template #default="{ row }"
          ><div
            v-for="combo in row.skuComboList"
            :key="combo.comboId"
            class="my-2 flex items-center gap-2"
          >
            <span class="flex-1">{{ combo.comboName }}</span>
            <ElInputNumber
              v-model="combo.price"
              :disabled="busy"
              :min="0.01"
              :max="999999.99"
              :precision="2"
              :controls="false"
              class="!w-32"
            />
            <ElSelect v-model="combo.status" :disabled="busy" class="!w-24"
              ><ElOption label="启用" :value="0" /><ElOption
                label="停用"
                :value="1"
            /></ElSelect></div
        ></template>
      </ElTableColumn>
    </ElTable>
    <ElPagination
      :current-page="page"
      :page-size="100"
      :total="total"
      :disabled="busy || !!changed.length"
      layout="total, prev, pager, next"
      @current-change="load"
    />
    <template #footer
      ><ElButton :disabled="busy" @click="close()">关闭</ElButton
      ><ElButton
        type="primary"
        :loading="busy"
        :disabled="!changed.length"
        @click="save"
        >一次保存全部修改</ElButton
      ></template
    >
  </ElDialog>
</template>
