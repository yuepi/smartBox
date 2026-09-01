<script lang="ts" setup>
import type { Device } from '#/api/device/device';

import { getDeviceListApi } from '#/api/device/device';
import {
  deviceBindDeviceConfigApi,
  deviceBindDeviceConfigPageApi,
  deviceUnBindDeviceConfigApi,
} from '#/api/device/deviceConfig';

// ===== Emits =====
const emit = defineEmits<{
  (e: 'success'): void;
}>();

const { device_brand } = useDicts(['device_brand']);

// ===== 基础状态 =====
const visible = ref(false);
const currentConfigId = ref<number>(0);
const currentConfigName = ref('');
const submitting = ref(false);

// ===== 左侧：未绑定设备 =====
const unboundLoading = ref(false);
const unboundData = ref<Device[]>([]);
const selectedUnboundIds = ref<number[]>([]);
const unboundSearchKeyword = ref('');

// ===== 右侧：已绑定设备 =====
const boundLoading = ref(false);
const boundData = ref<Device[]>([]);
const boundTotal = ref(0);
const selectedBoundIds = ref<number[]>([]);
const boundSearchKeyword = ref('');
const boundParams = reactive({
  pageNo: 1,
  pageSize: 10,
});

// ===== 核心数据加载 =====

// 1. 加载已绑定设备（分页）
async function loadBoundDevices() {
  if (!currentConfigId.value) return;
  boundLoading.value = true;
  try {
    const res = await deviceBindDeviceConfigPageApi({
      ...boundParams,
      deviceConfigId: currentConfigId.value,
    });
    boundData.value = res.records || [];
    boundTotal.value = res.total || 0;
  } catch {
    ElMessage.error('加载已绑定设备失败');
  } finally {
    boundLoading.value = false;
  }
}

// 2. 加载未绑定设备（前端求差集 & 本地过滤）
async function loadUnboundDevices() {
  if (!currentConfigId.value) return;
  unboundLoading.value = true;
  try {
    // 💡 提示：后期后端出完未绑定接口后，直接把下面的逻辑替换为一个 API 调用即可
    // 例如：const res = await getUnboundDevicePageApi({ deviceConfigId: currentConfigId.value, keyword: unboundSearchKeyword.value })

    // ----- 临时前端兜底逻辑 Start -----
    const [allDevices, boundRes] = await Promise.all([
      getDeviceListApi({ status: 0 }),
      deviceBindDeviceConfigPageApi({
        pageNo: 1,
        pageSize: 9999, // 获取全部已绑 ID 做差集
        deviceConfigId: currentConfigId.value,
      }),
    ]);

    const boundIds = new Set(
      (boundRes.records || []).map((d: Device) => d.deviceId),
    );
    let list = (allDevices || []).filter(
      (d: Device) => !boundIds.has(d.deviceId),
    );

    // 本地搜索筛选
    if (unboundSearchKeyword.value.trim()) {
      const kw = unboundSearchKeyword.value.trim().toLowerCase();
      list = list.filter(
        (d: Device) =>
          d.deviceName?.toLowerCase().includes(kw) ||
          d.deviceNo?.toLowerCase().includes(kw),
      );
    }
    unboundData.value = list;
    // ----- 临时前端兜底逻辑 End -----
  } catch {
    ElMessage.error('加载未绑定设备失败');
  } finally {
    unboundLoading.value = false;
  }
}

// 刷新左右双栏
async function refreshAll() {
  selectedUnboundIds.value = [];
  selectedBoundIds.value = [];
  await Promise.all([loadBoundDevices(), loadUnboundDevices()]);
}

// ===== 动作操作 =====

// 打开弹窗
async function open(configId: number, configName: string) {
  currentConfigId.value = configId;
  currentConfigName.value = configName || '设备配置';
  visible.value = true;

  boundParams.pageNo = 1;
  unboundSearchKeyword.value = '';
  boundSearchKeyword.value = '';

  await refreshAll();
}

