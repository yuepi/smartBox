<script lang="ts" setup>
import type { Device, DevicePageParams } from '#/api/device/device';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ArrowDown,
  OfficeBuilding,
  Picture,
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteDeviceApi,
  getDevicePageApi,
  operateDeviceApi,
} from '#/api/device/device';
import { getMerchantDeptListApi } from '#/api/system/dept';

import DetailModal from './detail.vue';
import EditModal from './edit.vue';
import IpPortModal from './ipPort.vue';
import OperationModal from './operation.vue';
import QrcodeModal from './qrCode.vue';
import UpgradeModal from './upgrade.vue';

// 本地列配置存储 Key[cite: 4]
const DEVICE_STORAGE_KEY = 'device_table_columns';

// 字典 Hook[cite: 4]
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

const deptOptions = ref<any[]>([]);

// 弹窗组件 Ref 引用[cite: 4]
const editModalRef = ref();
const detailModalRef = ref();
const qrcodeModalRef = ref();
const ipPortModalRef = ref();
const upgradeModalRef = ref();
const operationModalRef = ref();

const selectedRowIds = ref<number[]>([]);

/**
 * 初始化 Grid 表格与 Form 搜索表单
 */
const [Grid, gridApi] = useVbenVxeGrid({
  // 1. 顶部集成搜索表单配置 (优化栅格比例，避免表单项过宽拉长)
  formOptions: {
    compact: true,
    wrapperClass: 'grid-cols-12 gap-2',
    commonConfig: {
      formItemClass: 'col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3', // 一行 4 项
    },
    schema: [
      {
        fieldName: 'deptId',
        label: '归属部门',
        component: 'TreeSelect',
        componentProps: {
          data: deptOptions,
          props: { value: 'deptId', label: 'deptName', children: 'children' },
          checkStrictly: true,
          filterable: true,
          placeholder: '请选择归属部门',
          clearable: true,
          style: { width: '100%' },
        },
      },
      {
        fieldName: 'deviceName',
        label: '设备名称',
        component: 'Input',
        componentProps: { placeholder: '请输入设备名称', clearable: true },
      },
      {
        fieldName: 'deviceNo',
        label: '设备编号',
        component: 'Input',
        componentProps: { placeholder: '请输入设备编号', clearable: true },
      },
      {
        fieldName: 'onlineStatus',
        label: '在线状态',
        component: 'Select',
        componentProps: {
          options: device_online_status,
          placeholder: '在线状态',
          clearable: true,
        },
      },
      {
        fieldName: 'status',
        label: '设备状态',
        component: 'Select',
        componentProps: {
          options: device_status,
          placeholder: '设备状态',
          clearable: true,
        },
      },
    ],
  },

  // 2. 表格全局选项（含本地存储、右键菜单、打印导出、默认10条分页）
  gridOptions: {
    id: DEVICE_STORAGE_KEY, // 绑定唯一 key，实现拖拽调整顺序与显隐持久化存本地[cite: 4]
    height: 'auto',
    align: 'center',

    // 默认分页改为 10
    pagerConfig: {
      pageSize: 10,
      pageSizes: [10, 20, 50, 100],
    },

    // 开启右键上下文菜单
    menuConfig: {
      body: {
        options: [
          [
            { code: 'copy', name: '复制单元格内容' },
            { code: 'reload', name: '刷新表格数据' },
          ],
          [
            { code: 'openDetail', name: '查看设备详情' },
            { code: 'openEdit', name: '编辑当前设备' },
          ],
        ],
      },
    },

    // 完整的默认字段列表（将 defaultDeviceColumns 完整导入并映射）[cite: 4]
    columns: [
      { type: 'checkbox', width: 50, fixed: 'left' },
      { field: 'deviceId', title: '设备ID', visible: false, width: 80 },
      {
        field: 'deviceName',
        title: '设备名称',
        visible: true,
        minWidth: 180,
        fixed: 'left',
        showOverflow: true,
      },
      { field: 'deviceNo', title: '设备编号', visible: true, width: 150 },
      {
        field: 'qrCode',
        title: '面贴编号',
        visible: true,
        width: 180,
        showOverflow: true,
        slots: { default: 'qrCode' },
      },
      {
        field: 'deviceAddress',
        title: '设备地址',
        visible: false,
        minWidth: 200,
        showOverflow: true,
      },
      {
        field: 'detailAddress',
        title: '详细地址',
        visible: true,
        minWidth: 200,
        showOverflow: true,
      },
      { field: 'merchantId', title: '所属商户ID', visible: false, width: 100 },
      { field: 'deptId', title: '小区ID', visible: false, width: 100 },
      {
        field: 'deviceConfigId',
        title: '绑定设备配置ID',
        visible: false,
        width: 120,
      },
      { field: 'provinceCode', title: '省份编码', visible: false, width: 100 },
      { field: 'provinceName', title: '省份名称', visible: false, width: 100 },
      { field: 'cityCode', title: '城市编码', visible: false, width: 100 },
      { field: 'cityName', title: '城市名称', visible: false, width: 100 },
      { field: 'districtCode', title: '区县编码', visible: false, width: 100 },
      { field: 'districtName', title: '区县名称', visible: false, width: 100 },
      { field: 'longitude', title: '经度', visible: false, width: 120 },
      { field: 'latitude', title: '纬度', visible: false, width: 120 },
      {
        field: 'deviceBrand',
        title: '设备品牌',
        visible: true,
        width: 110,
        slots: { default: 'deviceBrand' },
      },
      {
        field: 'deviceHatchType',
        title: '设备类型',
        visible: true,
        width: 110,
        slots: { default: 'deviceHatchType' },
      },
      {
        field: 'isVirtualHatch',
        title: '是否虚拟多仓',
        visible: false,
        width: 110,
      },
      { field: 'lockType', title: '锁类型', visible: false, width: 100 },
      { field: 'compressor', title: '是否压缩机', visible: false, width: 100 },
      { field: 'compressorNum', title: '压缩次数', visible: false, width: 100 },
      { field: 'iccid', title: '流量卡号', visible: false, width: 150 },
      {
        field: 'hardwareVersion',
        title: '硬件版本',
        visible: false,
        width: 120,
      },
      {
        field: 'softwareVersion',
        title: '软件版本',
        visible: false,
        width: 120,
      },
      { field: 'signal', title: '信号强度', visible: false, width: 100 },
      { field: 'volume', title: '设备音量', visible: false, width: 100 },
      { field: 'logo', title: '图标地址', visible: false, width: 150 },
      { field: 'customerPhone', title: '客服电话', visible: false, width: 120 },
      { field: 'screenFlag', title: '有无屏幕', visible: false, width: 100 },
      {
        field: 'onlineStatus',
        title: '在线状态',
        visible: true,
        width: 110,
        slots: { default: 'onlineStatus' },
      },
      { field: 'onlineTime', title: '上线时间', visible: true, width: 160 },
      { field: 'offTime', title: '离线时间', visible: true, width: 160 },
      { field: 'lastHeartTime', title: '最后心跳', visible: false, width: 160 },
      { field: 'expireTime', title: '过期时间', visible: false, width: 160 },
      {
        field: 'status',
        title: '状态',
        visible: true,
        width: 100,
        slots: { default: 'status' },
      },
      { field: 'createTime', title: '创建时间', visible: false, width: 160 },
      {
        title: '操作',
        field: 'action',
        width: 190,
        fixed: 'right',
        slots: { default: 'action' },
      },
    ],

    // 自动代理 API 请求[cite: 4]
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const params: DevicePageParams = {
            pageNo: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          };
          return await getDevicePageApi(params);
        },
      },
    },

    // 工具栏配置：开启列调序与持久化存本地、打印、导出[cite: 2]
    toolbarConfig: {
      custom: {
        storage: true, // 开启把用户调整的列显示/隐藏、拖拽顺序自动存入 localStorage[cite: 3]
      },
      refresh: true,
      zoom: true,
      export: true, // 导出功能按钮[cite: 2]
      print: true, // 打印功能按钮[cite: 2]
    },
  },

  // 3. 事件监听（包含右键菜单点击逻辑）[cite: 4]
  gridEvents: {
    checkboxChange: handleSelectionChange,
    checkboxAll: handleSelectionChange,
    cellMenu({ menu, row }) {
      switch (menu.code) {
        case 'copy': {
          // 复制选中逻辑

          break;
        }
        case 'openDetail': {
          handleView(row);

          break;
        }
        case 'openEdit': {
          handleEdit(row);

          break;
        }
        case 'reload': {
          reload();

          break;
        }
        // No default
      }
    },
  },
});

