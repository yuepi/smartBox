<script lang="ts" setup>
import type { RecycleOrder } from '#/api/operation/recycleOrder';

import { computed, reactive, ref } from 'vue';

import { InfoFilled } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import { weightOperateApi } from '#/api/operation/recycleOrder';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const currentOrder = ref<null | RecycleOrder>(null);

// 订单基础数据
const orderInfo = reactive({
  weight: 0, // 原始投递重量
  unitPrice: 0, // 投递单价
  realAmount: 0, // 原始实付金额
});

// 表单数据
const form = reactive({
  recycleOrderId: 0,
  operateType: 0, // 0: 补重, 1: 扣重
  weight: 0, // 变动重量 (kg)
  amount: 0, // 变动金额 (元)
});

// 计算变更后的预估总重量
const calcAfterWeight = computed(() => {
  const origin = orderInfo.weight;
  const delta = form.weight || 0;
  return form.operateType === 0 ? Number((origin + delta).toFixed(2)) : Number(Math.max(0, origin - delta).toFixed(2));
});

// 计算变更后的预估总金额
const calcAfterAmount = computed(() => {
  const origin = orderInfo.realAmount;
  const delta = form.amount || 0;
  return form.operateType === 0 ? Number((origin + delta).toFixed(2)) : Number(Math.max(0, origin - delta).toFixed(2));
});

// 打开弹窗
function open(row: RecycleOrder) {
  currentOrder.value = row;
  form.recycleOrderId = row.recycleOrderId;
  form.operateType = 0;
  form.weight = 0;
  form.amount = 0;

  // 记录订单原属性
  orderInfo.weight = row.weight || 0;
  orderInfo.unitPrice = row.unitPrice || 0;
  orderInfo.realAmount = row.realAmount || 0;

  visible.value = true;
}

// 1. 输入重量 -> 正算金额
function handleWeightInput(weight = 0) {
  form.weight = weight;
  // 变动金额 = 重量 * 单价
  form.amount = Number((weight * orderInfo.unitPrice).toFixed(2));
}

// 2. 输入金额 -> 反算重量
function handleAmountInput(amount = 0) {
  form.amount = amount;
  form.weight = orderInfo.unitPrice > 0 ? Number((amount / orderInfo.unitPrice).toFixed(2)) : 0;
}

// 切换补重/扣重模式
function handleTypeChange() {
  // 切换类型时限制扣重不能超过原重量
  if (form.operateType === 1 && form.weight > orderInfo.weight) {
    handleWeightInput(orderInfo.weight);
  }
}

async function handleSubmit() {
  if (form.weight <= 0) {
    ElMessage.warning('请输入大于 0 的操作重量');
    return;
  }

  const actionText = form.operateType === 0 ? '补重' : '扣重';
  const confirmMsg = `确定要对订单进行【${actionText} ${form.weight} kg】吗？预计变动金额 ¥ ${form.amount.toFixed(2)}`;

  try {
    await ElMessageBox.confirm(confirmMsg, '二次确认', {
      type: 'warning',
      confirmButtonText: '确定提交',
      cancelButtonText: '取消',
    });

    loading.value = true;
    await weightOperateApi({
      recycleOrderId: form.recycleOrderId,
      operateType: form.operateType,
      weight: form.weight,
    });

    ElMessage.success(`${actionText}成功`);
    visible.value = false;
    emit('success');
  } catch {
    // 取消提交
  } finally {
    loading.value = false;
  }
}

function handleClose() {
  visible.value = false;
}

defineExpose({ open });
</script>

<template>
  <el-dialog
v-model="visible" title="订单补重 / 扣重处理" width="500px" append-to-body :close-on-click-modal="false"
    @close="handleClose"
>
    <el-form :model="form" label-width="110px" class="custom-form">
      <!-- 操作类型 -->
      <el-form-item label="操作类型" required>
        <el-radio-group v-model="form.operateType" @change="handleTypeChange">
          <el-radio-button :value="0">+ 补重</el-radio-button>
          <el-radio-button :value="1">- 扣重</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <!-- 操作重量 -->
      <el-form-item :label="`${form.operateType === 0 ? '补重' : '扣重'}重量`" required>
        <el-input-number
v-model="form.weight" :min="0" :max="form.operateType === 1 ? orderInfo.weight : 999"
          :precision="2" :step="0.1" placeholder="请输入重量" class="full-width" @change="handleWeightInput"
>
          <template #suffix>kg</template>
        </el-input-number>
      </el-form-item>

      <!-- 变动金额 (支持双向联动) -->
      <el-form-item :label="`预估${form.operateType === 0 ? '补发' : '扣除'}金额`">
        <el-input-number
v-model="form.amount" :min="0" :precision="2" :step="0.01" placeholder="0.00"
          class="full-width" @change="handleAmountInput"
>
          <template #prefix>¥</template>
        </el-input-number>
      </el-form-item>

      <!-- 运算预览面板 -->
      <div class="calc-preview-card">
        <div class="preview-row">
          <span class="label">调整后总重量：</span>
          <span class="value">
            {{ orderInfo.weight }} {{ form.operateType === 0 ? '+' : '-' }} {{ form.weight }} =
            <strong class="highlight-text">{{ calcAfterWeight }} kg</strong>
          </span>
        </div>
        <div class="preview-row">
          <span class="label">调整后预估金额：</span>
          <span class="value">
            ¥ {{ orderInfo.realAmount.toFixed(2) }} {{ form.operateType === 0 ? '+' : '-' }} ¥ {{ form.amount.toFixed(2)
            }} =
            <strong class="highlight-text">¥ {{ calcAfterAmount.toFixed(2) }}</strong>
          </span>
        </div>
      </div>

      <!-- 底部订单基本参数提示 -->
      <div class="bottom-info-bar">
        <span class="info-item">
          <el-icon class="info-icon">
            <InfoFilled />
          </el-icon>
          原投递量 <strong class="text-gray-700 ml-0.5">{{ orderInfo.weight }} kg</strong>
        </span>
        <span class="divider">|</span>
        <span class="info-item">
          <el-icon class="info-icon">
            <InfoFilled />
          </el-icon>
          单价 <strong class="text-gray-700 ml-0.5">{{ orderInfo.unitPrice }} 元/kg</strong>
        </span>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定提交</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.custom-form {
  :deep(.el-form-item) {
    margin-bottom: 18px;
  }
}

.full-width {
  width: 100%;

  :deep(.el-input__inner) {
    text-align: left;
  }
}

/* 变更前后计算卡片 */
.calc-preview-card {
  padding: 12px 16px;
  margin-bottom: 16px;
  background-color: var(--el-fill-color-light);
  border: 1px dashed var(--el-border-color);
  border-radius: var(--el-border-radius-base);

  .preview-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    line-height: 24px;
    color: var(--el-text-color-regular);

    .highlight-text {
      font-size: 14px;
      color: var(--el-color-primary);
    }
  }
}

/* 底部提示条 */
.bottom-info-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);

  .info-item {
    display: flex;
    gap: 4px;
    align-items: center;

    .info-icon {
      font-size: 13px;
      color: var(--el-text-color-placeholder);
    }
  }

  .divider {
    color: var(--el-border-color);
  }
}
</style>
