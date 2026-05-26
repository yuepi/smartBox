<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

import { Page } from "@vben/common-ui";

import {
  Delete,
  Edit,
  Link,
  Plus,
  Refresh,
  Search,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import {
  type DeviceHatch,
  getDeviceHatchListApi,
} from "#/api/device/deviceHatch";
import {
  addDevicePackageApi,
  deleteDevicePackageApi,
  type DevicePackage,
  type DevicePackagePageParams,
  editDevicePackageApi,
  getDevicePackageDetailApi,
  getDevicePackagePageApi,
} from "#/api/device/devicePackage";
import {
  hatchBindPackageApi,
  hatchBindPackagePageApi,
  type HatchBindPackageRecord,
  hatchUnBindPackageApi,
} from "#/api/device/devicePackage";
import ExportFieldSelector from "#/components/ExportFieldSelector/index.vue";
import { useDicts } from "#/hooks/useDict";
import { ModuleCodeMap, useExport } from "#/hooks/useExport";
const { exporting, exportData } = useExport(ModuleCodeMap.PACKAGE);

import ColumnSelector from "#/components/ColumnSelector/index.vue";
import {
  defaultPackageColumns,
  PACKAGE_STORAGE_KEY,
  type TableColumnConfig,
} from "#/constants/tableColumns";

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultPackageColumns]);

// 组件内部会处理 localStorage，页面只需要监听 update:columns
function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

// 可见的数据列（不包含选择列和操作列）
const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// 可导出的字段
const getExportableFields = computed(() => {
  return visibleColumns.value.map((col) => ({
    prop: col.key,
    label: col.label,
  }));
});

// 导出字段选择弹窗
const exportFieldVisible = ref(false);
const exportFields = ref<{ label: string; prop: string }[]>([]);

function openExportSelector() {
  exportFields.value = getExportableFields.value;
  exportFieldVisible.value = true;
}

async function handleExportConfirm(selectedFields: string[]) {
  await exportData(queryParams, selectedFields);
}

const { package_type, order_status } = useDicts([
  "package_type",
  "order_status",
]);

// --- 绑定弹窗相关状态 ---
const bindDialogVisible = ref(false);
const bindLoading = ref(false);
const currentPackage = ref<DevicePackage | null>(null);
const bindForm = reactive({
  deviceHatchIds: [] as number[],
});

// 仓口列表（用于绑定时选择）
const hatchList = ref<DeviceHatch[]>([]);
const hatchLoading = ref(false);

// 已绑定仓口列表
const boundHatchList = ref<HatchBindPackageRecord[]>([]);
const boundHatchTotal = ref(0);
const boundHatchLoading = ref(false);
const boundHatchPage = reactive({
  pageNo: 1,
  pageSize: 10,
});

// --- 加载仓口列表（用于绑定）---
async function loadHatchList() {
  try {
    hatchLoading.value = true;
    const res = await getDeviceHatchListApi({ status: 0 });
    // 过滤掉已绑定计费套餐的仓口
    const boundIds = new Set(
      boundHatchList.value.map((item) => item.deviceHatchId)
    );
    hatchList.value = (res || []).filter(
      (hatch: DeviceHatch) => !boundIds.has(hatch.deviceHatchId)
    );
  } catch (error) {
    console.error("加载仓口列表失败:", error);
    ElMessage.error("加载仓口列表失败");
  } finally {
    hatchLoading.value = false;
  }
}

// --- 加载已绑定的仓口列表 ---
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
  } catch (error) {
    console.error("加载已绑定仓口失败:", error);
    ElMessage.error("加载已绑定仓口失败");
  } finally {
    boundHatchLoading.value = false;
  }
}

// --- 打开绑定弹窗 ---
async function handleOpenBindDialog(row: DevicePackage) {
  currentPackage.value = row;
  bindForm.deviceHatchIds = [];
  boundHatchPage.pageNo = 1;
  await loadBoundHatchList();
  await loadHatchList();
  bindDialogVisible.value = true;
}

// --- 提交绑定 ---
async function handleBindSubmit() {
  if (!currentPackage.value) return;
  if (bindForm.deviceHatchIds.length === 0) {
    ElMessage.warning("请选择要绑定的仓口");
    return;
  }

  bindLoading.value = true;
  try {
    await hatchBindPackageApi({
      deviceHatchIds: bindForm.deviceHatchIds,
      devicePackageId: currentPackage.value.devicePackageId,
    });
    ElMessage.success(`成功绑定 ${bindForm.deviceHatchIds.length} 个仓口`);
    bindDialogVisible.value = false;
    // 刷新已绑定列表
    await loadBoundHatchList();
    // 刷新主列表（如果需要显示绑定数量）
    handleQuery();
  } catch {
    ElMessage.error("绑定失败");
  } finally {
    bindLoading.value = false;
  }
}

