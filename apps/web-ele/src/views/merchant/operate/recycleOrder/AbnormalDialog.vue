<script lang="ts" setup>
import type { RecycleOrder } from '#/api/operation/recycleOrder';

import { abnormalOrderApi } from '#/api/operation/recycleOrder';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const currentOrder = ref<null | RecycleOrder>(null);

// 订单基础数据
const orderInfo = reactive({
  weight: 0, // 本单总重量 (kg)
  unitPrice: 0, // 单价 (元/kg)
  totalAmount: 0, // 本单总金额
});

// 表单响应式变量
const formData = reactive({
  deductAmount: 0, // 扣除环保金 (元)
  deductWeight: 0, // 扣除重量 (kg)
  reason: '',
  isAllAmountDeduct: false, // 环保金-全部扣除勾选框
  isAllWeightDeduct: false, // 重量-全部扣除勾选框
});

// 计算最大可扣金额
const maxAmount = computed(() => {
  return Number((orderInfo.weight * orderInfo.unitPrice).toFixed(2));
});

// --- 打开弹窗初始化 ---
function open(row: RecycleOrder) {
  currentOrder.value = row;
  orderInfo.weight = row.weight || 0;
  orderInfo.unitPrice = row.unitPrice || 0;
  orderInfo.totalAmount = Number(
    (orderInfo.weight * orderInfo.unitPrice).toFixed(2),
  );

  // 默认全部扣除
  formData.deductWeight = orderInfo.weight;
  formData.deductAmount = orderInfo.totalAmount;
  formData.isAllAmountDeduct = true;
  formData.isAllWeightDeduct = true;
  formData.reason = '';

  visible.value = true;
}

// 1. 修改【扣除金额】
function handleAmountInput(amount = 0) {
  // 边界限制
  if (amount > orderInfo.totalAmount) {
    amount = orderInfo.totalAmount;
  }
  if (amount < 0) {
    amount = 0;
  }

  formData.deductAmount = Number(amount.toFixed(2));

  // 反算重量 = 金额 / 单价
  if (orderInfo.unitPrice > 0) {
    const calcWeight = amount / orderInfo.unitPrice;
    formData.deductWeight = Number(
      Math.min(calcWeight, orderInfo.weight).toFixed(2),
    );
  } else {
    formData.deductWeight = 0;
  }

  // 校验是否属于全部扣除状态
  checkIsAllDeduct();
}

// 2. 修改【扣除重量】
function handleWeightInput(weight = 0) {
  // 边界限制
  if (weight > orderInfo.weight) {
    weight = orderInfo.weight;
  }
  if (weight < 0) {
    weight = 0;
  }

  formData.deductWeight = Number(weight.toFixed(2));

  // 正算金额 = 重量 × 单价
  const calcAmount = weight * orderInfo.unitPrice;
  formData.deductAmount = Number(
    Math.min(calcAmount, orderInfo.totalAmount).toFixed(2),
  );

  // 校验是否属于全部扣除状态
  checkIsAllDeduct();
}

// 检查是否勾选全扣
function checkIsAllDeduct() {
  const isFullWeight = formData.deductWeight >= orderInfo.weight;
  const isFullAmount = formData.deductAmount >= orderInfo.totalAmount;

  formData.isAllWeightDeduct = isFullWeight;
  formData.isAllAmountDeduct = isFullAmount;
}

// 3. 勾选/取消勾选【环保金-全部扣除】
function handleAllAmountChange(val: boolean | number | string) {
  const checked = Boolean(val);
  formData.isAllAmountDeduct = checked;
  if (checked) {
    formData.deductAmount = orderInfo.totalAmount;
    formData.deductWeight = orderInfo.weight;
    formData.isAllWeightDeduct = true;
  } else {
    formData.deductAmount = 0;
    formData.deductWeight = 0;
    formData.isAllWeightDeduct = false;
  }
}

// 4. 勾选/取消勾选【重量-全部扣除】
function handleAllWeightChange(val: boolean | number | string) {
  const checked = Boolean(val);
  formData.isAllWeightDeduct = checked;
  if (checked) {
    formData.deductWeight = orderInfo.weight;
    formData.deductAmount = orderInfo.totalAmount;
    formData.isAllAmountDeduct = true;
  } else {
    formData.deductWeight = 0;
    formData.deductAmount = 0;
    formData.isAllAmountDeduct = false;
  }
}

