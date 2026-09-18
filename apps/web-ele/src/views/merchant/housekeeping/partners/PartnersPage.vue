<script setup lang="ts">
import { ref } from 'vue';
import { Page } from '@vben/common-ui';
import { useAccess } from '@vben/access';
import {
  ElAlert,
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
} from 'element-plus';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { requestClient } from '#/api/request';

interface Partner {
  relationId: number;
  recycleMerchantId: number;
  housekeepingMerchantId: number;
  recycleMerchantName: string;
  housekeepingMerchantName: string;
  relationType: number;
  createdTime: string;
}
interface Merchant {
  merchantId: number;
  merchantName: string;
  merchantType?: number;
}
const props = withDefaults(defineProps<{ platform?: boolean }>(), {
  platform: false,
});
const base = props.platform
  ? '/restful/plat/homeMerchant'
  : '/restful/merchant/homeMerchant';
const { hasAccessByCodes } = useAccess();
const canEdit = () =>
  hasAccessByCodes([
    props.platform ? 'plat:homeMerchant:audit' : 'merchant:homeMerchant:edit',
  ]);
const types = ['普通合作', '独家', '平台推荐'];
const busy = ref(false);
const visible = ref(false);
const homes = ref<Merchant[]>([]);
const merchants = ref<Merchant[]>([]);
const form = ref<{
  recycleMerchantId?: number;
  housekeepingMerchantId?: number;
  relationType: number;
}>({ relationType: 0 });
const [Grid, gridApi] = useVbenVxeGrid<Partner>({
  gridOptions: {
    height: 'auto',
    pagerConfig: { enabled: true },
    columns: [
      { field: 'recycleMerchantName', title: '经营商户', minWidth: 180 },
      { field: 'housekeepingMerchantName', title: '家政服务商', minWidth: 180 },
      {
        field: 'relationType',
        title: '合作类型',
        width: 130,
        formatter: ({ cellValue }: { cellValue: number }) =>
          types[cellValue] ?? '未知',
      },
      { field: 'createdTime', title: '建立时间', width: 170 },
      { title: '操作', width: 100, slots: { default: 'action' } },
    ],
    proxyConfig: {
      ajax: {
        query: async ({
          page,
        }: {
          page: { currentPage: number; pageSize: number };
        }) => {
          const result = await requestClient.get<{
            records: Partner[];
            total: number;
          }>(`${base}/relationList`, {
            params: { pageNo: page.currentPage, pageSize: page.pageSize },
          });
          return { ...result, items: result.records };
        },
      },
    },
  },
});
async function open() {
  if (busy.value) return;
  busy.value = true;
  try {
    homes.value = await requestClient.get<Merchant[]>(`${base}/list`);
    if (props.platform)
      merchants.value = await requestClient.get<Merchant[]>(
        '/restful/plat/homeMerchant/recycleMerchants',
      );
    form.value = { relationType: 0 };
    visible.value = true;
  } catch {
    /* 不显示未加载成功的空选择器，允许重试。 */
  } finally {
    busy.value = false;
  }
}
async function bind() {
  if (busy.value) return;
  if (
    !form.value.housekeepingMerchantId ||
    (props.platform && !form.value.recycleMerchantId)
  ) {
    ElMessage.warning('请选择合作双方');
    return;
  }
  busy.value = true;
  try {
    await requestClient.post(`${base}/bindRelation`, form.value);
    ElMessage.success('合作关系已建立');
    visible.value = false;
    await gridApi.query();
  } catch {
    /* 服务端校验商户身份、状态及重复关系。 */
  } finally {
    busy.value = false;
  }
}
async function unbind(row: Partner) {
  if (busy.value) return;
  busy.value = true;
  try {
    await ElMessageBox.confirm(
      `解除与“${row.housekeepingMerchantName}”的合作？停止新服务可见性，已有订单仍须履约。`,
      '解除合作',
    );
    await requestClient.post(`${base}/unbindRelation`, {
      relationId: row.relationId,
    });
    ElMessage.success('合作关系已解除');
    await gridApi.query();
  } catch {
    /* 取消不请求，失败保留原行。 */
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <Page auto-content-height>
    <ElAlert
      :title="
        platform
          ? '平台维护经营商户与家政服务商的合作关系；自营服务无需绑定自己。'
          : '本商户可以自营，也可选择已有家政服务商合作。订单由实际服务方履约，不需要新增自己的商户账号。'
      "
      type="info"
      :closable="false"
      class="mb-3"
    />
    <Grid
      ><template #toolbar-actions
        ><ElButton v-if="canEdit()" type="primary" :loading="busy" @click="open"
          >建立合作</ElButton
        ></template
      ><template #action="{ row }"
        ><ElButton
          v-if="canEdit()"
          link
          type="danger"
          :disabled="busy"
          @click="unbind(row)"
          >解除合作</ElButton
        ></template
      ></Grid
    >
    <ElDialog
      v-model="visible"
      title="建立家政合作关系"
      width="550px"
      :close-on-click-modal="false"
      :show-close="!busy"
    >
      <ElForm label-width="100px">
        <ElFormItem v-if="platform" label="经营商户" required
          ><ElSelect
            v-model="form.recycleMerchantId"
            filterable
            :disabled="busy"
            ><ElOption
              v-for="item in merchants"
              :key="item.merchantId"
              :value="item.merchantId"
              :label="`${item.merchantName}（${item.merchantId}）`" /></ElSelect
        ></ElFormItem>
        <ElFormItem label="家政服务商" required
          ><ElSelect
            v-model="form.housekeepingMerchantId"
            filterable
            :disabled="busy"
            ><ElOption
              v-for="item in homes"
              :key="item.merchantId"
              :value="item.merchantId"
              :label="`${item.merchantName}（${item.merchantId}）`" /></ElSelect
        ></ElFormItem>
        <ElFormItem label="合作类型"
          ><ElSelect v-model="form.relationType" :disabled="busy"
            ><ElOption
              v-for="(label, value) in types"
              :key="value"
              :label="label"
              :value="value" /></ElSelect
        ></ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton :disabled="busy" @click="visible = false">取消</ElButton
        ><ElButton type="primary" :loading="busy" @click="bind"
          >确认合作</ElButton
        ></template
      >
    </ElDialog>
  </Page>
</template>
