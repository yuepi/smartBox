<script lang="ts" setup>
import type { DeviceHatch } from '#/api/device/deviceHatch';
import type {
  DevicePackage,
  HatchBindPackageRecord,
} from '#/api/device/devicePackage';

import { getDeviceHatchListApi } from '#/api/device/deviceHatch';
import {
  hatchBindPackageApi,
  hatchBindPackagePageApi,
  hatchUnBindPackageApi,
} from '#/api/device/devicePackage';

// ===== Emits =====
const emit = defineEmits<{
  (e: 'success'): void;
}>();

// ===== 基础状态 =====
const visible = ref(false);
const submitting = ref(false);
const currentPackage = ref<DevicePackage | null>(null);

// ===== 左侧：未绑定仓口 =====
const unboundLoading = ref(false);
const unboundData = ref<DeviceHatch[]>([]);
const selectedUnboundIds = ref<number[]>([]);
const unboundSearchKeyword = ref('');

// ===== 右侧：已绑定仓口 =====
const boundLoading = ref(false);
const boundData = ref<HatchBindPackageRecord[]>([]);
const boundTotal = ref(0);
const selectedBoundRecordIds = ref<number[]>([]);
const boundSearchKeyword = ref('');
const boundParams = reactive({
  pageNo: 1,
  pageSize: 10,
});

// ===== 核心数据加载 =====

// 1. 加载已绑定仓口（分页）
async function loadBoundHatchList() {
  if (!currentPackage.value) return;
  boundLoading.value = true;
  try {
    const res = await hatchBindPackagePageApi({
      pageNo: boundParams.pageNo,
      pageSize: boundParams.pageSize,
      devicePackageId: currentPackage.value.devicePackageId,
    });
    boundData.value = res.records || [];
    boundTotal.value = res.total || 0;
  } catch {
    ElMessage.error('加载已绑定仓口失败');
  } finally {
    boundLoading.value = false;
  }
}

// 2. 加载未绑定仓口（前端求差集 & 本地过滤）
async function loadUnboundHatchList() {
  if (!currentPackage.value) return;
  unboundLoading.value = true;
  try {
    // ----- 前端求差集逻辑 Start -----
    const [allHatches, boundRes] = await Promise.all([
      getDeviceHatchListApi({ status: 0 }),
      hatchBindPackagePageApi({
        pageNo: 1,
        pageSize: 9999, // 查出所有已绑定的仓口做差集
        devicePackageId: currentPackage.value.devicePackageId,
      }),
    ]);

    const boundIds = new Set(
      (boundRes.records || []).map((item) => item.deviceHatchId)
    );
    let list = (allHatches || []).filter(
      (hatch: DeviceHatch) => !boundIds.has(hatch.deviceHatchId)
    );

    // 本地搜索筛选（支持搜 设备名称 或 仓口名称）
    if (unboundSearchKeyword.value.trim()) {
      const kw = unboundSearchKeyword.value.trim().toLowerCase();
      list = list.filter(
        (h: DeviceHatch) =>
          h.deviceName?.toLowerCase().includes(kw) ||
          h.hatchName?.toLowerCase().includes(kw)
      );
    }
    unboundData.value = list;
    // ----- 前端求差集逻辑 End -----
  } catch {
    ElMessage.error('加载待绑定仓口失败');
  } finally {
    unboundLoading.value = false;
  }
}

// 刷新左右双栏
async function refreshAll() {
  selectedUnboundIds.value = [];
  selectedBoundRecordIds.value = [];
  await Promise.all([loadBoundHatchList(), loadUnboundHatchList()]);
}

// ===== 动作操作 =====

// 打开弹窗
async function open(row: DevicePackage) {
  currentPackage.value = row;
  visible.value = true;

  boundParams.pageNo = 1;
  unboundSearchKeyword.value = '';
  boundSearchKeyword.value = '';

  await refreshAll();
}

// 绑定选中仓口（左 -> 右）
async function handleBind() {
  if (!currentPackage.value || selectedUnboundIds.value.length === 0) return;

  try {
    submitting.value = true;
    await hatchBindPackageApi({
      deviceHatchIds: selectedUnboundIds.value,
      devicePackageId: currentPackage.value.devicePackageId,
    });
    ElMessage.success(`成功绑定 ${selectedUnboundIds.value.length} 个仓口`);
    await refreshAll();
    emit('success');
  } catch {
    ElMessage.error('绑定失败');
  } finally {
    submitting.value = false;
  }
}

// 批量解绑选中仓口（右 -> 左）
async function handleUnbind() {
  if (!currentPackage.value || selectedBoundRecordIds.value.length === 0)
    return;

  try {
    await ElMessageBox.confirm(
      `确定要解绑选中的 ${selectedBoundRecordIds.value.length} 个仓口计费标准吗？`,
      '提示',
      { type: 'warning' }
    );
    submitting.value = true;
    await hatchUnBindPackageApi({
      deviceHatchIds: selectedBoundRecordIds.value,
      devicePackageId: currentPackage.value.devicePackageId,
    });
    ElMessage.success('解绑成功');
    await refreshAll();
    emit('success');
  } catch {
    // 取消解绑
  } finally {
    submitting.value = false;
  }
}

