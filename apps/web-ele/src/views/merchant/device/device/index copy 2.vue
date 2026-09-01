<script lang="ts" setup>
import type { Device, DevicePageParams } from '#/api/device/device';
import type { Dept } from '#/api/system/dept';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from '@vben/common-ui';

import {
  deleteDeviceApi,
  getDevicePageApi,
  operateDeviceApi,
} from '#/api/device/device';
import { getMerchantDeptListApi } from '#/api/system/dept';
import {
  defaultDeviceColumns,
  DEVICE_STORAGE_KEY,
} from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

import DetailModal from './detail.vue';
import EditModal from './edit.vue';
import IpPortModal from './ipPort.vue';
import OperateModal from './operation.vue';
import QrcodeModal from './qrCode.vue';
import UpgradeModal from './upgrade.vue';

const {
  device_brand,
  device_screen,
  device_hatch_type,
  device_online_status,
  device_status,
} = useDicts([
  'device_brand',
  'device_screen',
  'device_hatch_type',
  'device_online_status',
  'device_status',
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

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Device[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 下拉选项
const deptOptions = ref<Dept[]>([]);

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

// --- 下拉菜单 ---
function handleCommand(cmd: string, row: Device) {
  switch (cmd) {
    case 'ipPort': {
      handleChangeIpPort(row);
      break;
    }
    case 'operation': {
      handleOperation(row);
      break;
    }
    case 'restart': {
      ElMessageBox.confirm('确认重启设备吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(async () => {
        await operateDeviceApi({
          deviceId: row.deviceId,
          operateType: 3,
        });
        ElMessage.success('重启指令已发送');
      });
      break;
    }
    case 'upgrade': {
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
    ElMessage.error('加载数据失败');
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
  editModalRef.value?.open();
}

// --- 编辑 ---
function handleEdit(row: Device) {
  editModalRef.value?.open(row);
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

// --- 删除 ---
async function handleDelete(row?: Device) {
  let ids: number[] = [];
  if (row) {
    ids = [row.deviceId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条设备吗？`,
      '提示',
      { type: 'warning' },
    );
    for (const id of ids) {
      await deleteDeviceApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条设备`);
    selectedIds.value = [];
    handleQuery();
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
    <!-- 查询表单 -->
    <el-card shadow="never" class="border-none mb-4 !p-2">
      <el-form
        :inline="true"
        :model="queryParams"
        class="flex flex-wrap gap-x-2 gap-y-2 items-center"
      >
        <el-form-item class="!mb-0 !mr-2">
          <el-tree-select
            v-model="queryParams.deptId"
            :data="deptOptions"
            :props="{
              value: 'deptId',
              label: 'deptName',
              children: 'children',
            }"
            placeholder="请选择"
            clearable
            check-strictly
            style="width: 200px"
            class="tree-prefix-dept"
          />
        </el-form-item>

        <el-form-item class="!mb-0 !mr-2">
          <el-input
            v-model="queryParams.deviceName"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">设备名称:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-2">
          <el-input
            v-model="queryParams.deviceNo"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">设备编号:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-2">
          <el-input
            v-model="queryParams.qrCode"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">面贴编号:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-2">
          <el-select
            v-model="queryParams.onlineStatus"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">在线状态:</span>
            </template>
            <el-option
              v-for="item in device_online_status"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-2">
          <el-select
            v-model="queryParams.status"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">状态:</span>
            </template>
            <el-option
              v-for="item in device_status"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-0 md:ml-auto flex items-center gap-1">
          <el-tooltip content="查询" placement="top">
            <el-button
              type="primary"
              icon="Search"
              circle
              @click="handleQuery"
            />
          </el-tooltip>
          <el-tooltip content="重置" placement="top">
            <el-button icon="Refresh" circle @click="resetQuery" />
          </el-tooltip>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card shadow="never" class="border-none !p-2">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <el-button type="primary" icon="Plus" @click="handleAdd"
            >新增设备</el-button
          >
          <ExportButton
            :module-code="ModuleCodeMap.DEVICE"
            :fields="visibleColumns"
            :find-cond="queryParams"
          />
          <el-button
            type="danger"
            plain
            icon="Delete"
            :disabled="selectedIds.length === 0"
            @click="handleDelete()"
          >
            批量删除
          </el-button>

          <el-dropdown
            v-if="selectedIds.length > 0"
            @command="handleBatchQrcodeCommand"
          >
            <el-button type="primary" plain>
              批量二维码<el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="show"
                  >批量展示二维码</el-dropdown-item
                >
                <el-dropdown-item command="download"
                  >批量下载二维码</el-dropdown-item
                >
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <span
            v-if="selectedIds.length > 0"
            class="text-xs text-gray-400 ml-2"
          >
            已选
            <span class="text-red-500 font-medium">{{
              selectedIds.length
            }}</span>
            项
          </span>
        </div>

        <div class="flex items-center">
          <ColumnSelector
            :storage-key="DEVICE_STORAGE_KEY"
            :default-columns="defaultDeviceColumns"
            @update:columns="handleColumnsUpdate"
          />
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />

        <el-table-column
          v-for="col in visibleColumns"
          :key="col.key"
          :prop="col.key"
          :label="col.label"
          :width="typeof col.width === 'number' ? col.width : undefined"
          :min-width="col.minWidth"
          :align="col.align"
          :show-overflow-tooltip="col.showOverflowTooltip || false"
        >
          <template #default="{ row }">
            <template v-if="col.key === 'deviceHatchType'">
              <DictTag
                :options="device_hatch_type"
                :value="row.deviceHatchType"
              />
            </template>
            <template v-else-if="col.key === 'deviceBrand'">
              <DictTag :options="device_brand" :value="row.deviceBrand" />
            </template>
            <!-- 在线状态 -->
            <template v-else-if="col.key === 'onlineStatus'">
              <DictTag
                :options="device_online_status"
                :value="row.onlineStatus"
              />
            </template>

            <!-- 启用状态 -->
            <template v-else-if="col.key === 'status'">
              <DictTag :options="device_status" :value="row.status" />
            </template>
            <template v-else-if="col.key === 'qrCode'">
              <div class="flex items-center justify-center gap-1">
                <span>{{ row.qrCode || '-' }}</span>
                <el-icon
                  v-if="row.qrCode"
                  class="cursor-pointer text-primary hover:text-primary-dark"
                  title="查看二维码"
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

        <el-table-column label="操作" width="400" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                link
                type="primary"
                icon="Monitor"
                @click="handleView(row)"
                >详情</el-button
              >
              <el-button
                link
                type="primary"
                icon="Edit"
                @click="handleEdit(row)"
                >编辑</el-button
              >
              <el-button
                link
                type="danger"
                icon="Delete"
                @click="handleDelete(row)"
                >删除</el-button
              >
              <el-dropdown @command="(cmd: string) => handleCommand(cmd, row)">
                <el-button link type="primary" class="dropdown-trigger-btn">
                  更多操作<el-icon class="el-icon--right">
                    <ArrowDown />
                  </el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="restart"
                      >重启设备</el-dropdown-item
                    >
                    <el-dropdown-item command="operation"
                      >设备操作</el-dropdown-item
                    >
                    <el-dropdown-item command="ipPort"
                      >切换IP端口</el-dropdown-item
                    >
                    <el-dropdown-item command="upgrade"
                      >设备升级</el-dropdown-item
                    >
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="queryParams.pageNo"
          v-model:page-size="queryParams.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- ===== 编辑弹窗 ===== -->
    <EditModal ref="editModalRef" @success="handleQuery" />

    <!-- ===== 详情弹窗 ===== -->
    <DetailModal ref="detailModalRef" />

    <!-- ===== 设备升级弹窗 ===== -->
    <UpgradeModal ref="upgradeModalRef" />

    <!-- ===== 切换IP端口弹窗 ===== -->
    <IpPortModal ref="ipPortModalRef" />

    <!-- ===== 设备操作弹窗 ===== -->
    <OperateModal ref="operateModalRef" />

    <!-- ===== 设备二维码弹窗 ===== -->
    <QrcodeModal ref="qrCodeModalRef" />
  </Page>
</template>

<style scoped lang="scss">
.map-wrapper {
  padding: 0 8px;
}

.action-buttons {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;

  .el-button {
    margin-right: 0;
    margin-left: 0;
  }

  .dropdown-trigger-btn {
    padding: 8px 12px;
    margin: 0;
  }
}

.tree-prefix-dept :deep(.el-select__wrapper) {
  position: relative;
  padding-left: 45px !important;
}

.tree-prefix-dept :deep(.el-select__wrapper)::before {
  position: absolute;
  top: 50%;
  left: 12px;
  font-size: 12px;
  font-weight: 400;
  color: #909399;
  pointer-events: none;
  content: '部门:';
  transform: translateY(-50%);
}
</style>
