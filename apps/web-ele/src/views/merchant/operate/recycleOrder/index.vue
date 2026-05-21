<script lang="ts" setup>
import { computed,onMounted, reactive, ref } from "vue";

import { Page } from "@vben/common-ui";

import {
  ArrowDown,
  Refresh,
  Search,
  View,
} from "@element-plus/icons-vue";
import {
  ChatDotRound,
  ScaleToOriginal,
  Warning,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import { type Device, getDeviceListApi } from "#/api/device/device";
import {
  deleteRecycleOrderApi,
  getRecycleOrderDetailApi,
  getRecycleOrderPageApi,
  OrderStatusMap,
  PayStatusMap,
  type RecycleOrder,
  type RecycleOrderPageParams,
} from "#/api/operation/recycleOrder";
import {
  abnormalOrderApi,
  remarkOperateApi,
  weightOperateApi,
} from "#/api/operation/recycleOrder";
import { type Dept, getMerchantDeptListApi } from "#/api/system/dept";
import { useDicts } from "#/hooks/useDict";
const { order_status } = useDicts(["order_status"]);
import ColumnSelector from "#/components/ColumnSelector/index.vue";
import DictTag from "#/components/DictTag/index.vue";
import ExportFieldSelector from "#/components/ExportFieldSelector/index.vue";
import {
  defaultRecycleOrderColumns,
  RECYCLE_ORDER_STORAGE_KEY,
  type TableColumnConfig,
} from "#/constants/tableColumns";
import { ModuleCodeMap, useExport } from "#/hooks/useExport";

const { exporting, exportData } = useExport(ModuleCodeMap.RECYCLE_ORDER);

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultRecycleOrderColumns]);

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

