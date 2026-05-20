<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

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
import ColumnSelector from "#/components/ColumnSelector/index.vue";
import DictTag from "#/components/DictTag/index.vue";
import ExportFieldSelector from "#/components/ExportFieldSelector/index.vue";
import {
  defaultMemberWithdrawColumns,
  MEMBER_WITHDRAW_STORAGE_KEY,
  type TableColumnConfig,
} from "#/constants/tableColumns";
import { useDicts } from "#/hooks/useDict";
import { ModuleCodeMap, useExport } from "#/hooks/useExport";

const { withdraw_status, audit_mode } = useDicts([
  "withdraw_status",
  "audit_mode",
]);
const { exporting, exportData } = useExport(ModuleCodeMap.MEMBER_WITHDRAW);

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

const getExportableFields = computed(() => {
  return visibleColumns.value.map((col) => ({
    prop: col.key,
    label: col.label,
  }));
});

const exportFieldVisible = ref(false);
const exportFields = ref<{ label: string; prop: string }[]>([]);

function openExportSelector() {
  exportFields.value = getExportableFields.value;
  exportFieldVisible.value = true;
}

async function handleExportConfirm(selectedFields: string[]) {
  await exportData(queryParams, selectedFields);
}

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
const dateRange = ref<[string, string] | null>(null);

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
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <!-- 统计卡片 -->
      <!-- <el-row :gutter="16" class="mb-4">
        <el-col :span="6">
          <el-card shadow="hover" class="text-center">
            <div class="text-gray-500 text-sm">提现总数</div>
            <div class="text-2xl font-bold text-primary">{{ total }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="text-center">
            <div class="text-gray-500 text-sm">待审核</div>
            <div class="text-2xl font-bold text-warning">
              {{tableData.filter((item) => item.status === 0).length}}
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="text-center">
            <div class="text-gray-500 text-sm">提现中</div>
            <div class="text-2xl font-bold text-primary">
              {{tableData.filter((item) => item.status === 1).length}}
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="text-center">
            <div class="text-gray-500 text-sm">已完成</div>
            <div class="text-2xl font-bold text-success">
              {{tableData.filter((item) => item.status === 2).length}}
            </div>
          </el-card>
        </el-col>
      </el-row> -->

      <!-- 查询表单 -->
      <el-card shadow="never" class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="提现单号">
            <el-input
              v-model="queryParams.withdrawNo"
              placeholder="请输入提现单号"
              clearable
              style="width: 180px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="会员ID">
            <el-input
              v-model="queryParams.memberId"
              placeholder="请输入会员ID"
              clearable
              style="width: 180px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="提现状态">
            <el-select
              v-model="queryParams.status"
              placeholder="全部"
              clearable
              style="width: 120px"
            >
              <el-option
                v-for="item in statusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="申请时间">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              style="width: 260px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleQuery">
查询
</el-button>
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
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
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 -->
      <el-card shadow="never">
        <div class="flex justify-end mb-2">
          <ColumnSelector
            :storage-key="MEMBER_WITHDRAW_STORAGE_KEY"
            :default-columns="defaultMemberWithdrawColumns"
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
              <!-- 申请金额 -->
              <template v-if="col.key === 'applyAmount'">
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
            width="200"
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
{{
          detailData.withdrawNo
        }}
</el-descriptions-item>
        <el-descriptions-item label="会员ID">
{{
          detailData.memberId
        }}
</el-descriptions-item>
        <el-descriptions-item label="商户ID">
{{
          detailData.merchantId || "-"
        }}
</el-descriptions-item>
        <el-descriptions-item label="申请金额">
{{
          formatAmount(detailData.applyAmount)
        }}
</el-descriptions-item>
        <el-descriptions-item label="平台服务费">
{{
          formatAmount(detailData.platformFee)
        }}
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
{{
          detailData.auditUserName || "-"
        }}
</el-descriptions-item>
        <el-descriptions-item label="审核时间">
{{
          detailData.auditTime || "-"
        }}
</el-descriptions-item>
        <el-descriptions-item
          label="驳回原因"
          :span="2"
          v-if="detailData.auditReason"
        >
          <span class="text-danger">{{ detailData.auditReason }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="支付请求ID" :span="2">
{{
          detailData.payRequestId || "-"
        }}
</el-descriptions-item>
        <el-descriptions-item label="支付请求时间">
{{
          detailData.payRequestTime || "-"
        }}
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
