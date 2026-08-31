<script lang="ts" setup>
import type { Device, DevicePageParams } from '#/api/device/device';
import type { Dept } from '#/api/system/dept';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from "@vben/common-ui";

import {
  deleteDeviceApi,
  deviceUpgradeBatchApi,
  getDevicePageApi,
  operateDeviceApi
} from '#/api/device/device';
import { getMerchantDeptListApi } from '#/api/system/dept';
import { defaultDeviceColumns, DEVICE_STORAGE_KEY } from '#/constants/tableColumns';
import { ModuleCodeMap } from "#/hooks/useExport";

import DetailModal from './detail.vue';
import DeviceImagePreview from './deviceImagePreview.vue';
import EditModal from './edit.vue';
import IpPortModal from './ipPort.vue';
import OperateModal from './operation.vue';
import QrcodeModal from './qrCode.vue';
import UpgradeModal from './upgrade.vue';

const { device_brand, device_screen, device_hatch_type, device_online_status, device_status } = useDicts([
  "device_brand",
  "device_screen",
  "device_hatch_type",
  "device_online_status",
  "device_status"
]);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultDeviceColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const detailModalRef = ref();
const editModalRef = ref();
const upgradeModalRef = ref();
const ipPortModalRef = ref();
const operateModalRef = ref();
const qrCodeModalRef = ref();
const imagePreviewRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Device[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

// 下拉选项
const deptOptions = ref<Dept[]>([]);
const batchUpgradeLoading = ref(false);

// 查询参数
const queryParams = reactive<DevicePageParams>({
  pageNo: 1,
  pageSize: 10,
  deviceName: undefined,
  deviceNo: undefined,
  onlineStatus: undefined,
  status: undefined,
  qrCode: undefined,
});

// --- 二维码 ---
function handleQrcodeShow(row: Device) {
  qrCodeModalRef.value?.showSingle(row.deviceId);
}

// --- 批量二维码操作 ---
function handleBatchQrcodeCommand(cmd: string) {
  const ids = selectedIds.value;
  if (ids.length === 0) {
    ElMessage.warning('请先选择设备');
    return;
  }
  if (cmd === 'show') {
    qrCodeModalRef.value?.showBatch(ids);
  } else if (cmd === 'download') {
    qrCodeModalRef.value?.downloadBatch(ids);
  }
}

// --- 批量升级 ---
async function handleBatchUpgrade() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请先选择要升级的设备');
    return;
  }

  try {
    const { value: ossUrl } = await ElMessageBox.prompt(
      `请填写升级文件下载地址（将向 ${selectedIds.value.length} 台设备发送升级指令）`,
      '批量升级',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        inputPlaceholder: '请输入升级文件下载地址',
        inputValidator: (val) => {
          if (!val?.trim()) {
            return '请输入升级文件下载地址';
          }
          return true;
        },
      }
    );

    batchUpgradeLoading.value = true;
    await deviceUpgradeBatchApi({
      deviceIds: selectedIds.value,
      ossUrl: ossUrl.trim(),
    });
    ElMessage.success(`已向 ${selectedIds.value.length} 台设备发送升级指令`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 用户取消或接口失败
  } finally {
    batchUpgradeLoading.value = false;
  }
}

// --- 下拉菜单 ---
function handleCommand(cmd: string, row: Device) {
  switch (cmd) {
    case "ipPort": {
      handleChangeIpPort(row);
      break;
    }
    case "operation": {
      handleOperation(row);
      break;
    }
    case "restart": {
      ElMessageBox.confirm("确认重启设备吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        await operateDeviceApi({
          deviceId: row.deviceId,
          operateType: 3,
        });
        ElMessage.success("重启指令已发送");
      });
      break;
    }
    case "upgrade": {
      handleUpgrade(row);
      break;
    }
  }
}

// --- 加载选项 ---
async function loadOptions() {
  try {
    const deptRes = await getMerchantDeptListApi({ status: 0 });
    deptOptions.value = deptRes || [];
  } catch (error) {
    console.error(error);
  }
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getDevicePageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error("加载数据失败");
  } finally {
    loading.value = false;
  }
}

// --- 详情 ---
function handleView(row: Device) {
  detailModalRef.value?.open(row);
}

// --- 新增 ---
function handleAdd() {
  editModalRef.value?.open()
}

// --- 编辑 ---
function handleEdit(row: Device) {
  editModalRef.value?.open(row)
}

function handleOperation(row: Device) {
  operateModalRef.value?.open(row);
}

function handleChangeIpPort(row: Device) {
  ipPortModalRef.value?.open(row.deviceId);
}

function handleUpgrade(row: Device) {
  upgradeModalRef.value?.open(row.deviceId);
}

function handleQuickCapture(row: Device) {
  // 传入设备ID和操作类型(13=抓拍)
  imagePreviewRef.value?.open(row.deviceId, 13);
}

function handleQuickScreenshot(row: Device) {
  // 传入设备ID和操作类型(7=截图)
  imagePreviewRef.value?.open(row.deviceId, 7);
}