// 绑定选中设备（左 -> 右）
async function handleBind() {
  if (selectedUnboundIds.value.length === 0) return;

  try {
    submitting.value = true;
    await deviceBindDeviceConfigApi({
      deviceConfigId: currentConfigId.value,
      deviceIds: selectedUnboundIds.value,
    });
    ElMessage.success(`成功绑定 ${selectedUnboundIds.value.length} 台设备`);
    await refreshAll();
    emit('success');
  } catch {
    // 错误处理由全局拦截或静默捕获
  } finally {
    submitting.value = false;
  }
}

// 解绑选中设备（右 -> 左）
async function handleUnbind() {
  if (selectedBoundIds.value.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `确定要解绑选中的 ${selectedBoundIds.value.length} 台设备吗？`,
      '解绑确认',
      { type: 'warning' },
    );
    submitting.value = true;
    await deviceUnBindDeviceConfigApi({ deviceIds: selectedBoundIds.value });
    ElMessage.success('解绑成功');
    await refreshAll();
    emit('success');
  } catch {
    // 用户取消
  } finally {
    submitting.value = false;
  }
}

// 单行直接解绑（快捷按钮）
async function handleSingleUnbind(row: Device) {
  try {
    submitting.value = true;
    await deviceUnBindDeviceConfigApi({ deviceIds: [row.deviceId] });
    ElMessage.success('解绑成功');
    await refreshAll();
    emit('success');
  } catch {
    // 静默处理
  } finally {
    submitting.value = false;
  }
}

// 右侧搜索过滤本地数据
const filteredBoundData = computed(() => {
  if (!boundSearchKeyword.value.trim()) return boundData.value;
  const kw = boundSearchKeyword.value.trim().toLowerCase();
  return boundData.value.filter(
    (d: Device) =>
      d.deviceName?.toLowerCase().includes(kw) ||
      d.deviceNo?.toLowerCase().includes(kw),
  );
});

// 分页切换
function handleBoundPageChange() {
  loadBoundDevices();
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="`设备绑定 - ${currentConfigName}`"
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
          <span class="font-medium text-gray-700"
            >可绑定设备 ({{ unboundData.length }})</span
          >
          <span
            v-if="selectedUnboundIds.length > 0"
            class="text-xs text-primary"
          >
            已选 {{ selectedUnboundIds.length }} 台
          </span>
        </div>

        <div class="mb-3">
          <el-input
            v-model="unboundSearchKeyword"
            placeholder="搜索设备名称/编号"
            clearable
            @keyup.enter="loadUnboundDevices"
            @clear="loadUnboundDevices"
          />
        </div>

        <div class="flex-1 overflow-hidden">
          <el-table
            v-loading="unboundLoading"
            :data="unboundData"
            height="100%"
            stripe
            @selection-change="
              (val: Device[]) => {
                selectedUnboundIds = val.map((v) => v.deviceId);
              }
            "
          >
            <el-table-column type="selection" width="40" align="center" />
            <el-table-column
              prop="deviceName"
              label="设备名称"
              min-width="100"
              show-overflow-tooltip
            />
            <el-table-column
              prop="deviceNo"
              label="设备编号"
              width="150"
              show-overflow-tooltip
            />
            <el-table-column
              prop="deviceBrand"
              label="品牌"
              width="90"
              align="center"
            >
              <template #default="{ row }">
                <DictTag :options="device_brand" :value="row.deviceBrand" />
              </template>
            </el-table-column>
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
          :disabled="selectedBoundIds.length === 0"
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
          <span class="font-medium text-gray-700"
            >已绑定设备 ({{ boundTotal }})</span
          >
          <span v-if="selectedBoundIds.length > 0" class="text-xs text-danger">
            已选 {{ selectedBoundIds.length }} 台
          </span>
        </div>

        <div class="mb-3">
          <el-input
            v-model="boundSearchKeyword"
            placeholder="筛选当前页"
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
              (val: Device[]) => {
                selectedBoundIds = val.map((v) => v.deviceId);
              }
            "
          >
            <el-table-column type="selection" width="40" align="center" />
            <el-table-column
              prop="deviceName"
              label="设备名称"
              min-width="100"
              show-overflow-tooltip
            />
            <el-table-column
              prop="deviceNo"
              label="设备编号"
              width="150"
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