// 添加导入
import ImageGallery from "./components/ImageGallery.vue";

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<RecycleOrder[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 详情弹窗
const detailVisible = ref(false);
const detailData = ref<null | RecycleOrder>(null);

// 下拉选项
const deviceOptions = ref<Device[]>([]);
const deptOptions = ref<Dept[]>([]);

// 补重/扣重弹窗
const weightDialogVisible = ref(false);
const weightForm = reactive({
  recycleOrderId: 0,
  operateType: 0, // 0=补重,1=扣重
  weight: 0,
});
const weightSubmitting = ref(false);

// 备注弹窗
const remarkDialogVisible = ref(false);
const remarkForm = reactive({
  recycleOrderId: 0,
  remark: "",
});
const remarkSubmitting = ref(false);

// 订单状态选项
const orderStatusOptions = [
  { label: "全部", value: undefined },
  ...Object.entries(OrderStatusMap).map(([key, val]) => ({
    label: val.label,
    value: Number(key),
  })),
];

// 支付状态选项
const payStatusOptions = [
  { label: "全部", value: undefined },
  ...Object.entries(PayStatusMap).map(([key, val]) => ({
    label: val.label,
    value: Number(key),
  })),
];

// 查询参数
const queryParams = reactive<RecycleOrderPageParams>({
  pageNo: 1,
  pageSize: 10,
  orderNo: undefined,
  memberId: undefined,
  deptId: undefined,
  deviceId: undefined,
  orderStatus: undefined,
  payStatus: undefined,
});

// --- 辅助函数 ---
function getOrderStatusText(status: number): string {
  return OrderStatusMap[status]?.label || "未知";
}

function getOrderStatusType(status: number): string {
  return OrderStatusMap[status]?.type || "info";
}

function getPayStatusText(status: number): string {
  return PayStatusMap[status]?.label || "未知";
}

function getPayStatusType(status: number): string {
  return PayStatusMap[status]?.type || "info";
}

function formatAmount(amount: number): string {
  if (amount === undefined || amount === null) return "¥ 0.00";
  return `¥ ${amount.toFixed(2)}`;
}

// --- 加载选项 ---
async function loadOptions() {
  try {
    const [deviceRes, deptRes] = await Promise.all([
      getDeviceListApi({ status: 0 }),
      getMerchantDeptListApi({ status: 0 }),
    ]);
    deviceOptions.value = deviceRes || [];
    deptOptions.value = deptRes || [];
  } catch (error) {
    console.error(error);
  }
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getRecycleOrderPageApi(queryParams);
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
async function handleView(row: RecycleOrder) {
  try {
    const res = await getRecycleOrderDetailApi(row.recycleOrderId);
    detailData.value = res;
    detailVisible.value = true;
  } catch {
    ElMessage.error("获取详情失败1");
  }
}

// --- 删除 ---
async function handleDelete(row?: RecycleOrder) {
  let ids: number[] = [];

  if (row) {
    ids = [row.recycleOrderId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条订单吗？`,
      "提示",
      {
        type: "warning",
      }
    );

    for (const id of ids) {
      await deleteRecycleOrderApi(id);
    }

    ElMessage.success(`成功删除 ${ids.length} 条订单`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

// --- 异常订单 ---
async function handleAbnormal(row: RecycleOrder) {
  try {
    await ElMessageBox.confirm(
      `确定要将订单【${row.orderNo}】标记为异常吗？`,
      "异常订单",
      { type: "warning", confirmButtonText: "确定", cancelButtonText: "取消" }
    );
    await abnormalOrderApi(row.recycleOrderId);
    ElMessage.success("已标记为异常");
    handleQuery();
  } catch {
    // 取消操作
  }
}

// --- 补重/扣重 ---
function handleWeight(row: RecycleOrder) {
  weightForm.recycleOrderId = row.recycleOrderId;
  weightForm.operateType = 0;
  weightForm.weight = 0;
  weightDialogVisible.value = true;
}

async function submitWeight() {
  if (weightForm.weight <= 0) {
    ElMessage.warning("请输入重量");
    return;
  }

  const action = weightForm.operateType === 0 ? "补重" : "扣重";
  try {
    await ElMessageBox.confirm(
      `确定要对订单进行${action} ${weightForm.weight} kg 吗？`,
      "提示",
      { type: "warning" }
    );

    weightSubmitting.value = true;
    await weightOperateApi(weightForm);
    ElMessage.success(`${action}成功`);
    weightDialogVisible.value = false;
    handleQuery();
  } catch {
    // 取消操作
  } finally {
    weightSubmitting.value = false;
  }
}

// --- 添加备注 ---
function handleRemark(row: RecycleOrder) {
  remarkForm.recycleOrderId = row.recycleOrderId;
  remarkForm.remark = "";
  remarkDialogVisible.value = true;
}

async function submitRemark() {
  if (!remarkForm.remark.trim()) {
    ElMessage.warning("请输入备注内容");
    return;
  }

  remarkSubmitting.value = true;
  try {
    await remarkOperateApi(remarkForm);
    ElMessage.success("添加备注成功");
    remarkDialogVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error("添加备注失败");
  } finally {
    remarkSubmitting.value = false;
  }
}

// 处理下拉菜单命令
function handleCommand(cmd: string, row: RecycleOrder) {
  switch (cmd) {
    case "abnormal": {
      handleAbnormal(row);
      break;
    }
    case "remark": {
      handleRemark(row);
      break;
    }
    case "weight": {
      handleWeight(row);
      break;
    }
  }
}

function handleSelectionChange(selection: RecycleOrder[]) {
  selectedIds.value = selection.map((item) => item.recycleOrderId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.orderNo = undefined;
  queryParams.memberId = undefined;
  queryParams.deptId = undefined;
  queryParams.deviceId = undefined;
  queryParams.orderStatus = undefined;
  queryParams.payStatus = undefined;
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
          <el-form-item label="订单编号">
            <el-input
              v-model="queryParams.orderNo"
              placeholder="请输入订单编号"
              clearable
              style="width: 180px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="会员Id">
            <el-input
              v-model="queryParams.memberId"
              placeholder="请输入会员ID"
              clearable
              style="width: 150px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="所属小区">
           <el-tree-select
              v-model="queryParams.deptId"
              :data="deptOptions"
              :props="{
                value: 'deptId',
                label: 'deptName',
                children: 'children',
              }"
              placeholder="全部"
              clearable
              check-strictly
              style="width: 180px"
            />
          </el-form-item>
          <el-form-item label="订单状态">
            <el-select
              v-model="queryParams.orderStatus"
              placeholder="全部"
              clearable
              style="width: 120px"
            >
              <el-option
                v-for="item in order_status"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="支付状态">
            <el-select
              v-model="queryParams.payStatus"
              placeholder="全部"
              clearable
              style="width: 120px"
            >
              <el-option
                v-for="item in payStatusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleQuery">
查询
</el-button>
<el-button :loading="exporting" @click="openExportSelector">导出</el-button>
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
            
            <!-- <el-button
              type="danger"
              plain
              :icon="Delete"
              :disabled="selectedIds.length === 0"
              @click="handleDelete()"
            >
              批量删除
            </el-button> -->
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 -->
      <el-card shadow="never">
        <div class="flex justify-end mb-2">
    <ColumnSelector
      :storage-key="RECYCLE_ORDER_STORAGE_KEY"
      :default-columns="defaultRecycleOrderColumns"
      @update:columns="handleColumnsUpdate"
    />
  </div>
       <el-table
  v-loading="loading"
  :data="tableData"
  border
  stripe
  style="width: 100%"
  @selection-change="handleSelectionChange"
>
  <!-- 选择列固定写死 -->
  <el-table-column type="selection" width="55" align="center" />

  <!-- 动态数据列 -->
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
      <!-- 订单状态 -->
      <template v-if="col.key === 'orderStatus'">
        <DictTag :options="order_status" :value="row.orderStatus" />
      </template>
      <!-- 投递重量 -->
      <template v-else-if="col.key === 'weight'">
        {{ row.weight?.toFixed(2) || 0 }} kg
      </template>
      <!-- 实际金额 -->
      <template v-else-if="col.key === 'realAmount'">
        <span class="font-medium text-primary">
          {{ formatAmount(row.realAmount) }}
        </span>
      </template>
      <!-- 投递前后重量合并显示 -->
    <template v-else-if="col.key === 'beforeAfterWeight'">
      <span>
        {{ (row.beforeWeight || 0).toFixed(2) }} → 
        {{ (row.afterWeight || 0).toFixed(2) }} kg
      </span>
    </template>
      <!-- 普通字段 -->
      <template v-else>
        {{ (row as any)[col.key] ?? '-' }}
      </template>
    </template>
  </el-table-column>

  <!-- 操作列固定写死 -->
  <el-table-column label="操作" width="200" fixed="right" align="center">
    <template #default="{ row }">
       <div class="action-buttons">
<el-button link type="primary" :icon="View" @click="handleView(row)">
        详情
      </el-button>
      <el-dropdown @command="(cmd: string) => handleCommand(cmd, row)">
        <el-button link type="primary" class="dropdown-trigger-btn">
          操作<el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="abnormal" :icon="Warning">
              异常订单
            </el-dropdown-item>
            <el-dropdown-item command="weight" :icon="ScaleToOriginal">
              补重/扣重
            </el-dropdown-item>
            <el-dropdown-item command="remark" :icon="ChatDotRound">
              添加备注
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
       </div>
</template>
  </el-table-column>
</el-table>

        <!-- 分页 -->
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
    </div>

    <ExportFieldSelector
  v-model:visible="exportFieldVisible"
  :fields="exportFields"
  :loading="exporting"
  @confirm="handleExportConfirm"
/>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="订单详情"
      width="700px"
      append-to-body
    >
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="订单编号" :span="2">
{{
          detailData.orderNo
        }}
</el-descriptions-item>
        <el-descriptions-item label="会员名称">
{{
          detailData.memberName || "-"
        }}
</el-descriptions-item>
        <el-descriptions-item label="所属小区">
{{
          detailData.deptName || "-"
        }}
</el-descriptions-item>
        <el-descriptions-item label="设备名称">
{{
          detailData.deviceName || "-"
        }}
</el-descriptions-item>
        <el-descriptions-item label="设备编号">
{{
          detailData.deviceNo || "-"
        }}
</el-descriptions-item>
        <el-descriptions-item label="仓口号">
{{
          detailData.hatchNo ? `${detailData.hatchNo}号仓` : "-"
        }}
</el-descriptions-item>
        <el-descriptions-item label="包袋编号">
{{
          detailData.deviceBagNo || "-"
        }}
</el-descriptions-item>
        <el-descriptions-item label="投递重量">
{{ detailData.weight?.toFixed(2) || 0 }} kg
</el-descriptions-item>
        <el-descriptions-item label="实际有效重量">
{{ detailData.realWeight?.toFixed(2) || 0 }} kg
</el-descriptions-item>
        <el-descriptions-item label="回收单价">
¥
          {{ detailData.unitPrice?.toFixed(2) || 0 }}/kg
</el-descriptions-item>
        <el-descriptions-item label="预估金额">
{{
          formatAmount(detailData.estimateAmount)
        }}
</el-descriptions-item>
        <el-descriptions-item label="实际金额">
          <span class="font-bold text-primary">{{
            formatAmount(detailData.realAmount)
          }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="订单状态">
          <el-tag
            :type="getOrderStatusType(detailData.orderStatus)"
            size="small"
          >
            {{ getOrderStatusText(detailData.orderStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="支付状态">
          <el-tag :type="getPayStatusType(detailData.payStatus)" size="small">
            {{ getPayStatusText(detailData.payStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="支付时间">
{{
          detailData.payTime || "-"
        }}
</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">
{{
          detailData.remark || "-"
        }}
</el-descriptions-item>
      </el-descriptions>

      <!-- 订单附件 -->
      <el-divider content-position="left">订单附件</el-divider>
      <ImageGallery
        v-if="detailData"
        :order-id="detailData.recycleOrderId"
        :order-no="detailData.orderNo"
        @update="(count) => console.log(`附件数量: ${count}`)"
      />
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 补重/扣重弹窗 -->
    <el-dialog
      v-model="weightDialogVisible"
      title="补重/扣重"
      width="450px"
      append-to-body
    >
      <el-form :model="weightForm" label-width="100px">
        <el-form-item label="操作类型" required>
          <el-radio-group v-model="weightForm.operateType">
            <el-radio :value="0">补重</el-radio>
            <el-radio :value="1">扣重</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="重量(kg)" required>
          <el-input-number
            v-model="weightForm.weight"
            :min="0.01"
            :precision="2"
            :step="0.1"
            placeholder="请输入重量"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="weightDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="weightSubmitting"
          @click="submitWeight"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 添加备注弹窗 -->
    <el-dialog
      v-model="remarkDialogVisible"
      title="添加备注"
      width="500px"
      append-to-body
    >
      <el-form :model="remarkForm" label-width="80px">
        <el-form-item label="备注" required>
          <el-input
            v-model="remarkForm.remark"
            type="textarea"
            :rows="4"
            placeholder="请输入备注内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="remarkDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="remarkSubmitting"
          @click="submitRemark"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped lang="scss">
.text-primary {
  color: #409eff;
}

.text-success {
  color: #67c23a;
}

.text-warning {
  color: #e6a23c;
}

.text-danger {
  color: #f56c6c;
}

.font-bold {
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 4px; // 控制按钮间距
  align-items: center;
  justify-content: center;

  .el-button {
    margin-right: 0;
    margin-left: 0; // 移除默认左边距
  }

  .dropdown-trigger-btn {
    padding: 8px 12px;
    margin: 0;
  }
}
</style>
