<script lang="ts" setup>
import type { RecycleOrder } from '#/api/operation/recycleOrder';

import { getImageUrlsByRecycleOrderId } from '#/api/operation/recycleOrder';

const { order_status } = useDicts(['order_status']);

const visible = ref(false);
const loading = ref(false);
const detailData = ref<null | RecycleOrder>(null);
const imageUrls = ref<string[]>([]);
const imageLoading = ref(false);

function formatAmount(amount: number): string {
  if (amount === undefined || amount === null) return '¥ 0.00';
  return `¥ ${amount.toFixed(2)}`;
}

async function loadImages(orderId: number) {
  imageLoading.value = true;
  try {
    const res = await getImageUrlsByRecycleOrderId(orderId);
    imageUrls.value = res?.length ? res : [];
  } catch {
    console.error('获取图片失败');
    imageUrls.value = [];
  } finally {
    imageLoading.value = false;
  }
}

async function open(row: RecycleOrder) {
  detailData.value = row;
  visible.value = true;
  await loadImages(row.recycleOrderId);
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="订单详情" width="750px" append-to-body>
    <el-scrollbar max-height="65vh">
      <div v-if="detailData" class="px-3 flex flex-col gap-5">
        <!-- 基础信息 -->
        <el-descriptions title="基础信息" :column="2" :border="false">
          <el-descriptions-item label="订单编号" label-class-name="text-gray-400">
            <span class="font-mono text-gray-800 select-all font-semibold">{{ detailData.orderNo }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="订单状态" label-class-name="text-gray-400">
            <DictTag :options="order_status" :value="detailData.orderStatus" />
          </el-descriptions-item>
          <el-descriptions-item label="会员名称" label-class-name="text-gray-400">
            <span class="text-gray-700">{{ detailData.memberName || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="所属小区" label-class-name="text-gray-400">
            <span class="text-gray-700">{{ detailData.deptName || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" label-class-name="text-gray-400">
            <span class="font-mono text-gray-700">{{ detailData.createdTime || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="更新时间" label-class-name="text-gray-400">
            <span class="font-mono text-gray-700">{{ detailData.updatedTime || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="备注说明" :span="2" label-class-name="text-gray-400">
            <span class="text-gray-700">{{ detailData.remark || '-' }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 硬件配置 -->
        <el-descriptions title="硬件配置" :column="2" :border="false">
          <el-descriptions-item label="设备名称" label-class-name="text-gray-400">
            <span class="text-gray-700">{{ detailData.deviceName || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="设备编号" label-class-name="text-gray-400">
            <span class="font-mono text-gray-700">{{ detailData.deviceNo || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="定位仓口" label-class-name="text-gray-400">
            <el-tag v-if="detailData.hatchNo" size="small" type="warning" effect="light">
              {{ detailData.hatchNo }}号仓
            </el-tag>
            <span v-else class="text-gray-400">-</span>
          </el-descriptions-item>
          <el-descriptions-item label="包袋编号" label-class-name="text-gray-400">
            <span class="font-mono text-gray-700">{{ detailData.deviceBagNo || '-' }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 计量结算 -->
        <el-descriptions title="计量结算" :column="3" :border="false">
          <el-descriptions-item label="投递前重量" label-class-name="text-gray-400">
            <span class="font-mono text-gray-500">{{ detailData.beforeWeight?.toFixed(2) || 0 }} kg</span>
          </el-descriptions-item>
          <el-descriptions-item label="投递重量" label-class-name="text-gray-400">
            <span class="font-mono text-gray-700">{{ detailData.weight?.toFixed(2) || 0 }} kg</span>
          </el-descriptions-item>
          <el-descriptions-item label="投递后重量" label-class-name="text-gray-400">
            <span class="font-mono text-gray-500">{{ detailData.afterWeight?.toFixed(2) || 0 }} kg</span>
          </el-descriptions-item>
          <el-descriptions-item label="回收单价" label-class-name="text-gray-400">
            <span class="font-mono text-gray-700">¥ {{ detailData.unitPrice?.toFixed(2) || 0 }}/kg</span>
          </el-descriptions-item>
          <el-descriptions-item label="有效重量" label-class-name="text-gray-400">
            <span class="font-mono text-teal-600 font-bold">{{ detailData.realWeight?.toFixed(2) || 0 }} kg</span>
          </el-descriptions-item>
          <el-descriptions-item label="预估金额" label-class-name="text-gray-400">
            <span class="font-mono text-gray-700">{{ formatAmount(detailData.estimateAmount) }}</span>
          </el-descriptions-item>
          <el-descriptions-item
label="实际金额" :span="3" label-class-name="text-gray-800 !font-bold"
            class-name="border-t border-dashed border-gray-100 pt-2 mt-1"
>
            <span class="font-mono font-black text-primary text-base">{{ formatAmount(detailData.realAmount) }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 现场凭证 -->
        <div class="mt-1">
          <div class="text-lg font-bold mb-3">现场凭证</div>
          <div v-loading="imageLoading" class="min-h-[80px]">
            <div v-if="imageUrls.length === 0 && !imageLoading">
              <el-empty description="暂无现场图片" :image-size="40" class="!py-2" />
            </div>
            <div v-else class="grid grid-cols-6 gap-2">
              <div
v-for="(url, index) in imageUrls" :key="index"
                class="aspect-square rounded border border-gray-100 overflow-hidden bg-gray-50"
>
                <el-image
:src="url" fit="cover" :preview-src-list="imageUrls" :initial-index="index" preview-teleported
                  class="w-full h-full"
>
                  <template #error>
                    <div class="flex items-center justify-center h-full text-gray-300 bg-gray-100">
                      <el-icon><Picture /></el-icon>
                    </div>
                  </template>
                </el-image>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-scrollbar>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