// --- 解绑仓口 ---
async function handleUnbindHatch(record: HatchBindPackageRecord) {
  if (!currentPackage.value) return;

  try {
    await ElMessageBox.confirm(
      `确定要解除【${record.deviceName}】-【${record.hatchName}】的计费标准绑定吗？`,
      "提示",
      { type: "warning" }
    );

    await hatchUnBindPackageApi({
      deviceHatchIds: [record.deviceHatchId],
      devicePackageId: currentPackage.value.devicePackageId,
    });
    ElMessage.success("解绑成功");
    // 刷新已绑定列表
    await loadBoundHatchList();
    await loadHatchList();
  } catch {
    // 取消解绑
  }
}

// --- 绑定弹窗分页变化 ---
function handleBoundHatchPageChange() {
  loadBoundHatchList();
}

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<DevicePackage[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 表单弹窗控制
const formVisible = ref(false);
const formTitle = ref("");
const formData = ref<Partial<DevicePackage>>({});
const formSubmitting = ref(false);

// 计费类型选项
const packageTypeOptions = [
  { label: "混合", value: 0, color: "info" },
  { label: "织物", value: 1, color: "primary" },
  { label: "金属", value: 2, color: "warning" },
  { label: "塑料", value: 3, color: "success" },
];

// 状态选项
const statusOptions = [
  { label: "启用", value: 0 },
  { label: "禁用", value: 1 },
];

// 查询参数
const queryParams = reactive<DevicePackagePageParams>({
  pageNo: 1,
  pageSize: 10,
  packageName: undefined,
  packageType: undefined,
  status: undefined,
});

// --- 辅助函数 ---
function getPackageTypeText(type: number): string {
  const map: Record<number, string> = {
    0: "混合",
    1: "织物",
    2: "金属",
    3: "塑料",
  };
  return map[type] || "未知";
}

function getPackageTypeColor(type: number): string {
  const map: Record<number, string> = {
    0: "info",
    1: "primary",
    2: "warning",
    3: "success",
  };
  return map[type] || "info";
}

function getStatusText(status: number): string {
  return status === 0 ? "启用" : "禁用";
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getDevicePackagePageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error("加载数据失败");
  } finally {
    loading.value = false;
  }
}

// --- 新增/编辑 ---
function handleAdd() {
  formTitle.value = "新增计费套餐";
  formData.value = {
    status: 0,
    packageType: 0,
    unitPrice: 0,
  };
  formVisible.value = true;
}

async function handleEdit(row: DevicePackage) {
  try {
    formTitle.value = "编辑计费套餐";
    const res = await getDevicePackageDetailApi(row.devicePackageId);
    formData.value = res || {};
    formVisible.value = true;
  } catch {
    ElMessage.error("获取套餐信息失败");
  }
}

async function handleSubmit() {
  if (!formData.value.packageName?.trim()) {
    ElMessage.warning("请输入套餐名称");
    return;
  }
  if (formData.value.unitPrice === undefined || formData.value.unitPrice < 0) {
    ElMessage.warning("请输入有效的回收单价");
    return;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.devicePackageId
      ? editDevicePackageApi
      : addDevicePackageApi;
    await api(formData.value);
    ElMessage.success(formData.value.devicePackageId ? "修改成功" : "新增成功");
    formVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    formSubmitting.value = false;
  }
}

