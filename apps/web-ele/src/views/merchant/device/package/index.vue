<script lang="ts" setup>
import type { DevicePackage, DevicePackagePageParams } from '#/api/device/devicePackage';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from '@vben/common-ui';

import { deleteDevicePackageApi, getDevicePackagePageApi } from '#/api/device/devicePackage';
import { defaultPackageColumns, PACKAGE_STORAGE_KEY } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

import BindDialog from './BindDialog.vue';
import PackageForm from './PackageForm.vue';

const { package_type } = useDicts(['package_type']);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultPackageColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const packageFormRef = ref();
const bindDialogRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<DevicePackage[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

// 查询参数
const queryParams = reactive<DevicePackagePageParams>({
  pageNo: 1,
  pageSize: 10,
  packageName: undefined,
  packageType: undefined,
  status: undefined,
});

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getDevicePackagePageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// --- 新增 ---
function handleAdd() {
  packageFormRef.value?.open();
}

// --- 编辑 ---
function handleEdit(row: DevicePackage) {
  packageFormRef.value?.open(row);
}

// --- 绑定 ---
function handleBind(row: DevicePackage) {
  bindDialogRef.value?.open(row);
}

// --- 删除 ---
async function handleDelete(row?: DevicePackage) {
  // eslint-disable-next-line no-useless-assignment
  let ids: number[] = [];
  if (row) {
    ids = [row.devicePackageId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条计费套餐吗？删除后可能影响已绑定的设备仓口。`,
      '提示',
      { type: 'warning' }
    );
    for (const id of ids) {
      await deleteDevicePackageApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条套餐`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: DevicePackage[]) {
  selectedIds.value = selection.map((item) => item.devicePackageId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.packageName = undefined;
  queryParams.packageType = undefined;
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
v-model="queryParams.packageName" placeholder="输入套餐名称" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">套餐名称:</span>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-select v-model="queryParams.packageType" clearable style="width: 200px">
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">计费类型:</span>
            </template>
            <el-option v-for="item in package_type" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.status" clearable style="width: 200px">
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">状态:</span>
            </template>
            <el-option label="启用" :value="0" />
            <el-option label="禁用" :value="1" />
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <!-- <template #search-advanced>
      </template> -->

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <el-button type="primary" icon="Plus" @click="handleAdd">新增套餐</el-button>
        <ExportButton :module-code="ModuleCodeMap.PACKAGE" :fields="visibleColumns" :find-cond="queryParams" />
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
:storage-key="PACKAGE_STORAGE_KEY" :default-columns="defaultPackageColumns"
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
            :width="typeof col.width === 'number' ? col.width : undefined" :min-width="col.minWidth"
            :align="col.align || 'center'"
>
            <template #default="{ row }">
              <template v-if="col.key === 'packageType'">
                <DictTag :options="package_type" :value="row.packageType" />
              </template>
              <template v-else-if="col.key === 'unitPrice'">
                <span class="font-semibold text-orange-500">¥ {{ (row.unitPrice || 0).toFixed(2) }}</span>
                <span class="text-gray-400 text-sm ml-0.5">/kg</span>
              </template>
              <template v-else-if="col.key === 'status'">
                <el-tag :type="row.status === 0 ? 'success' : 'danger'" size="small" round effect="light">
                  {{ row.status === 0 ? '启用' : '禁用' }}
                </el-tag>
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right" align="center">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="handleEdit(row)">
                  编辑
                </el-button>
                <el-button size="small" type="success" @click="handleBind(row)">
                  绑定仓口
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

    <!-- ===== 弹窗们 ===== -->
    <PackageForm ref="packageFormRef" @success="handleQuery" />
    <BindDialog ref="bindDialogRef" @success="handleQuery" />
  </Page>
</template>

<style scoped>
.selected-alert-badge {
  display: inline-block;
}
</style>
