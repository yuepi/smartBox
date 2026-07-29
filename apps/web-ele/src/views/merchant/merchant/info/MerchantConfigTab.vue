<script lang="ts" setup>
import { editMerchantConfigApi, getMerchantConfigDetailApi } from '#/api/system/merchant';

const props = defineProps<{ merchantId: number }>();

const loading = ref(false);
const submitting = ref(false);
const configData = ref<any>(null);

async function loadData() {
  if (!props.merchantId) return;
  loading.value = true;
  try {
    const res = await getMerchantConfigDetailApi(props.merchantId);
    configData.value = res;
  } catch {
    ElMessage.error('获取商户配置失败');
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  if (!configData.value) return;
  submitting.value = true;
  try {
    await editMerchantConfigApi({
      merchantConfigId: configData.value.merchantConfigId,
      orderWalletSync: configData.value.orderWalletSync,
      status: configData.value.status,
    });
    ElMessage.success('保存成功');
  } catch {
    ElMessage.error('保存失败');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div v-loading="loading" class="config-form">
    <el-form v-if="configData" :model="configData" label-width="180px" label-position="right">
      <el-form-item label="回收订单审核方式">
        <el-select v-model="configData.orderWalletSync" placeholder="请选择" style="width: 100%">
          <el-option label="不需要审核，直接到钱包" :value="0" />
          <el-option label="需要审核，到预计收益" :value="1" />
        </el-select>
        <div class="text-gray-400 text-xs mt-1">选择后影响回收订单的收益结算方式</div>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="handleSave">保存配置</el-button>
      </el-form-item>
    </el-form>
    <el-empty v-else description="暂无配置信息" />
  </div>
</template>