/**
 * 监听多选状态更新[cite: 4]
 */
function handleSelectionChange() {
  const records = gridApi.grid?.getCheckboxRecords() || [];
  selectedRowIds.value = records.map((item: Device) => item.deviceId);
}

function reload() {
  gridApi.query();
}

async function fetchDeptOptions() {
  try {
    const res = await getMerchantDeptListApi();
    deptOptions.value = res || [];
  } catch (error) {
    console.error('获取部门数据失败:', error);
  }
}

onMounted(() => {
  fetchDeptOptions();
});

/* ================= 业务操作函数（确保弹窗传递完整的对象或 ID） ================= */

function handleAdd() {
  editModalRef.value?.open();
}

function handleEdit(row: Device) {
  // 传 ID 或者整行对象，确保弹窗有数据回显
  editModalRef.value?.open(row.deviceId || row);
}

function handleView(row: Device) {
  detailModalRef.value?.open(row.deviceId || row);
}

function handleQrcodeShow(row: Device) {
  qrcodeModalRef.value?.open(row);
}

async function handleBatchDelete() {
  if (selectedRowIds.value.length === 0) return;
  try {
    await ElMessageBox.confirm(
      `确定要批量删除这 ${selectedRowIds.value.length} 项设备吗？`,
      '警告',
      { type: 'warning' },
    );
    await deleteDeviceApi(selectedRowIds.value);
    ElMessage.success('删除成功');
    reload();
  } catch {
    // 取消
  }
}