// --- 删除 ---
async function handleDelete(row?: DevicePackage) {
  let ids: number[] = [];

  if (row) {
    ids = [row.devicePackageId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条计费套餐吗？删除后可能影响已绑定的设备仓口。`,
      "提示",
      { type: "warning" }
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
    <el-card shadow="never" class="border-none mb-4 !p-2">
      <el-form
        :inline="true"
        :model="queryParams"
        class="flex flex-wrap gap-x-2 gap-y-2 items-center"
      >
        <el-form-item class="!mb-0 !mr-2">
          <el-input
            v-model="queryParams.packageName"
            placeholder="输入套餐名称"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
               <span class="text-xs text-gray-400 font-normal mr-0.5">套餐名称:</span>
              <!-- <el-icon class="text-gray-400 mr-0.5"><Search /></el-icon> -->
            </template>
          </el-input>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-2">
          <el-select
            v-model="queryParams.packageType"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 font-normal mr-0.5">计费类型:</span>
            </template>
            <el-option
              v-for="item in packageTypeOptions"
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
              <span class="text-xs text-gray-400 font-normal mr-0.5">状态:</span>
            </template>
            <el-option
              v-for="item in statusOptions"
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
              :icon="Search"
              circle
              @click="handleQuery"
            />
          </el-tooltip>
          <el-tooltip content="重置" placement="top">
            <el-button :icon="Refresh" circle @click="resetQuery" />
          </el-tooltip>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="border-none !p-2">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <el-button type="primary" :icon="Plus" @click="handleAdd">
            新增套餐
          </el-button>
          <el-button :loading="exporting" @click="openExportSelector">
            导出
          </el-button>
          <el-button
            type="danger"
            plain
            :icon="Delete"
            :disabled="selectedIds.length === 0"
            @click="handleDelete()"
          >
            批量删除
          </el-button>
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
            :storage-key="PACKAGE_STORAGE_KEY"
            :default-columns="defaultPackageColumns"
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
        <el-table-column type="selection" width="50" align="center" />

        <el-table-column
          v-for="col in visibleColumns"
          :key="col.key"
          :prop="col.key"
          :label="col.label"
          :width="typeof col.width === 'number' ? col.width : undefined"
          :min-width="col.minWidth"
          :align="col.align || 'center'"
        >
          <template #default="{ row }">
            <template v-if="col.key === 'packageType'">
              <DictTag :options="package_type" :value="row.packageType" />
            </template>
            <template v-else-if="col.key === 'unitPrice'">
              <span class="font-semibold text-orange-500">
                ¥ {{ (row.unitPrice || 0).toFixed(2) }}
              </span>
              <span class="text-gray-400 text-xs ml-0.5">/kg</span>
            </template>
            <template v-else-if="col.key === 'status'">
              <el-tag
                :type="row.status === 0 ? 'success' : 'danger'"
                size="small"
                round
                effect="light"
              >
                {{ row.status === 0 ? "启用" : "禁用" }}
              </el-tag>
            </template>
            <template v-else>
              {{ (row as any)[col.key] ?? '-' }}
            </template>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="240" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :icon="Edit"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              link
              type="success"
              :icon="Link"
              @click="handleOpenBindDialog(row)"
            >
              绑定仓口
            </el-button>
            <el-button
              link
              type="danger"
              :icon="Delete"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
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
          background
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>
    <!-- 导出字段选择组件 -->
    <ExportFieldSelector
      v-model:visible="exportFieldVisible"
      :fields="exportFields"
      :loading="exporting"
      @confirm="handleExportConfirm"
    />
    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="formVisible"
      :title="formTitle"
      width="500px"
      append-to-body
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="套餐名称" required>
          <el-input
            v-model="formData.packageName"
            placeholder="请输入套餐名称，如：混合回收套餐"
          />
        </el-form-item>
        <el-form-item label="计费类型">
          <el-radio-group v-model="formData.packageType">
            <el-radio
              v-for="item in package_type"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="回收单价" required>
          <el-input-number
            v-model="formData.unitPrice"
            :min="0"
            :precision="2"
            :step="0.1"
            style="width: 100%"
          />
          <span class="ml-1 text-gray-400">元/千克</span>
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
        <el-button
          type="primary"
          :loading="formSubmitting"
          @click="handleSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 绑定仓口弹窗 -->
    <el-dialog
      v-model="bindDialogVisible"
      :title="`绑定仓口 - ${currentPackage?.packageName}`"
      width="1000px"
      append-to-body
    >
      <el-row :gutter="20">
        <!-- 左侧：待绑定仓口 -->
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

        <!-- 右侧：已绑定仓口列表 -->
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
                  >
                    解绑
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页 -->
            <div class="flex justify-end mt-2">
              <el-pagination
                v-model:current-page="boundHatchPage.pageNo"
                v-model:page-size="boundHatchPage.pageSize"
                :total="boundHatchTotal"
                :page-sizes="[5, 10, 20]"
                layout="total, sizes, prev, pager, next"
                size="small"
                @size-change="handleBoundHatchPageChange"
                @current-change="handleBoundHatchPageChange"
              />
            </div>
          </div>
        </el-col>
      </el-row>

      <template #footer>
        <el-button @click="bindDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="bindLoading"
          @click="handleBindSubmit"
        >
          确定绑定
        </el-button>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped>
.text-primary {
  color: #409eff;
}

.text-success {
  color: #67c23a;
}

.text-danger {
  color: #f56c6c;
}

.text-warning {
  color: #e6a23c;
}

.font-bold {
  font-weight: 600;
}

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
