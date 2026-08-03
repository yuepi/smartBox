<script lang="ts" setup>
import type { Merchant } from '#/api/system/merchant';

import { dataMigrationApi } from '#/api/system/merchant';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const currentMerchant = ref<Merchant | null>(null);
const memberFile = ref<File | null>(null);
const orderFile = ref<File | null>(null);

function open(row: Merchant) {
  currentMerchant.value = row;
  memberFile.value = null;
  orderFile.value = null;
  visible.value = true;
}

// 文件变化时拿到 File 对象
function handleMemberFileChange(file: File) {
  memberFile.value = file;
}

function handleOrderFileChange(file: File) {
  orderFile.value = file;
}

// 移除文件
function removeMemberFile() {
  memberFile.value = null;
}

function removeOrderFile() {
  orderFile.value = null;
}

async function handleSubmit() {
  if (!memberFile.value && !orderFile.value) {
    ElMessage.warning('请至少上传一个文件（会员列表或订单）');
    return;
  }

  loading.value = true;
  try {
    const formData = new FormData();
    formData.append('merchantId', String(currentMerchant.value?.merchantId));
    if (memberFile.value) {
      formData.append('memberFile', memberFile.value);
    }
    if (orderFile.value) {
      formData.append('orderFile', orderFile.value);
    }
    await dataMigrationApi(formData);
    ElMessage.success('数据迁移成功');
    visible.value = false;
    emit('success');
  } catch {
    ElMessage.error('数据迁移失败');
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    title="数据迁移"
    width="500px"
    append-to-body
  >
    <el-form label-width="100px">
      <el-form-item label="目标商户">
        <span class="font-medium">{{ currentMerchant?.merchantName }}</span>
        <span class="text-gray-400 text-xs ml-2">(ID: {{ currentMerchant?.merchantId }})</span>
      </el-form-item>

      <el-form-item label="会员列表">
        <el-upload
          ref="memberUploadRef"
          :auto-upload="false"
          :limit="1"
          :on-change="(file: any) => handleMemberFileChange(file.raw)"
          :on-remove="removeMemberFile"
          accept=".xlsx,.xls"
          drag
          style="width: 100%"
        >
          <div class="flex flex-col items-center py-4">
            <el-icon class="text-3xl text-gray-400"><Upload /></el-icon>
            <div class="text-sm text-gray-500 mt-2">
              拖拽或点击上传会员列表文件
            </div>
            <div class="text-xs text-gray-400 mt-1">
              支持 .xlsx / .xls 格式
            </div>
          </div>
        </el-upload>
      </el-form-item>

      <el-form-item label="订单数据">
        <el-upload
          ref="orderUploadRef"
          :auto-upload="false"
          :limit="1"
          :on-change="(file: any) => handleOrderFileChange(file.raw)"
          :on-remove="removeOrderFile"
          accept=".xlsx,.xls"
          drag
          style="width: 100%"
        >
          <div class="flex flex-col items-center py-4">
            <el-icon class="text-3xl text-gray-400"><Upload /></el-icon>
            <div class="text-sm text-gray-500 mt-2">
              拖拽或点击上传订单文件
            </div>
            <div class="text-xs text-gray-400 mt-1">
              支持 .xlsx / .xls 格式
            </div>
          </div>
        </el-upload>
      </el-form-item>

      <el-form-item>
        <div class="text-yellow-600 text-sm bg-yellow-50 p-3 rounded-lg flex items-start gap-2">
          <el-icon class="mt-0.5"><Warning /></el-icon>
          <span>请确认目标商户无误，迁移后将覆盖目标商户的会员和订单数据</span>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">开始迁移</el-button>
    </template>
  </el-dialog>
</template>
