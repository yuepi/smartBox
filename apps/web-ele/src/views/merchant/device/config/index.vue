<script lang="ts" setup>
import type { DeviceConfig, DeviceConfigPageParams } from '#/api/device/deviceConfig';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from '@vben/common-ui';

import { deleteDeviceConfigApi, getDeviceConfigPageApi } from '#/api/device/deviceConfig';
import { CONFIG_STORAGE_KEY, defaultConfigColumns } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

import BindDeviceDialog from './BindDeviceDialog.vue';
import ConfigForm from './ConfigForm.vue';

const { device_brand } = useDicts(['device_brand']);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultConfigColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const configFormRef = ref();
const bindDialogRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<DeviceConfig[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

// 查询参数
const queryParams = reactive<DeviceConfigPageParams>({
  pageNo: 1,
  pageSize: 10,
  configName: undefined,
  deviceBrand: undefined,
  status: undefined,
});

// --- 辅助函数 ---
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

// 打开绑定弹窗
function handleBindDevice(row: DeviceConfig) {
  bindDialogRef.value?.open(row.deviceConfigId, row.configName);
}

// --- 新增 ---
function handleAdd() {
  configFormRef.value?.open();
}

// --- 编辑 ---
function handleEdit(row: DeviceConfig) {
  configFormRef.value?.open(row);
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
    <BaseTableLayout
v-model:query-params="queryParams" v-model:more-params="moreParams" :loading="loading"
      :total="total" @search="loadData" @reset="resetQuery"
>
      <!-- 📥 基础筛选项 -->
      <template #search-basic>
        <el-form-item>
          <el-input
v-model="queryParams.configName" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">配置名称:</span>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-select v-model="queryParams.deviceBrand" clearable style="width: 200px">
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">设备品牌:</span>
            </template>
            <el-option v-for="item in device_brand" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.status" clearable style="width: 200px">
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">状态:</span>
            </template>
            <el-option
v-for="item in [{ label: '启用', value: 0 }, { label: '禁用', value: 1 }]" :key="item.value"
              :label="item.label" :value="item.value"
/>
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <!-- <template #search-advanced>
      </template> -->

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <el-button type="primary" icon="Plus" @click="handleAdd">
          新增配置
        </el-button>
        <ExportButton :module-code="ModuleCodeMap.CONFIG" :fields="visibleColumns" :find-cond="queryParams" />
        <el-button type="danger" plain icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete()">
          批量删除
        </el-button>
        <transition name="el-fade-in">
          <span v-if="selectedIds.length > 0" class="selected-alert-badge ml-2 text-sm text-gray-400">
            已选 <span class="text-red-500 font-medium">{{ selectedIds.length }}</span> 项
          </span>
        </transition>
      </template>

      <!-- 📥 工具栏右侧 -->
      <template #toolbar-right>
        <ColumnSelector
:storage-key="CONFIG_STORAGE_KEY" :default-columns="defaultConfigColumns"
          @update:columns="handleColumnsUpdate"
/>
      </template>

      <!-- 📥 表格 -->
      <template #table>
        <el-table
:data="tableData" border stripe style="width: 100%; height: 100%"
          @selection-change="handleSelectionChange"
>
          <el-table-column type="selection" width="50" align="center" />

          <el-table-column
v-for="col in visibleColumns" :key="col.key" :prop="col.key" :label="col.label"
            :width="typeof col.width === 'number' ? col.width : undefined" :min-width="col.minWidth" :align="col.align"
>
            <template #default="{ row }">
              <template v-if="col.key === 'deviceBrand'">
                <DictTag :options="device_brand" :value="row.deviceBrand" />
              </template>
              <template v-else-if="col.key === 'deliverEndTimeout'">
                {{ row.deliverEndTimeout }}s
              </template>
              <template v-else-if="col.key === 'recycleEndTimeout'">
                {{ row.recycleEndTimeout }}s
              </template>
              <template v-else-if="col.key === 'status'">
                <el-tag :type="row.status === 0 ? 'success' : 'danger'" size="small" round effect="light">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="180" fixed="right" align="center">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="handleEdit(row)">
                  编辑
                </el-button>
                <el-button size="small" type="success" @click="handleBindDevice(row)">
                  绑定
                </el-button>
                <el-button size="small" type="danger" @click="handleDelete(row)">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
      </el-table>
</template>
    </BaseTableLayout>

    <!-- ===== 弹窗 ===== -->
    <ConfigForm ref="configFormRef" @success="loadData" />

    <!-- ===== 绑定设备弹窗 ===== -->
    <BindDeviceDialog ref="bindDialogRef" @success="loadData" />
  </Page>
</template>

<style scoped lang="scss">
.selected-alert-badge {
  display: inline-block;
}
</style>
