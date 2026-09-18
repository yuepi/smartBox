<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import {
  ElAlert,
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElImage,
} from 'element-plus';
import { requestClient } from '#/api/request';
import UploadImage from '#/components/UploadImage/index.vue';

interface Category {
  recycleItemId?: number;
  parentId: number;
  name: string;
  code: string;
  status: number;
  sort: number;
  level?: number;
  imageUrl?: string;
  pricingUnit?: string;
  defaultPrice?: number;
}
const { hasAccessByCodes } = useAccess();
const rows = ref<Category[]>([]);
const busy = ref(false);
const visible = ref(false);
const error = ref(false);
const images = ref<string[]>([]);
const changedPrices = ref<Record<number, number | undefined>>({});
function markPrice(row: Category) {
  if (row.recycleItemId != null)
    changedPrices.value[row.recycleItemId] = row.defaultPrice;
}
async function savePrices() {
  if (busy.value) return;
  const changes = Object.entries(changedPrices.value).map(([id, price]) => ({
    recycleItemId: Number(id),
    defaultPrice: price,
  }));
  if (!changes.length) {
    ElMessage.warning('请先在表格修改默认价格');
    return;
  }
  if (changes.some((row) => !(row.defaultPrice! > 0))) {
    ElMessage.warning('默认价格须大于0');
    return;
  }
  busy.value = true;
  try {
    await ElMessageBox.confirm(
      `将更新 ${changes.length} 个品类的默认价，未自定义价格的商户将跟随调整，历史订单报价不变。是否提交？`,
      '批量提交默认价格',
      { type: 'warning' },
    );
    await requestClient.post(
      '/restful/plat/onsiteRecycleItem/defaultPrices',
      changes,
    );
    changedPrices.value = {};
    ElMessage.success('默认价格已批量保存，未自定义的商户将使用新价格');
  } catch {
    /* 整批失败保留修改内容。 */
  } finally {
    busy.value = false;
  }
}
const form = ref<Category>({
  parentId: 0,
  name: '',
  code: '',
  status: 0,
  sort: 0,
});
const canEdit = () => hasAccessByCodes(['plat:onsiteRecycleItem:edit']);
async function load() {
  busy.value = true;
  error.value = false;
  try {
    rows.value = await requestClient.get<Category[]>(
      '/restful/plat/onsiteRecycleItem/list',
    );
    // 刷新成功后丢弃旧的编辑记录，避免提交与当前表格不一致的价格。
    changedPrices.value = {};
  } catch {
    error.value = true;
  } finally {
    busy.value = false;
  }
}
function edit(row?: Category) {
  form.value = row
    ? { ...row }
    : { parentId: 0, name: '', code: '', status: 0, sort: 0 };
  visible.value = true;
  images.value = row?.imageUrl ? [row.imageUrl] : [];
}
async function save() {
  if (busy.value) return;
  if (!images.value[0] || !form.value.pricingUnit) {
    ElMessage.warning('请上传品类图片并选择计价单位');
    return;
  }
  if (!form.value.name.trim() || !/^[\w-]{1,32}$/.test(form.value.code)) {
    ElMessage.warning('填写名称及1至32位字母数字编码');
    return;
  }
  busy.value = true;
  try {
    await requestClient.post('/restful/plat/onsiteRecycleItem/save', {
      ...form.value,
      imageUrl: images.value[0],
    });
    visible.value = false;
    ElMessage.success('类目已保存');
  } catch {
    return;
  } finally {
    busy.value = false;
  }
  await load();
}
onMounted(load);
</script>
<template>
  <Page title="回收类目管理">
    <ElAlert
      title="平台维护品类、图片、单位和默认价。默认价可在表格多行编辑后一次提交；商户自定义价优先，未修改的商户跟随默认价。"
      type="info"
      :closable="false"
      class="mb-3"
    />
    <ElAlert
      title="廊坊小件初始价为试行估算价，非实时市场成交价；正式接单前请复核本地收购、搬运及运输成本。"
      type="warning"
      :closable="false"
      class="mb-3"
    />
    <div class="mb-3">
      <ElButton v-if="canEdit()" type="primary" :disabled="busy" @click="edit()"
        >新增类目</ElButton
      ><ElButton :loading="busy" @click="load">刷新 / 重试</ElButton>
    </div>
    <ElAlert
      v-if="error"
      title="目录加载失败，请重试"
      type="error"
      :closable="false"
    />
    <ElTable :data="rows" row-key="recycleItemId" border>
      <ElTableColumn label="默认价格" width="200"
        ><template #default="{ row }"
          ><ElInputNumber
            v-if="canEdit()"
            v-model="row.defaultPrice"
            :min="0.01"
            :max="999999.99"
            :precision="2"
            :disabled="busy"
            @change="markPrice(row)"
          /><span v-else>{{ row.defaultPrice ?? '未配置' }}</span></template
        ></ElTableColumn
      >
      <ElTableColumn label="品类图片" width="110"
        ><template #default="{ row }"
          ><ElImage
            v-if="row.imageUrl"
            :src="row.imageUrl"
            :preview-src-list="[row.imageUrl]"
            preview-teleported
            fit="cover"
            style="width: 64px; height: 64px"
          /><span v-else>待配置</span></template
        ></ElTableColumn
      >
      <ElTableColumn label="报价单位" width="110"
        ><template #default="{ row }">{{
          row.pricingUnit === 'kg'
            ? '元/公斤'
            : row.pricingUnit === 'piece'
              ? '元/件'
              : '待配置'
        }}</template></ElTableColumn
      >
      <ElTableColumn prop="recycleItemId" label="ID" width="90" /><ElTableColumn
        prop="name"
        label="名称"
      />
      <ElTableColumn prop="code" label="编码" /><ElTableColumn label="父级"
        ><template #default="{ row }">{{
          rows.find((item) => item.recycleItemId === row.parentId)?.name ||
          '顶级目录'
        }}</template></ElTableColumn
      >
      <ElTableColumn prop="level" label="层级" width="80" /><ElTableColumn
        prop="sort"
        label="排序"
        width="80"
      />
      <ElTableColumn label="状态"
        ><template #default="{ row }"
          ><ElTag :type="row.status === 0 ? 'success' : 'info'">{{
            row.status === 0 ? '启用' : '停用'
          }}</ElTag></template
        ></ElTableColumn
      >
      <ElTableColumn v-if="canEdit()" label="操作"
        ><template #default="{ row }"
          ><ElButton link type="primary" :disabled="busy" @click="edit(row)"
            >编辑 / 启停</ElButton
          ></template
        ></ElTableColumn
      >
    </ElTable>
    <ElButton
      v-if="canEdit()"
      class="mt-3"
      type="primary"
      :loading="busy"
      @click="savePrices"
      >批量提交默认价格</ElButton
    >
    <ElDialog
      v-model="visible"
      :title="form.recycleItemId ? '编辑类目' : '新增类目'"
      width="520px"
      :close-on-click-modal="false"
      :show-close="!busy"
    >
      <ElForm label-width="90px">
        <ElFormItem label="品类图片" required
          ><UploadImage v-model="images" :limit="1"
        /></ElFormItem>
        <ElFormItem label="计价单位" required
          ><ElSelect v-model="form.pricingUnit" :disabled="busy"
            ><ElOption label="元/公斤（按重量）" value="kg" /><ElOption
              label="元/件（按数量）"
              value="piece" /></ElSelect
        ></ElFormItem>
        <ElFormItem label="父级"
          ><ElSelect
            v-model="form.parentId"
            filterable
            :disabled="!!form.recycleItemId || busy"
            ><ElOption label="顶级目录" :value="0" /><ElOption
              v-for="item in rows.filter((row) => row.status === 0)"
              :key="item.recycleItemId"
              :value="item.recycleItemId!"
              :label="`${item.name}（${item.recycleItemId}）`" /></ElSelect
        ></ElFormItem>
        <ElFormItem label="名称" required
          ><ElInput v-model="form.name" :maxlength="100" :disabled="busy"
        /></ElFormItem>
        <ElFormItem label="默认价格"
          ><ElInputNumber
            v-model="form.defaultPrice"
            :min="0.01"
            :max="999999.99"
            :precision="2"
            :disabled="busy"
            placeholder="可在表格批量配置"
        /></ElFormItem>
        <ElFormItem label="唯一编码" required
          ><ElInput v-model="form.code" :maxlength="32" :disabled="busy"
        /></ElFormItem>
        <ElFormItem label="排序"
          ><ElInputNumber
            v-model="form.sort"
            :min="0"
            :precision="0"
            :disabled="busy"
        /></ElFormItem>
        <ElFormItem label="状态"
          ><ElSelect v-model="form.status" :disabled="busy"
            ><ElOption label="启用" :value="0" /><ElOption
              label="停用"
              :value="1" /></ElSelect
        ></ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton :disabled="busy" @click="visible = false">取消</ElButton
        ><ElButton type="primary" :loading="busy" @click="save"
          >保存</ElButton
        ></template
      >
    </ElDialog>
  </Page>
</template>
