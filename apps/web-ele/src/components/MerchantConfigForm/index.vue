<script lang="ts" setup>
import type { MerchantConfig } from '#/api/system/merchant';

const props = withDefaults(
  defineProps<{
    /** 获取配置API */
    getConfigApi: (merchantId: number) => Promise<MerchantConfig>;
    /** 商户ID */
    merchantId: number;
    /** 是否只读模式 */
    readonly?: boolean;
    /** 保存配置API */
    saveConfigApi: (data: any) => Promise<void>;
    /** 是否显示审核方式字段（默认true） */
    showOrderWalletSync?: boolean;
  }>(),
  {
    showOrderWalletSync: true,
    readonly: false,
  },
);

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const loading = ref(false);
const submitting = ref(false);
const configData = ref<MerchantConfig | null>(null);

async function loadData() {
  if (!props.merchantId) return;
  loading.value = true;
  try {
    const res = await props.getConfigApi(props.merchantId);
    configData.value = res;
  } catch {
    ElMessage.error('获取配置失败');
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  if (!configData.value) return;
  submitting.value = true;
  try {
    await props.saveConfigApi({
      merchantConfigId: configData.value.merchantConfigId,
      orderWalletSync: configData.value.orderWalletSync,
      status: configData.value.status,
      firstOrderNoAudit: configData.value.firstOrderNoAudit,
      autoAuditEnabled: configData.value.autoAuditEnabled,
      autoAuditHours: configData.value.autoAuditHours,
    });
    ElMessage.success('保存成功');
    emit('success');
  } catch {
    ElMessage.error('保存失败');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadData();
});

// 暴露刷新方法
defineExpose({
  loadData,
});
</script>

<template>
  <div v-loading="loading" class="config-form">
    <el-form
      v-if="configData"
      :model="configData"
      label-width="220px"
      label-position="right"
    >
      <!-- 回收订单审核方式 -->
      <el-form-item v-if="showOrderWalletSync" label="回收订单审核方式">
        <el-select
          v-model="configData.orderWalletSync"
          placeholder="请选择"
          style="width: 100%"
          :disabled="readonly"
        >
          <el-option label="不需要审核，直接到钱包" :value="0" />
          <el-option label="需要审核，到预计收益" :value="1" />
        </el-select>
        <div class="text-gray-400 text-xs mt-1">
          选择后影响回收订单的收益结算方式
        </div>
      </el-form-item>

      <!-- 用户首次订单免审核 -->
      <el-form-item label="用户首次订单免审核">
        <el-radio-group
          v-model="configData.firstOrderNoAudit"
          :disabled="readonly"
        >
          <el-radio :value="1">是</el-radio>
          <el-radio :value="0">否</el-radio>
        </el-radio-group>
        <div class="text-gray-400 text-xs ml-2">
          开启后，用户首次订单无需审核直接入账
        </div>
      </el-form-item>

      <!-- 自动审核开关 -->
      <el-form-item label="自动审核开关">
        <el-radio-group
          v-model="configData.autoAuditEnabled"
          :disabled="readonly"
        >
          <el-radio :value="1">启用</el-radio>
          <el-radio :value="0">禁用</el-radio>
        </el-radio-group>
        <div class="text-gray-400 text-xs ml-2">
          开启后，到达设定时间订单自动审核通过
        </div>
      </el-form-item>

      <!-- 自动审核时间阈值 -->
      <el-form-item
        v-if="configData.autoAuditEnabled === 1"
        label="自动审核时间阈值"
      >
        <el-input-number
          v-model="configData.autoAuditHours"
          :min="1"
          :max="720"
          style="width: 200px"
          :disabled="readonly"
        />
        <span class="ml-2 text-gray-500">小时</span>
        <div class="text-gray-400 text-xs ml-2">
          订单创建超过此时间后自动审核通过，默认 24 小时
        </div>
      </el-form-item>

      <el-form-item>
        <el-button
          v-if="!readonly"
          type="primary"
          :loading="submitting"
          @click="handleSave"
          >保存配置</el-button
        >
        <el-button v-else type="info" disabled>只读模式</el-button>
      </el-form-item>
    </el-form>
    <el-empty v-else description="暂无配置信息" />
  </div>
</template>
