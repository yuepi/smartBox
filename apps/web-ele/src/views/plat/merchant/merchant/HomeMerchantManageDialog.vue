<script lang="ts" setup>
import type { HomeMerchantRelation, RelationType } from '#/api/system/homeMerchant';
import type { Merchant } from '#/api/system/merchant';

import { reactive, ref } from 'vue';

import { ElMessage, ElMessageBox } from 'element-plus';

import {
  bindHomeMerchantRelationApi,
  getHomeMerchantListApi,
  getHomeMerchantRelationListApi,
  unbindHomeMerchantRelationApi,
} from '#/api/system/homeMerchant';

const emit = defineEmits(['success']);

const visible = ref(false);
const loading = ref(false);
const submitLoading = ref(false);

// 当前回收商户
const currentMerchant = ref<Merchant>();

// 已绑定的家政商户列表
const boundList = ref<HomeMerchantRelation[]>([]);

// 可选的家政商户下拉数据（所有启用中的家政商户）
const homeMerchantOptions = ref<any[]>([]);

// 新增绑定表单
const addForm = reactive<{
  homeMerchantId: number | undefined;
  relationType: RelationType;
}>({
  homeMerchantId: undefined,
  relationType: 0,
});

// 映射合作类型文字
function getRelationTypeText(type: RelationType) {
  const map: Record<RelationType, string> = {
    0: '普通合作',
    1: '独家',
    2: '平台推荐',
  };
  return map[type] ?? '未知';
}

function getRelationTagType(type: RelationType) {
  const map: Record<RelationType, '' | 'success' | 'warning'> = {
    0: '',
    1: 'success',
    2: 'warning',
  };
  return map[type] ?? '';
}

// 刷新数据（绑定列表 + 家政商户下拉）
async function loadData() {
  if (!currentMerchant.value?.merchantId) return;
  
  loading.value = true;
  try {
    const [boundData, optionsData] = await Promise.all([
      getHomeMerchantRelationListApi(currentMerchant.value.merchantId),
      getHomeMerchantListApi(),
    ]);

    boundList.value = boundData?.records || [];
    homeMerchantOptions.value = optionsData || [];
  } catch (error) {
    console.error(error);
    ElMessage.error('获取关联数据失败');
  } finally {
    loading.value = false;
  }
}

// 打开弹窗
async function open(row: Merchant) {
  currentMerchant.value = row;
  resetForm();
  visible.value = true;
  await loadData();
}

// 重置表单
function resetForm() {
  addForm.homeMerchantId = undefined;
  addForm.relationType = 0;
}

// 执行绑定操作
async function handleBind() {
  if (!addForm.homeMerchantId) {
    ElMessage.warning('请选择需要绑定的家政商户');
    return;
  }

  submitLoading.value = true;
  try {
    await bindHomeMerchantRelationApi({
      recycleMerchantId: currentMerchant.value.merchantId,
      housekeepingMerchantId: addForm.homeMerchantId,
      relationType: addForm.relationType,
    });

    ElMessage.success('绑定成功');
    resetForm();
    await loadData(); // 刷新列表
    emit('success');
  } finally {
    submitLoading.value = false;
  }
}

// 解除绑定
async function handleUnbind(row: HomeMerchantRelation) {
  try {
    await ElMessageBox.confirm(
      `确定要解除与家政商户「${row.housekeepingMerchantName}」的关联吗？`,
      '提示',
      { type: 'warning' },
    );

    await unbindHomeMerchantRelationApi(row.relationId);
    ElMessage.success('解绑成功');
    await loadData(); // 刷新列表
    emit('success');
  } catch {
    // 取消
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="`家政商户关联管理 - ${currentMerchant?.merchantName ?? ''}`"
    width="780px"
    append-to-body
    destroy-on-close
  >
    <div v-loading="loading" class="space-y-4">
      <!-- 1. 新增关联卡片 -->
      <el-card shadow="never" class="bg-gray-50 border-dashed">
        <template #header>
          <span class="font-bold text-sm text-gray-700">添加家政商户关联</span>
        </template>
        <el-form :inline="true" :model="addForm" class="demo-form-inline">
          <el-form-item label="家政商户" style="width: 220px">
            <el-select
              v-model="addForm.homeMerchantId"
              placeholder="选择家政商户"
              filterable
              clearable
            >
              <el-option
                v-for="item in homeMerchantOptions"
                :key="item.merchantId"
                :label="item.merchantName"
                :value="item.merchantId"
                :disabled="boundList.some((b) => b.homeMerchantId === item.merchantId)"
              >
                <span>{{ item.merchantName }}</span>
                <span
                  v-if="boundList.some((b) => b.homeMerchantId === item.merchantId)"
                  class="float-right text-gray-400 text-xs"
                >
                  已绑定
                </span>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="合作类型" style="width: 180px">
            <el-select v-model="addForm.relationType">
              <el-option label="普通合作" :value="0" />
              <el-option label="独家" :value="1" />
              <el-option label="平台推荐" :value="2" />
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              :loading="submitLoading"
              @click="handleBind"
            >
              添加关联
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 2. 已绑定家政商户列表 -->
      <div>
        <div class="mb-2 font-bold text-sm text-gray-700">
          已绑定的家政商户列表（{{ boundList.length }}）
        </div>
        <el-table :data="boundList" border stripe max-height="360px">
          <el-table-column
            prop="housekeepingMerchantName"
            label="家政商户名称"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column prop="relationType" label="合作类型" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="getRelationTagType(row.relationType)" size="small">
                {{ getRelationTypeText(row.relationType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right" align="center">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button
                  size="small"
                  type="danger"
                  @click="handleUnbind(row)"
                >
                  解绑
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
