<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Delete, Plus, Edit, Monitor, Connection } from '@element-plus/icons-vue';
import { Page } from '@vben/common-ui';

import {
  getDevicePageApi,
  getDeviceDetailApi,
  addDeviceApi,
  editDeviceApi,
  deleteDeviceApi,
  type Device,
  type DevicePageParams,
} from '#/api/device/device';

import { getDeviceConfigListApi, type DeviceConfig } from '#/api/device/deviceConfig';
import { getMerchantDeptListApi, type Dept } from '#/api/system/dept';

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Device[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 表单弹窗控制
const formVisible = ref(false);
const formTitle = ref('');
const formData = ref<Partial<Device>>({});
const formSubmitting = ref(false);

// 详情弹窗
const detailVisible = ref(false);
const detailData = ref<Device | null>(null);

// 下拉选项
const deviceConfigOptions = ref<DeviceConfig[]>([]);
const deptOptions = ref<Dept[]>([]);

// 品牌选项
const brandOptions = [
  { label: '傻瓜环保', value: 0 },
];

// 设备类型选项
const hatchTypeOptions = [
  { label: '单仓', value: 0 },
  { label: '双仓', value: 1 },
];

// 锁类型选项
const lockTypeOptions = [
  { label: '推杆', value: 0 },
  { label: '弹锁', value: 1 },
];

// 在线状态选项
const onlineStatusOptions = [
  { label: '全部', value: undefined },
  { label: '在线', value: 1 },
  { label: '离线', value: 0 },
];

// 状态选项
const statusOptions = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
];

// 查询参数
const queryParams = reactive<DevicePageParams>({
  pageNo: 1,
  pageSize: 10,
  deviceName: undefined,
  deviceNo: undefined,
  onlineStatus: undefined,
  status: undefined,
});

// --- 辅助函数 ---
function getOnlineStatusText(status: number): string {
  return status === 1 ? '在线' : '离线';
}

function getOnlineStatusType(status: number): string {
  return status === 1 ? 'success' : 'info';
}

function getStatusText(status: number): string {
  return status === 0 ? '启用' : '禁用';
}

function getHatchTypeText(type: number): string {
  return type === 0 ? '单仓' : '双仓';
}