// 单行直接解绑（快捷按钮）
async function handleSingleUnbind(record: HatchBindPackageRecord) {
  if (!currentPackage.value) return;
  try {
    await ElMessageBox.confirm(
      `确定要解除【${record.deviceName}】-【${record.hatchName}】的计费标准绑定吗？`,
      '提示',
      { type: 'warning' }
    );
    submitting.value = true;
    await hatchUnBindPackageApi({
      deviceHatchIds: [record.deviceHatchId],
      devicePackageId: currentPackage.value.devicePackageId,
    });
    ElMessage.success('解绑成功');
    await refreshAll();
    emit('success');
  } catch {
    // 用户取消
  } finally {
    submitting.value = false;
  }
}

// 右侧本地搜索过滤当前页数据
const filteredBoundData = computed(() => {
  if (!boundSearchKeyword.value.trim()) return boundData.value;
  const kw = boundSearchKeyword.value.trim().toLowerCase();
  return boundData.value.filter(
    (item: HatchBindPackageRecord) =>
      item.deviceName?.toLowerCase().includes(kw) ||
      item.hatchName?.toLowerCase().includes(kw)
  );
});

// 右侧分页切换
function handleBoundPageChange() {
  loadBoundHatchList();
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="`绑定仓口 - ${currentPackage?.packageName || ''}`"
    width="1200px"
    append-to-body
    destroy-on-close
    @close="visible = false"
  >
    <div class="transfer-container flex items-center gap-4">
      <div
        class="panel flex-1 border border-gray-200 rounded p-3 flex flex-col h-[520px]"
      >
        <div
          class="panel-header flex items-center justify-between mb-3 pb-2 border-b"
        >
          <span class="font-medium text-gray-700">待绑定仓口 ({{ unboundData.length }})</span>
          <span
            v-if="selectedUnboundIds.length > 0"
            class="text-xs text-primary"
          >
            已选 {{ selectedUnboundIds.length }} 个
          </span>
        </div>

        <div class="mb-3">
          <el-input
            v-model="unboundSearchKeyword"
            placeholder="搜索设备名称/仓口名称"
            clearable
            @keyup.enter="loadUnboundHatchList"
            @clear="loadUnboundHatchList"
          />
        </div>

        <div class="flex-1 overflow-hidden">
          <el-table
            v-loading="unboundLoading"
            :data="unboundData"
            height="100%"
            stripe
            @selection-change="
              (val: DeviceHatch[]) => {
                selectedUnboundIds = val.map((v) => v.deviceHatchId);
              }
            "
          >
            <el-table-column type="selection" width="40" align="center" />
            <el-table-column
              prop="deviceName"
              label="设备名称"
              min-width="120"
              show-overflow-tooltip
            />
            <el-table-column
              prop="hatchName"
              label="仓口名称"
              min-width="120"
              show-overflow-tooltip
            />
          </el-table>
        </div>
      </div>

      <div class="flex flex-col gap-3 justify-center items-center px-1">
        <el-button
          type="primary"
          :disabled="selectedUnboundIds.length === 0"
          :loading="submitting"
          @click="handleBind"
        >
          绑定 <el-icon class="el-icon--right"><ArrowRight /></el-icon>
        </el-button>

        <el-button
          type="danger"
          plain
          :disabled="selectedBoundRecordIds.length === 0"
          :loading="submitting"
          @click="handleUnbind"
        >
          <el-icon class="el-icon--left"><ArrowLeft /></el-icon> 解绑
        </el-button>
      </div>

      <div
        class="panel flex-1 border border-gray-200 rounded p-3 flex flex-col h-[520px]"
      >
        <div
          class="panel-header flex items-center justify-between mb-3 pb-2 border-b"
        >
          <span class="font-medium text-gray-700">已绑定仓口 ({{ boundTotal }})</span>
          <span
            v-if="selectedBoundRecordIds.length > 0"
            class="text-xs text-danger"
          >
            已选 {{ selectedBoundRecordIds.length }} 个
          </span>
        </div>

        <div class="mb-3">
          <el-input
            v-model="boundSearchKeyword"
            placeholder="筛选当前页设备/仓口"
            clearable
          />
        </div>

        <div class="flex-1 overflow-hidden">
          <el-table
            v-loading="boundLoading"
            :data="filteredBoundData"
            height="100%"
            stripe
            @selection-change="
              (val: HatchBindPackageRecord[]) => {
                selectedBoundRecordIds = val.map((v) => v.deviceHatchId);
              }
            "
          >
            <el-table-column type="selection" width="40" align="center" />
            <el-table-column
              prop="deviceName"
              label="设备名称"
              min-width="120"
              show-overflow-tooltip
            />
            <el-table-column
              prop="hatchName"
              label="仓口名称"
              min-width="120"
              show-overflow-tooltip
            />
            <el-table-column
              label="操作"
              width="60"
              align="center"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  link
                  type="danger"
                  size="small"
                  :loading="submitting"
                  @click="handleSingleUnbind(row)"
                >
                  解绑
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="mt-2 pt-2 border-t flex justify-end">
          <el-pagination
            v-model:current-page="boundParams.pageNo"
            v-model:page-size="boundParams.pageSize"
            :total="boundTotal"
            layout="total, prev, pager, next"
            size="small"
            @current-change="handleBoundPageChange"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.transfer-container :deep(.el-table .el-table__cell) {
  padding: 6px 0;
}
</style>