// --- 删除 ---
async function handleDelete(row?: Device) {
  // eslint-disable-next-line no-useless-assignment
  let ids: number[] = [];
  if (row) {
    ids = [row.deviceId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = selectedIds.value;
  }
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${ids.length} 条设备吗？`, "提示", { type: "warning" });
    for (const id of ids) {
      await deleteDeviceApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条设备`);
    selectedIds.value = [];
    loadData();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: Device[]) {
  selectedIds.value = selection.map((item) => item.deviceId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.deviceName = undefined;
  queryParams.deviceNo = undefined;
  queryParams.onlineStatus = undefined;
  queryParams.status = undefined;
  queryParams.qrCode = undefined;
  queryParams.pageNo = 1;
  queryParams.pageSize = 10;
  loadData();
}

onMounted(() => {
  loadOptions();
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <BaseTableLayout
v-model:query-params="queryParams" v-model:more-params="moreParams" :loading="loading"
      :total="total" @search="loadData" @reset="resetQuery"
>
      <!-- 📥 基础常驻筛选项 -->
      <template #search-basic>
        <el-form-item>
          <el-tree-select
v-model="queryParams.deptId" :data="deptOptions" :props="{
            value: 'deptId',
            label: 'deptName',
            children: 'children',
          }" placeholder="请选择" clearable check-strictly style="width: 200px"
>
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">部门:</span>
            </template>
          </el-tree-select>
        </el-form-item>

        <el-form-item>
          <el-input
v-model="queryParams.deviceName" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">设备名称:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
v-model="queryParams.deviceNo" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">设备编号:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
v-model="queryParams.qrCode" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">面贴编号:</span>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-select v-model="queryParams.onlineStatus" clearable style="width: 200px">
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">在线状态:</span>
            </template>
            <el-option v-for="item in device_online_status" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.status" clearable style="width: 200px">
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">状态:</span>
            </template>
            <el-option v-for="item in device_status" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <!-- <template #search-advanced>
      </template> -->

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <el-button type="primary" plain icon="Plus" @click="handleAdd">
          新增设备
        </el-button>
        <ExportButton :module-code="ModuleCodeMap.DEVICE" :fields="visibleColumns" :find-cond="queryParams" />

        <el-button type="danger" plain icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete()">
          批量删除
        </el-button>

        <el-dropdown v-if="selectedIds.length > 0" @command="handleBatchQrcodeCommand">
          <el-button type="primary" plain>
            批量二维码
            <el-icon class="el-icon--right">
              <ArrowDown />
            </el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="show">批量展示二维码</el-dropdown-item>
              <el-dropdown-item command="download">批量下载二维码</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-button type="warning" plain icon="Upload" :disabled="selectedIds.length === 0" @click="handleBatchUpgrade">
          批量升级
        </el-button>

        <transition name="el-fade-in">
          <span v-if="selectedIds.length > 0" class="ml-2 text-sm text-gray-400">
            已选
            <span class="text-red-500 font-medium">{{ selectedIds.length }}</span>
            项
          </span>
        </transition>
      </template>

      <!-- 📥 工具栏右侧 -->
      <template #toolbar-right>
        <ColumnSelector
:storage-key="DEVICE_STORAGE_KEY" :default-columns="defaultDeviceColumns"
          @update:columns="handleColumnsUpdate"
/>
      </template>

      <!-- 📥 表格 -->
      <template #table>
        <el-table
:data="tableData" border stripe style="width: 100%; height: 100%"
          @selection-change="handleSelectionChange"
>
          <el-table-column type="selection" width="55" align="center" />

          <el-table-column
v-for="col in visibleColumns" :key="col.key" :prop="col.key" :label="col.label"
            :width="typeof col.width === 'number' ? col.width : undefined" :min-width="col.minWidth" :align="col.align"
            :show-overflow-tooltip="col.showOverflowTooltip || false" :fixed="col.fixed"
>
            <template #default="{ row }">
              <template v-if="col.key === 'deviceHatchType'">
                <DictTag :options="device_hatch_type" :value="row.deviceHatchType" />
              </template>
              <template v-else-if="col.key === 'deviceBrand'">
                <DictTag :options="device_brand" :value="row.deviceBrand" />
              </template>
              <template v-else-if="col.key === 'onlineStatus'">
                <DictTag :options="device_online_status" :value="row.onlineStatus" />
              </template>
              <template v-else-if="col.key === 'status'">
                <DictTag :options="device_status" :value="row.status" />
              </template>
              <template v-else-if="col.key === 'qrCode'">
                <div class="flex items-center justify-center gap-1">
                  <span>{{ row.qrCode || "-" }}</span>
                  <el-icon
v-if="row.qrCode" class="cursor-pointer text-primary hover:text-primary-dark" title="查看二维码"
                    @click.stop="handleQrcodeShow(row)"
>
                    <Picture />
                  </el-icon>
                </div>
              </template>
              <template v-else-if="col.key === 'screenFlag'">
                <DictTag :options="device_screen" :value="row.screenFlag" />
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right" align="center">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="info" @click="handleView(row)">
                  详情
                </el-button>
                <el-button size="small" type="primary" @click="handleEdit(row)">
                  编辑
                </el-button>
                <el-button size="small" type="warning" @click="handleQuickCapture(row)">
                  抓拍
                </el-button>
                <el-button size="small" type="warning" @click="handleQuickScreenshot(row)">
                  截图
                </el-button>
                <el-button size="small" type="danger" @click="handleDelete(row)">
                  删除
                </el-button>
                <el-dropdown @command="(cmd: string) => handleCommand(cmd, row)">
                  <el-button size="small" type="primary">
                    更多
                    <el-icon class="el-icon--right">
                      <ArrowDown />
                    </el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="restart">重启设备</el-dropdown-item>
                      <el-dropdown-item command="operation">设备操作</el-dropdown-item>
                      <el-dropdown-item command="ipPort">切换IP端口</el-dropdown-item>
                      <el-dropdown-item command="upgrade">设备升级</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <!-- ===== 弹窗 ===== -->
    <EditModal ref="editModalRef" @success="loadData" />
    <DetailModal ref="detailModalRef" />
    <UpgradeModal ref="upgradeModalRef" />
    <IpPortModal ref="ipPortModalRef" />
    <OperateModal ref="operateModalRef" />
    <QrcodeModal ref="qrCodeModalRef" />
    <DeviceImagePreview ref="imagePreviewRef" />
  </Page>
</template>
