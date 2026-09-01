<script lang="ts" setup>
import type { DeviceHatch } from '#/api/device/deviceHatch';
import type { DevicePackage } from '#/api/device/devicePackage';
import type { HatchBindPackageRecord } from '#/api/device/devicePackage';

import { getDeviceHatchListApi } from '#/api/device/deviceHatch';
import {
  hatchBindPackageApi,
  hatchBindPackagePageApi,
  hatchUnBindPackageApi,
} from '#/api/device/devicePackage';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const currentPackage = ref<DevicePackage | null>(null);
const bindForm = reactive({ deviceHatchIds: [] as number[] });

// 仓口列表
const hatchList = ref<DeviceHatch[]>([]);
const hatchLoading = ref(false);

// 已绑定仓口列表
const boundHatchList = ref<HatchBindPackageRecord[]>([]);
const boundHatchTotal = ref(0);
const boundHatchLoading = ref(false);
const boundHatchPage = reactive({ pageNo: 1, pageSize: 10 });

function open(row: DevicePackage) {
  currentPackage.value = row;
  bindForm.deviceHatchIds = [];
  boundHatchPage.pageNo = 1;
  visible.value = true;
  loadBoundHatchList();
  loadHatchList();
}

async function loadHatchList() {
  try {
    hatchLoading.value = true;
    const res = await getDeviceHatchListApi({ status: 0 });
    const boundIds = new Set(
      boundHatchList.value.map((item) => item.deviceHatchId),
    );
    hatchList.value = (res || []).filter(
      (hatch: DeviceHatch) => !boundIds.has(hatch.deviceHatchId),
    );
  } finally {
    hatchLoading.value = false;
  }
}

async function loadBoundHatchList() {
  if (!currentPackage.value) return;
  try {
    boundHatchLoading.value = true;
    const res = await hatchBindPackagePageApi({
      pageNo: boundHatchPage.pageNo,
      pageSize: boundHatchPage.pageSize,
      devicePackageId: currentPackage.value.devicePackageId,
    });
    boundHatchList.value = res.records || [];
    boundHatchTotal.value = res.total || 0;
  } finally {
    boundHatchLoading.value = false;
  }
}

function handlePageChange() {
  loadBoundHatchList();
  loadHatchList();
}

async function handleBindSubmit() {
  if (!currentPackage.value) return;
  if (bindForm.deviceHatchIds.length === 0) {
    ElMessage.warning('请选择要绑定的仓口');
    return;
  }
  loading.value = true;
  try {
    await hatchBindPackageApi({
      deviceHatchIds: bindForm.deviceHatchIds,
      devicePackageId: currentPackage.value.devicePackageId,
    });
    ElMessage.success(`成功绑定 ${bindForm.deviceHatchIds.length} 个仓口`);
    bindForm.deviceHatchIds = [];
    await loadBoundHatchList();
    await loadHatchList();
    emit('success');
  } catch {
    ElMessage.error('绑定失败');
  } finally {
    loading.value = false;
  }
}

async function handleUnbindHatch(record: HatchBindPackageRecord) {
  if (!currentPackage.value) return;
  try {
    await ElMessageBox.confirm(
      `确定要解除【${record.deviceName}】-【${record.hatchName}】的计费标准绑定吗？`,
      '提示',
      { type: 'warning' },
    );
    await hatchUnBindPackageApi({
      deviceHatchIds: [record.deviceHatchId],
      devicePackageId: currentPackage.value.devicePackageId,
    });
    ElMessage.success('解绑成功');
    await loadBoundHatchList();
    await loadHatchList();
  } catch {
    // 取消解绑
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="`绑定仓口 - ${currentPackage?.packageName}`"
    width="1000px"
    append-to-body
  >
    <el-row :gutter="20">
      <!-- 左侧：待绑定 -->
      <el-col :span="12">
        <div class="bind-section">
          <div class="bind-title">待绑定仓口</div>
          <el-select
            v-model="bindForm.deviceHatchIds"
            multiple
            filterable
            placeholder="请选择要绑定的仓口"
            style="width: 100%"
            :loading="hatchLoading"
          >
            <el-option
              v-for="item in hatchList"
              :key="item.deviceHatchId"
              :label="`${item.deviceName} - ${item.hatchName}`"
              :value="item.deviceHatchId"
            />
          </el-select>
          <div class="bind-tip">提示：只能选择未绑定计费标准的仓口</div>
        </div>
      </el-col>

      <!-- 右侧：已绑定 -->
      <el-col :span="12">
        <div class="bind-section">
          <div class="bind-title">已绑定仓口</div>
          <el-table
            v-loading="boundHatchLoading"
            :data="boundHatchList"
            border
            style="width: 100%"
          >
            <el-table-column
              prop="deviceName"
              label="设备名称"
              min-width="120"
              show-overflow-tooltip
            />
            <el-table-column prop="hatchName" label="仓口名称" width="180" />
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ row }">
                <el-button
                  link
                  type="danger"
                  size="small"
                  @click="handleUnbindHatch(row)"
                  >解绑</el-button
                >
              </template>
            </el-table-column>
          </el-table>
          <div class="flex justify-end mt-2">
            <el-pagination
              v-model:current-page="boundHatchPage.pageNo"
              v-model:page-size="boundHatchPage.pageSize"
              :total="boundHatchTotal"
              :page-sizes="[5, 10, 20]"
              layout="total, sizes, prev, pager, next"
              size="small"
              @size-change="handlePageChange"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </el-col>
    </el-row>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleBindSubmit"
        >确定绑定</el-button
      >
    </template>
  </el-dialog>
</template>

<style scoped>
.bind-section {
  .bind-title {
    padding-left: 8px;
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 600;
    border-left: 3px solid #409eff;
  }

  .bind-tip {
    margin-top: 8px;
    font-size: 12px;
    color: #909399;
  }
}
</style>