// --- 加载选项 ---
async function loadOptions() {
  try {
    const [configRes, deptRes] = await Promise.all([
      getDeviceConfigListApi({ status: 0 }),
      getMerchantDeptListApi({ status: 0 }),
    ]);
    deviceConfigOptions.value = configRes.data || [];
    deptOptions.value = deptRes.data || [];
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
async function handleView(row: Device) {
  try {
    const res = await getDeviceDetailApi(row.deviceId);
    detailData.value = res;
    detailVisible.value = true;
  } catch {
    ElMessage.error('获取详情失败');
  }
}

// --- 新增/编辑 ---
function handleAdd() {
  formTitle.value = '新增设备';
  formData.value = {
    status: 0,
    deviceBrand: 0,
    deviceHatchType: 0,
    isVirtualHatch: 0,
    lockType: 0,
    compressor: 0,
    volume: 50,
  };
  formVisible.value = true;
}

async function handleEdit(row: Device) {
  try {
    formTitle.value = '编辑设备';
    const res = await getDeviceDetailApi(row.deviceId);
    formData.value = res || {};
    formVisible.value = true;
  } catch {
    ElMessage.error('获取设备信息失败');
  }
}

async function handleSubmit() {
  if (!formData.value.deviceName?.trim()) {
    ElMessage.warning('请输入设备名称');
    return;
  }
  if (!formData.value.deviceNo?.trim()) {
    ElMessage.warning('请输入设备编号');
    return;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.deviceId ? editDeviceApi : addDeviceApi;
    await api(formData.value);
    ElMessage.success(formData.value.deviceId ? '修改成功' : '新增成功');
    formVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    formSubmitting.value = false;
  }
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
    await ElMessageBox.confirm(`确定要删除选中的 ${ids.length} 条设备吗？`, '提示', {
      type: 'warning',
    });

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

// 表格选中变化
function handleSelectionChange(selection: Device[]) {
  selectedIds.value = selection.map((item) => item.deviceId);
}

// 搜索与重置
function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.deviceName = undefined;
  queryParams.deviceNo = undefined;
  queryParams.onlineStatus = undefined;
  queryParams.status = undefined;
  queryParams.pageNo = 1;
  loadData();
}

onMounted(() => {
  loadOptions();
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <!-- 查询表单 -->
      <el-card shadow="never" class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="设备名称">
            <el-input v-model="queryParams.deviceName" placeholder="请输入设备名称" clearable style="width: 160px"
              @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="设备编号">
            <el-input v-model="queryParams.deviceNo" placeholder="请输入设备编号" clearable style="width: 160px"
              @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="在线状态">
            <el-select v-model="queryParams.onlineStatus" placeholder="全部" clearable style="width: 100px">
              <el-option v-for="item in onlineStatusOptions" :key="item.value" :label="item.label"
                :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 100px">
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
            <el-button type="primary" plain :icon="Plus" @click="handleAdd">新增</el-button>
            <el-button type="danger" plain :icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete()">
              批量删除
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 -->
      <el-card shadow="never">
        <el-table v-loading="loading" :data="tableData" border stripe style="width: 100%"
          @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column prop="deviceId" label="设备ID" width="80" align="center" />
          <el-table-column prop="deviceName" label="设备名称" min-width="200" align="left" show-overflow-tooltip />
          <el-table-column prop="deviceNo" label="设备编号" width="150" align="center" />
          <el-table-column prop="deviceAddress" label="设备地址" min-width="180" align="center" show-overflow-tooltip />
          <el-table-column prop="deviceHatchType" label="设备类型" width="100" align="center">
            <template #default="{ row }">
              {{ getHatchTypeText(row.deviceHatchType) }}
            </template>
          </el-table-column>
          <el-table-column prop="onlineStatus" label="在线状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getOnlineStatusType(row.onlineStatus)" size="small">
                {{ getOnlineStatusText(row.onlineStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 0 ? 'success' : 'danger'" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="300" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" :icon="Monitor" @click="handleView(row)">详情</el-button>
              <el-button link type="primary" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="flex justify-end mt-4">
          <el-pagination v-model:current-page="queryParams.pageNo" v-model:page-size="queryParams.pageSize"
            :total="total" :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadData" @current-change="loadData" />
        </div>
      </el-card>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="formTitle" width="700px" append-to-body>
      <el-form :model="formData" label-width="110px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="设备名称" required>
              <el-input v-model="formData.deviceName" placeholder="请输入设备名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备编号" required>
              <el-input v-model="formData.deviceNo" placeholder="请输入设备编号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="设备品牌">
              <el-select v-model="formData.deviceBrand" placeholder="请选择" style="width: 100%">
                <el-option v-for="item in brandOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备类型">
              <el-select v-model="formData.deviceHatchType" placeholder="请选择" style="width: 100%">
                <el-option v-for="item in hatchTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属部门">
              <el-select v-model="formData.deptId" placeholder="请选择" clearable style="width: 100%">
                <el-option v-for="item in deptOptions" :key="item.deptId" :label="item.deptName" :value="item.deptId" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备配置">
              <el-select v-model="formData.deviceConfigId" placeholder="请选择" clearable style="width: 100%">
                <el-option v-for="item in deviceConfigOptions" :key="item.deviceConfigId" :label="item.configName"
                  :value="item.deviceConfigId" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="设备地址">
          <el-input v-model="formData.deviceAddress" placeholder="省市区" />
        </el-form-item>
        <el-form-item label="详细地址">
          <el-input v-model="formData.detailAddress" placeholder="详细地址（门牌号/位置）" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="经度">
              <el-input-number v-model="formData.longitude" :precision="6" :step="0.000001" placeholder="经度"
                style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="纬度">
              <el-input-number v-model="formData.latitude" :precision="6" :step="0.000001" placeholder="纬度"
                style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="客服电话">
          <el-input v-model="formData.customerPhone" placeholder="客服电话" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="formData.status">
            <el-radio :value="0">启用</el-radio>
            <el-radio :value="1">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="设备详情" width="700px" append-to-body>
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="设备ID">{{ detailData.deviceId }}</el-descriptions-item>
        <el-descriptions-item label="设备名称">{{ detailData.deviceName }}</el-descriptions-item>
        <el-descriptions-item label="设备编号">{{ detailData.deviceNo }}</el-descriptions-item>
        <el-descriptions-item label="设备品牌">{{ detailData.deviceBrand === 0 ? '傻瓜环保' : '-' }}</el-descriptions-item>
        <el-descriptions-item label="设备类型">{{ getHatchTypeText(detailData.deviceHatchType) }}</el-descriptions-item>
        <el-descriptions-item label="在线状态">
          <el-tag :type="getOnlineStatusType(detailData.onlineStatus)" size="small">
            {{ getOnlineStatusText(detailData.onlineStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="最后心跳">{{ detailData.lastHeartTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="过期时间">{{ detailData.expireTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="设备地址" :span="2">{{ detailData.deviceAddress }} {{ detailData.detailAddress
        }}</el-descriptions-item>
        <el-descriptions-item label="硬件版本">{{ detailData.hardwareVersion || '-' }}</el-descriptions-item>
        <el-descriptions-item label="软件版本">{{ detailData.softwareVersion || '-' }}</el-descriptions-item>
        <el-descriptions-item label="信号强度">{{ detailData.signal || '-' }}</el-descriptions-item>
        <el-descriptions-item label="设备音量">{{ detailData.volume || '-' }}</el-descriptions-item>
        <el-descriptions-item label="客服电话">{{ detailData.customerPhone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="detailData.status === 0 ? 'success' : 'danger'" size="small">
            {{ getStatusText(detailData.status) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </Page>
</template>