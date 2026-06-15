<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from "vue";

import { Page } from "@vben/common-ui";

import { Check, Delete, Refresh, Search, View } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import {
  auditMemberWithdrawPassApi,
  auditMemberWithdrawRefuseApi,
  AuditModeMap,
  deleteMemberWithdrawApi,
  getMemberWithdrawDetailApi,
  getMemberWithdrawPageApi,
  type MemberWithdraw,
  type MemberWithdrawPageParams,
  WithdrawStatusMap,
} from "#/api/member/memberWithdraw";
import {
  getRecycleOrderPageApi,
  type RecycleOrder,
} from "#/api/operation/recycleOrder";
import ColumnSelector from "#/components/ColumnSelector/index.vue";
import DictTag from "#/components/DictTag/index.vue";
import ExportFieldSelector from "#/components/ExportFieldSelector/index.vue";
import {
  defaultMemberWithdrawColumns,
  MEMBER_WITHDRAW_STORAGE_KEY,
  type TableColumnConfig,
} from "#/constants/tableColumns";
import { useDicts } from "#/hooks/useDict";
import { ModuleCodeMap } from "#/hooks/useExport";
import { getRecentDays } from "#/utils/date";

const { withdraw_status, audit_mode, order_status } = useDicts([
  "withdraw_status",
  "audit_mode",
  "order_status",
]);

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([
  ...defaultMemberWithdrawColumns,
]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<MemberWithdraw[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 详情弹窗
const detailVisible = ref(false);
const detailData = ref<MemberWithdraw | null>(null);

// 审核弹窗
const auditVisible = ref(false);
const auditData = ref<MemberWithdraw | null>(null);
const auditForm = reactive({
  status: 1, // 1=通过, 4=拒绝
  auditReason: "",
});
const auditSubmitting = ref(false);

// 会员选项
const memberOptions = ref<{ label: string; value: number }[]>([]);

// 提现状态选项
const statusOptions = [
  { label: "全部", value: undefined },
  { label: "待审核", value: 0 },
  { label: "提现中", value: 1 },
  { label: "已提现", value: 2 },
  { label: "提现失败", value: 3 },
  { label: "审核拒绝", value: 4 },
];

// 查询参数
const queryParams = reactive<MemberWithdrawPageParams>({
  pageNo: 1,
  pageSize: 10,
  withdrawNo: undefined,
  memberId: undefined,
  status: undefined,
  startTime: undefined,
  endTime: undefined,
});

// 时间范围
const dateRange = ref<string[]>([]);
// 页面加载时设置默认时间（最近7天）
function initDateRange() {
  const { startTime, endTime } = getRecentDays(7);
  console.log(startTime, endTime);
  dateRange.value = [startTime, endTime];
  queryParams.startTime = startTime;
  queryParams.endTime = endTime;
}

// 监听时间范围变化
watch(dateRange, (newVal) => {
  if (newVal && newVal.length === 2) {
    queryParams.startTime = newVal[0];
    queryParams.endTime = newVal[1];
  } else {
    queryParams.startTime = undefined;
    queryParams.endTime = undefined;
  }
});

// 近期订单弹窗
const recentOrdersVisible = ref(false);
const recentOrdersLoading = ref(false);
const recentOrdersData = ref<RecycleOrder[]>([]);
const currentMemberId = ref<number>(0);
const currentMemberName = ref("");

// 近期订单查询参数
const recentOrdersParams = reactive({
  pageNo: 1,
  pageSize: 10,
  memberId: undefined as number | undefined,
  startTime: "",
  endTime: "",
});

// 查看近期订单
async function handleViewRecentOrders(row: MemberWithdraw) {
  currentMemberId.value = row.memberId;
  currentMemberName.value = `会员ID: ${row.memberId}`;
  recentOrdersVisible.value = true;
  recentOrdersLoading.value = true;

  // 获取最近7天的时间范围
  const { startTime, endTime } = getRecentDays(7);
  recentOrdersParams.memberId = row.memberId;
  recentOrdersParams.startTime = startTime;
  recentOrdersParams.endTime = endTime;
  recentOrdersParams.pageNo = 1;

  try {
    const res = await getRecycleOrderPageApi(recentOrdersParams);
    recentOrdersData.value = res.records || [];
  } catch (error) {
    console.error("获取近期订单失败", error);
    ElMessage.error("获取近期订单失败");
  } finally {
    recentOrdersLoading.value = false;
  }
}

// 关闭弹窗
function closeRecentOrders() {
  recentOrdersVisible.value = false;
  recentOrdersData.value = [];
}

// --- 辅助函数 ---
function getStatusText(status: number): string {
  return WithdrawStatusMap[status]?.label || "未知";
}

function getStatusType(status: number): string {
  return WithdrawStatusMap[status]?.type || "info";
}

function getAuditModeText(mode: number): string {
  return AuditModeMap[mode] || "未知";
}

function formatAmount(amount: number): string {
  return `¥ ${(amount || 0).toFixed(2)}`;
}

// --- 数据加载 ---
async function loadData() {
  if (dateRange.value && dateRange.value.length === 2) {
    queryParams.startTime = dateRange.value[0];
    queryParams.endTime = dateRange.value[1];
  } else {
    queryParams.startTime = undefined;
    queryParams.endTime = undefined;
  }

  try {
    loading.value = true;
    const res = await getMemberWithdrawPageApi(queryParams);
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
async function handleView(row: MemberWithdraw) {
  try {
    const res = await getMemberWithdrawDetailApi(row.memberWithdrawId);
    detailData.value = res;
    detailVisible.value = true;
  } catch {
    ElMessage.error("获取详情失败");
  }
}

// --- 审核弹窗 ---
function handleAudit(row: MemberWithdraw) {
  if (row.status !== 0) {
    ElMessage.warning("只有待审核状态的提现才能审核");
    return;
  }
  auditData.value = row;
  auditForm.status = 1;
  auditForm.auditReason = "";
  auditVisible.value = true;
}

async function handleAuditSubmit() {
  if (!auditData.value) return;

  if (auditForm.status === 4 && !auditForm.auditReason.trim()) {
    ElMessage.warning("请填写驳回原因");
    return;
  }

  auditSubmitting.value = true;
  try {
    if (auditForm.status === 1) {
      // 审核通过
      await auditMemberWithdrawPassApi({
        memberWithdrawId: auditData.value.memberWithdrawId,
      });
      ElMessage.success("审核通过");
    } else {
      // 审核拒绝
      await auditMemberWithdrawRefuseApi({
        memberWithdrawId: auditData.value.memberWithdrawId,
        auditReason: auditForm.auditReason,
      });
      ElMessage.success("已拒绝");
    }
    auditVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    auditSubmitting.value = false;
  }
}

// --- 删除 ---
async function handleDelete(row?: MemberWithdraw) {
  let ids: number[] = [];

  if (row) {
    ids = [row.memberWithdrawId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条提现记录吗？`,
      "提示",
      { type: "warning" }
    );

    for (const id of ids) {
      await deleteMemberWithdrawApi(id);
    }

    ElMessage.success(`成功删除 ${ids.length} 条记录`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: MemberWithdraw[]) {
  selectedIds.value = selection.map((item) => item.memberWithdrawId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.withdrawNo = undefined;
  queryParams.memberId = undefined;
  queryParams.status = undefined;
  dateRange.value = null;
  queryParams.startTime = undefined;
  queryParams.endTime = undefined;
  queryParams.pageNo = 1;
  loadData();
}

onMounted(() => {
  // initDateRange();
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-0">
      <!-- 查询表单 -->
      <el-card shadow="never" class="border-none mb-4 !p-2">
        <el-form
          :inline="true"
          :model="queryParams"
          class="flex flex-wrap gap-x-2 gap-y-2 items-center"
        >
          <el-form-item class="!mb-0 !mr-2">
            <el-input
              v-model="queryParams.withdrawNo"
              placeholder="请输入"
              clearable
              style="width: 200px"
              @keyup.enter="handleQuery"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">提现单号:</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-input
              v-model="queryParams.memberId"
              placeholder="请输入"
              clearable
              style="width: 200px"
              @keyup.enter="handleQuery"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">会员ID:</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select
              v-model="queryParams.status"
              clearable
              style="width: 200px"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">提现状态:</span>
              </template>
              <el-option
                v-for="item in statusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              style="width: 280px"
            />
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

      <!-- 数据表格 -->
      <el-card shadow="never" class="border-none !p-2">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <ExportButton
              :module-code="ModuleCodeMap.WITHDRAW"
              :fields="visibleColumns"
              :find-cond="queryParams"
            />
            <!-- <el-button
              type="danger"
              plain
              :icon="Delete"
              :disabled="selectedIds.length === 0"
              @click="handleDelete()"
            >
              批量删除
            </el-button> -->
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
              :storage-key="MEMBER_WITHDRAW_STORAGE_KEY"
              :default-columns="defaultMemberWithdrawColumns"
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
          <!-- 选择列固定写死 -->
          <el-table-column type="selection" width="50" align="center" />

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
              <!-- 近期订单 -->
              <template v-if="col.key === 'recentOrder'">
                <el-button
                  type="primary"
                  size="small"
                  @click="handleViewRecentOrders(row)"
                >
                  查看订单
                </el-button>
              </template>
              <!-- 申请金额 -->
              <template v-else-if="col.key === 'applyAmount'">
                <span class="font-medium">{{
                  formatAmount(row.applyAmount)
                }}</span>
              </template>
              <!-- 服务费 -->
              <template v-else-if="col.key === 'platformFee'">
                {{ formatAmount(row.platformFee) }}
              </template>
              <!-- 实际到账 -->
              <template v-else-if="col.key === 'realWithdrawAmount'">
                <span class="text-success">{{
                  formatAmount(row.realWithdrawAmount)
                }}</span>
              </template>
              <!-- 审核模式 -->
              <template v-else-if="col.key === 'auditMode'">
                <DictTag :options="audit_mode" :value="row.auditMode" />
              </template>
              <!-- 提现状态 -->
              <template v-else-if="col.key === 'status'">
                <DictTag :options="withdraw_status" :value="row.status" />
              </template>
              <!-- 审核时间 -->
              <template v-else-if="col.key === 'auditTime'">
                {{ row.auditTime || "-" }}
              </template>
              <!-- 审核人 -->
              <template v-else-if="col.key === 'auditUserName'">
                {{ row.auditUserName || "-" }}
              </template>
              <!-- 驳回原因 -->
              <template v-else-if="col.key === 'auditReason'">
                {{ row.auditReason || "-" }}
              </template>
              <!-- 支付请求ID -->
              <template v-else-if="col.key === 'payRequestId'">
                {{ row.payRequestId || "-" }}
              </template>
              <!-- 支付请求时间 -->
              <template v-else-if="col.key === 'payRequestTime'">
                {{ row.payRequestTime || "-" }}
              </template>
              <!-- 批次号 -->
              <template v-else-if="col.key === 'batchNo'">
                {{ row.batchNo || "-" }}
              </template>
              <!-- 提现单号 -->
              <template v-else-if="col.key === 'withdrawNo'">
                {{ row.withdrawNo }}
              </template>
              <!-- 会员ID -->
              <template v-else-if="col.key === 'memberId'">
                {{ row.memberId }}
              </template>
              <!-- 商户ID -->
              <template v-else-if="col.key === 'merchantId'">
                {{ row.merchantId || "-" }}
              </template>
              <!-- 申请时间 -->
              <template v-else-if="col.key === 'createTime'">
                {{ row.createTime || "-" }}
              </template>
              <!-- 普通字段 -->
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <!-- 操作列固定写死 -->
          <el-table-column
            label="操作"
            width="300"
            fixed="right"
            align="center"
          >
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                :icon="View"
                @click="handleView(row)"
              >
                详情
              </el-button>
              <el-button
                v-if="row.status === 0"
                link
                type="success"
                :icon="Check"
                @click="handleAudit(row)"
              >
                审核
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

        <!-- 分页 -->
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
      title="提现详情"
      width="700px"
      append-to-body
    >
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="提现单号" :span="2">
          {{ detailData.withdrawNo }}
        </el-descriptions-item>
        <el-descriptions-item label="会员ID">
          {{ detailData.memberId }}
        </el-descriptions-item>
        <el-descriptions-item label="商户ID">
          {{ detailData.merchantId || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="申请金额">
          {{ formatAmount(detailData.applyAmount) }}
        </el-descriptions-item>
        <el-descriptions-item label="平台服务费">
          {{ formatAmount(detailData.platformFee) }}
        </el-descriptions-item>
        <el-descriptions-item label="实际到账金额">
          <span class="font-bold text-success">{{
            formatAmount(detailData.realWithdrawAmount)
          }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="审核模式">
          <el-tag
            :type="detailData.auditMode === 0 ? 'warning' : 'success'"
            size="small"
          >
            {{ getAuditModeText(detailData.auditMode) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="提现状态">
          <el-tag :type="getStatusType(detailData.status)" size="small">
            {{ getStatusText(detailData.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="审核人">
          {{ detailData.auditUserName || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="审核时间">
          {{ detailData.auditTime || "-" }}
        </el-descriptions-item>
        <el-descriptions-item
          label="驳回原因"
          :span="2"
          v-if="detailData.auditReason"
        >
          <span class="text-danger">{{ detailData.auditReason }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="支付请求ID" :span="2">
          {{ detailData.payRequestId || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="支付请求时间">
          {{ detailData.payRequestTime || "-" }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 审核弹窗 -->
    <el-dialog
      v-model="auditVisible"
      title="提现审核"
      width="450px"
      append-to-body
    >
      <el-form :model="auditForm" label-width="80px">
        <el-form-item label="提现单号">
          <span>{{ auditData?.withdrawNo }}</span>
        </el-form-item>
        <el-form-item label="申请金额">
          <span class="font-bold text-primary">{{
            formatAmount(auditData?.applyAmount || 0)
          }}</span>
        </el-form-item>
        <el-form-item label="审核结果" required>
          <el-radio-group v-model="auditForm.status">
            <el-radio :value="1">审核通过</el-radio>
            <el-radio :value="4">审核拒绝</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="驳回原因" v-if="auditForm.status === 4" required>
          <el-input
            v-model="auditForm.auditReason"
            type="textarea"
            :rows="3"
            placeholder="请输入驳回原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="auditSubmitting"
          @click="handleAuditSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 近期订单弹窗 -->
    <el-dialog
      v-model="recentOrdersVisible"
      :title="`近期订单 - ${currentMemberName}`"
      width="900px"
      append-to-body
      @close="closeRecentOrders"
    >
      <div v-loading="recentOrdersLoading">
        <el-table :data="recentOrdersData" border stripe style="width: 100%">
          <el-table-column
            prop="orderNo"
            label="订单编号"
            min-width="200"
            align="center"
            show-overflow-tooltip
          />
          <el-table-column
            prop="weight"
            label="投递重量"
            width="110"
            align="center"
          >
            <template #default="{ row }">
              {{ row.weight?.toFixed(2) || 0 }} kg
            </template>
          </el-table-column>
          <el-table-column
            prop="realAmount"
            label="实际金额"
            width="120"
            align="center"
          >
            <template #default="{ row }">
              <span class="font-medium text-primary">
                ¥ {{ (row.realAmount || 0).toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column
            prop="orderStatus"
            label="订单状态"
            width="100"
            align="center"
          >
            <template #default="{ row }">
              <DictTag :options="order_status" :value="row.orderStatus" />
            </template>
          </el-table-column>
          <el-table-column
            prop="createdTime"
            label="创建时间"
            width="160"
            align="center"
          />
        </el-table>

        <div
          v-if="recentOrdersData.length === 0 && !recentOrdersLoading"
          class="text-center py-8"
        >
          <el-empty description="近7天暂无订单" :image-size="80" />
        </div>
      </div>
      <template #footer>
        <el-button @click="recentOrdersVisible = false">关闭</el-button>
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

.text-warning {
  color: #e6a23c;
}

.text-danger {
  color: #f56c6c;
}

.font-bold {
  font-weight: 600;
}
</style>