function handleBatchUpgrade() {
  if (selectedRowIds.value.length === 0) return;
  upgradeModalRef.value?.open(selectedRowIds.value);
}

function handleCommand(command: string, row: Device) {
  switch (command) {
    case 'ipPort': {
      ipPortModalRef.value?.open(row);
      break;
    }
    case 'operation': {
      operationModalRef.value?.open(row);
      break;
    }
    case 'restart': {
      handleRestart(row);
      break;
    }
    case 'upgrade': {
      upgradeModalRef.value?.open([row.deviceId]);
      break;
    }
  }
}

async function handleRestart(row: Device) {
  try {
    await ElMessageBox.confirm(
      `确定要重启设备【${row.deviceName}】吗？`,
      '提示',
      { type: 'warning' },
    );
    await operateDeviceApi({ deviceId: row.deviceId, action: 'restart' });
    ElMessage.success('重启指令已发送');
    reload();
  } catch {
    // 取消
  }
}
</script>

<template>
  <Page auto-content-height class="device-manage-page">
    <!-- vxe-table 核心表格，集成搜索、右键菜单、工具栏（打印/导出/列个性化配置存本地） -->
    <Grid>
      <!-- 工具栏按钮组 -->
      <template #toolbar-actions>
        <el-button type="primary" plain icon="Plus" @click="handleAdd">
          新增设备
        </el-button>
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="selectedRowIds.length === 0"
          @click="handleBatchDelete"
        >
          批量删除
        </el-button>
        <el-button
          type="warning"
          plain
          icon="Upload"
          :disabled="selectedRowIds.length === 0"
          @click="handleBatchUpgrade"
        >
          批量升级
        </el-button>
      </template>

      <!-- 搜索表单自定义前缀插槽（若需要扩展更多全局筛选/前缀提示） -->
      <template #deptId-prefix>
        <el-icon class="text-gray-400"><OfficeBuilding /></el-icon>
      </template>

      <!-- 列自定义插槽：面贴二维码 preview -->
      <template #qrCode="{ row }">
        <div class="flex items-center justify-center gap-1">
          <span>{{ row.qrCode || '-' }}</span>
          <el-icon
            v-if="row.qrCode"
            class="cursor-pointer text-primary"
            @click.stop="handleQrcodeShow(row)"
          >
            <Picture />
          </el-icon>
        </div>
      </template>

      <!-- 列自定义插槽：字典标签转换 -->
      <template #deviceBrand="{ row }">
        <DictTag :options="device_brand" :value="row.deviceBrand" />
      </template>

      <template #deviceHatchType="{ row }">
        <DictTag :options="device_hatch_type" :value="row.deviceHatchType" />
      </template>

      <template #onlineStatus="{ row }">
        <DictTag :options="device_online_status" :value="row.onlineStatus" />
      </template>

      <template #status="{ row }">
        <DictTag :options="device_status" :value="row.status" />
      </template>

      <!-- 列自定义插槽：操作列 -->
      <template #action="{ row }">
        <div class="flex items-center justify-center gap-2">
          <el-button size="small" type="info" link @click="handleView(row)">
            详情
          </el-button>
          <el-button size="small" type="primary" link @click="handleEdit(row)">
            编辑
          </el-button>
          <el-dropdown @command="(cmd: string) => handleCommand(cmd, row)">
            <el-button size="small" type="primary" link>
              更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="restart">重启设备</el-dropdown-item>
                <el-dropdown-item command="operation">
                  设备操作
                </el-dropdown-item>
                <el-dropdown-item command="ipPort">切换IP端口</el-dropdown-item>
                <el-dropdown-item command="upgrade">设备升级</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </template>
    </Grid>

    <!-- 模态框组件弹窗 -->
    <EditModal ref="editModalRef" @success="reload" />
    <DetailModal ref="detailModalRef" />
    <QrcodeModal ref="qrcodeModalRef" />
    <IpPortModal ref="ipPortModalRef" @success="reload" />
    <UpgradeModal ref="upgradeModalRef" @success="reload" />
    <OperationModal ref="operationModalRef" @success="reload" />
  </Page>
</template>

<style scoped>
/* 全局微调当前页面的字体大小及表格字体大小 */
.device-manage-page :deep(.vxe-table) {
  font-size: 14px; /* 从默认较小的字号提升为标准的 14px */
}

.device-manage-page :deep(.vxe-header--column) {
  font-size: 14px;
  font-weight: 600;
}

/* 优化搜索表单组件的输入框紧凑度与字体 */
.device-manage-page :deep(.vben-form-item) {
  font-size: 14px;
}
</style>
