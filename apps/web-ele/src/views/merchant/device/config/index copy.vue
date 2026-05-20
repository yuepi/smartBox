<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Delete, Plus, Edit } from '@element-plus/icons-vue';
import { Page } from '@vben/common-ui';

import {
  getDeviceConfigPageApi,
  getDeviceConfigDetailApi,
  addDeviceConfigApi,
  editDeviceConfigApi,
  deleteDeviceConfigApi,
  type DeviceConfig,
  type DeviceConfigPageParams,
} from '#/api/device/deviceConfig';

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<DeviceConfig[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 表单弹窗控制
const formVisible = ref(false);
const formTitle = ref('');
const formData = ref<Partial<DeviceConfig>>({});
const formSubmitting = ref(false);

// 品牌选项
const brandOptions = [
  { label: '傻瓜环保', value: 0 },
];

// 灯光类型选项
const lightTypeOptions = [
  { label: '定时', value: 0 },
  { label: '感应', value: 1 },
  { label: '常亮', value: 2 },
];

// 状态选项
const statusOptions = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
];

// 查询参数
const queryParams = reactive<DeviceConfigPageParams>({
  pageNo: 1,
  pageSize: 10,
  configName: undefined,
  deviceBrand: undefined,
  status: undefined,
});

// --- 辅助函数 ---
function getLightTypeText(type: number): string {
  const map: Record<number, string> = { 0: '定时', 1: '感应', 2: '常亮' };
  return map[type] || '未知';
}

function getStatusText(status: number): string {
  return status === 0 ? '启用' : '禁用';
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getDeviceConfigPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// --- 新增/编辑 ---
function handleAdd() {
  formTitle.value = '新增设备配置';
  formData.value = {
    status: 0,
    deviceBrand: 0,
    fullWeightThreshold: 100,
    waitTime: 10,
    shutDoorTime: 5,
    logoutTime: 30,
    lightType: 0,
    lightStartTime: '18:00:00',
    lightEndTime: '06:00:00',
  };
  formVisible.value = true;
}

async function handleEdit(row: DeviceConfig) {
  try {
    formTitle.value = '编辑设备配置';
    const res = await getDeviceConfigDetailApi(row.deviceConfigId);
    formData.value = res || {};
    formVisible.value = true;
  } catch {
    ElMessage.error('获取配置信息失败');
  }
}

async function handleSubmit() {
  if (!formData.value.configName?.trim()) {
    ElMessage.warning('请输入配置名称');
    return;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.deviceConfigId ? editDeviceConfigApi : addDeviceConfigApi;
    await api(formData.value);
    ElMessage.success(formData.value.deviceConfigId ? '修改成功' : '新增成功');
    formVisible.value = false;
    handleQuery();

  } catch {
    ElMessage.error('操作失败');
  } finally {
    formSubmitting.value = false;
  }
}

// --- 删除 ---
async function handleDelete(row?: DeviceConfig) {
  let ids: number[] = [];

  if (row) {
    ids = [row.deviceConfigId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${ids.length} 条配置吗？`, '提示', { type: 'warning' });

    for (const id of ids) {
      await deleteDeviceConfigApi(id);
    }

    ElMessage.success(`成功删除 ${ids.length} 条配置`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: DeviceConfig[]) {
  selectedIds.value = selection.map((item) => item.deviceConfigId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.configName = undefined;
  queryParams.deviceBrand = undefined;
  queryParams.status = undefined;
  queryParams.pageNo = 1;
  loadData();
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <!-- 查询表单 -->
      <el-card shadow="never" class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="配置名称">
            <el-input v-model="queryParams.configName" placeholder="请输入配置名称" clearable style="width: 180px"
              @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="设备品牌">
            <el-select v-model="queryParams.deviceBrand" placeholder="全部" clearable style="width: 120px">
              <el-option v-for="item in brandOptions" :key="item.value" :label="item.label" :value="item.value" />
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
          <el-table-column prop="deviceConfigId" label="配置ID" width="80" align="center" />
          <el-table-column prop="configName" label="配置名称" min-width="150" align="left" />
          <el-table-column prop="fullWeightThreshold" label="满仓阈值(kg)" min-width="120" align="center">
            <template #default="{ row }">
              {{ row.fullWeightThreshold }} kg
            </template>
          </el-table-column>
          <el-table-column prop="waitTime" label="等待时间(秒)" min-width="110" align="center">
            <template #default="{ row }">
              {{ row.waitTime }} s
            </template>
          </el-table-column>
          <el-table-column prop="lightType" label="灯光类型" width="100" align="center">
            <template #default="{ row }">
              {{ getLightTypeText(row.lightType) }}
            </template>
          </el-table-column>
          <el-table-column prop="lightStartTime" label="灯光开始" width="150" align="center" />
          <el-table-column prop="lightEndTime" label="灯光结束" width="150" align="center" />
          <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 0 ? 'success' : 'danger'" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right" align="center">
            <template #default="{ row }">
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
    <el-dialog v-model="formVisible" :title="formTitle" width="600px" append-to-body>
      <el-form :model="formData" label-width="120px">
        <el-form-item label="配置名称" required>
          <el-input v-model="formData.configName" placeholder="请输入配置名称" />
        </el-form-item>
        <el-form-item label="设备品牌">
          <el-select v-model="formData.deviceBrand" placeholder="请选择" style="width: 100%">
            <el-option v-for="item in brandOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="满仓重量阈值">
              <el-input-number v-model="formData.fullWeightThreshold" :min="0" :max="1000" style="width: 100%" />
              <span class="ml-1">kg</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="等待时间">
              <el-input-number v-model="formData.waitTime" :min="0" :max="60" style="width: 100%" />
              <span class="ml-1">秒</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="关门延时">
              <el-input-number v-model="formData.shutDoorTime" :min="0" :max="30" style="width: 100%" />
              <span class="ml-1">秒</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="退出延时">
              <el-input-number v-model="formData.logoutTime" :min="0" :max="60" style="width: 100%" />
              <span class="ml-1">秒</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="灯光类型">
          <el-radio-group v-model="formData.lightType">
            <el-radio v-for="item in lightTypeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="灯光开始时间">
              <el-time-select v-model="formData.lightStartTime" start="00:00:00" step="00:30:00" end="23:59:59"
                placeholder="选择时间" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="灯光结束时间">
              <el-time-select v-model="formData.lightEndTime" start="00:00:00" step="00:30:00" end="23:59:59"
                placeholder="选择时间" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
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
  </Page>
</template>