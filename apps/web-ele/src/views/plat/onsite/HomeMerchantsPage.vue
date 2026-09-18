<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { useAccess } from '@vben/access';
import {
  ElAlert,
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';
import { requestClient } from '#/api/request';

interface Merchant {
  merchantId?: number;
  merchantName: string;
  merchantCode: string;
  contact: string;
  phone: string;
}
const { hasAccessByCodes } = useAccess();
const rows = ref<Merchant[]>([]);
const busy = ref(false);
const error = ref(false);
const visible = ref(false);
const keyword = ref('');
const form = ref<Merchant>({
  merchantName: '',
  merchantCode: '',
  contact: '',
  phone: '',
});
async function load() {
  busy.value = true;
  error.value = false;
  try {
    rows.value = await requestClient.get<Merchant[]>(
      '/restful/plat/homeMerchant/list',
      { params: { merchantName: keyword.value } },
    );
  } catch {
    error.value = true;
  } finally {
    busy.value = false;
  }
}
function open() {
  form.value = { merchantName: '', merchantCode: '', contact: '', phone: '' };
  visible.value = true;
}
async function create() {
  if (busy.value) return;
  if (!form.value.merchantName.trim() || !form.value.merchantCode.trim()) {
    ElMessage.warning('请填写商户名称和编码');
    return;
  }
  busy.value = true;
  try {
    await requestClient.post('/restful/plat/homeMerchant/create', {
      ...form.value,
      status: 0,
    });
    visible.value = false;
    ElMessage.success('家政商户已创建，请继续配置该商户账号及菜单权限');
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
  <Page title="家政商户">
    <ElAlert
      title="查询启用中的家政服务商。复用原商户主体及账号体系；创建后仍需在账号和权限管理中配置经营权限。"
      type="info"
      :closable="false"
      class="mb-3"
    />
    <div class="mb-3 flex gap-3">
      <ElInput
        v-model="keyword"
        placeholder="商户名称"
        class="max-w-72"
        clearable
        @keyup.enter="load"
      /><ElButton :loading="busy" @click="load">查询 / 重试</ElButton
      ><ElButton
        v-if="hasAccessByCodes(['plat:homeMerchant:audit'])"
        type="primary"
        :disabled="busy"
        @click="open"
        >创建家政商户</ElButton
      >
    </div>
    <ElAlert
      v-if="error"
      title="加载失败，请重试"
      type="error"
      :closable="false"
    />
    <ElTable :data="rows"
      ><ElTableColumn prop="merchantId" label="ID" width="100" /><ElTableColumn
        prop="merchantName"
        label="商户名称" /><ElTableColumn
        prop="merchantCode"
        label="编码" /><ElTableColumn
        prop="contact"
        label="联系人" /><ElTableColumn prop="phone" label="电话"
    /></ElTable>
    <ElDialog
      v-model="visible"
      title="创建家政商户"
      width="520px"
      :show-close="!busy"
      :close-on-click-modal="false"
    >
      <ElForm label-width="90px"
        ><ElFormItem label="商户名称" required
          ><ElInput v-model="form.merchantName" :maxlength="100" /></ElFormItem
        ><ElFormItem label="商户编码" required
          ><ElInput v-model="form.merchantCode" :maxlength="32" /></ElFormItem
        ><ElFormItem label="联系人"
          ><ElInput v-model="form.contact" :maxlength="50" /></ElFormItem
        ><ElFormItem label="电话"
          ><ElInput v-model="form.phone" :maxlength="20" /></ElFormItem
      ></ElForm>
      <template #footer
        ><ElButton :disabled="busy" @click="visible = false">取消</ElButton
        ><ElButton type="primary" :loading="busy" @click="create"
          >创建</ElButton
        ></template
      >
    </ElDialog>
  </Page>
</template>