// --- 提交 ---
async function handleSubmit() {
  if (!currentOrder.value) return;

  if (!formData.reason.trim()) {
    ElMessage.warning('请输入违规原因');
    return;
  }

  loading.value = true;
  try {
    await abnormalOrderApi({
      recycleOrderId: currentOrder.value.recycleOrderId,
      remark: formData.reason,
      deductWeight: formData.deductWeight,
    });
    ElMessage.success('已标记异常成功');
    visible.value = false;
    emit('success');
  } catch {
    ElMessage.error('操作失败');
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
    v-model="visible"
    title="订单异常处理"
    width="500px"
    append-to-body
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form label-width="110px" class="custom-form">
      <!-- 扣除环保金 -->
      <el-form-item label="扣除环保金" required>
        <div class="input-with-checkbox">
          <el-input-number
            v-model="formData.deductAmount"
            :min="0"
            :max="maxAmount"
            :precision="2"
            :controls="false"
            placeholder="0.00"
            class="full-width-input"
            @change="handleAmountInput"
          />
          <div class="checkbox-wrapper">
            <el-checkbox
              v-model="formData.isAllAmountDeduct"
              @change="handleAllAmountChange"
            >
              全部扣除
            </el-checkbox>
          </div>
        </div>
      </el-form-item>

      <!-- 扣除重量 -->
      <el-form-item label="扣除重量">
        <div class="input-with-checkbox">
          <el-input-number
            v-model="formData.deductWeight"
            :min="0"
            :max="orderInfo.weight"
            :precision="2"
            :controls="false"
            placeholder="0.00"
            class="full-width-input"
            @change="handleWeightInput"
          />
          <div class="checkbox-wrapper">
            <el-checkbox
              v-model="formData.isAllWeightDeduct"
              @change="handleAllWeightChange"
            >
              全部扣除
            </el-checkbox>
          </div>
        </div>
      </el-form-item>

      <!-- 违规原因 -->
      <el-form-item label="违规原因" required>
        <el-input
          v-model="formData.reason"
          type="textarea"
          :rows="4"
          maxlength="250"
          show-word-limit
          placeholder="请输入违规原因"
        />
      </el-form-item>

      <!-- 底部订单基本参数提示（带小图标） -->
      <div class="bottom-info-bar">
        <span class="info-item">
          <el-icon class="info-icon">
            <InfoFilled />
          </el-icon>
          本单投递量
          <strong class="text-gray-700 ml-1">{{ orderInfo.weight }} kg</strong>
        </span>
        <span class="divider">|</span>
        <span class="info-item">
          <el-icon class="info-icon">
            <InfoFilled />
          </el-icon>
          本单投递单价
          <strong class="text-gray-700 ml-1"
            >{{ orderInfo.unitPrice }} 元/kg</strong
          >
        </span>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit"
        >确定</el-button
      >
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.custom-form {
  :deep(.el-form-item) {
    margin-bottom: 18px;
  }
}

/* 复合输入框：左侧输入，右侧嵌全部扣除勾选 */
.input-with-checkbox {
  display: flex;
  align-items: center;
  width: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  transition: border-color 0.2s;

  &:focus-within {
    border-color: var(--el-color-primary);
  }

  .full-width-input {
    flex: 1;

    :deep(.el-input__wrapper) {
      padding-left: 11px;
      box-shadow: none !important;
    }

    :deep(.el-input__inner) {
      text-align: left;
    }
  }

  .checkbox-wrapper {
    display: flex;
    align-items: center;
    height: 32px;
    padding: 0 12px;
    background-color: var(--el-fill-color-light);
    border-left: 1px solid var(--el-border-color-extra-light);

    :deep(.el-checkbox) {
      height: 100%;
      margin-right: 0;

      .el-checkbox__label {
        font-size: 13px;
        color: var(--el-text-color-regular);
      }
    }
  }
}

/* 底部轻量提示条 */
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
