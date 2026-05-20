<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

import { Page } from "@vben/common-ui";

import {
  Delete,
  Edit,
  Plus,
  Refresh,
  Search,
  View,
  Wallet,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import {
  addMemberApi,
  deleteMemberApi,
  editMemberApi,
  getMemberDetailApi,
  getMemberPageApi,
  type Member,
  type MemberPageParams,
  MemberStatusMap,
  SexMap,
} from "#/api/member/member";
import {
  getMemberWalletDetailApi,
  updateWalletStatusApi,
  WalletStatusMap,
} from "#/api/member/memberWallet";
import {
  FlowTypeMap,
  getMemberWalletFlowPageApi,
  type MemberWalletFlow,
  type MemberWalletFlowPageParams,
} from "#/api/member/memberWalletFlow";
import ColumnSelector from "#/components/ColumnSelector/index.vue";
import ExportFieldSelector from "#/components/ExportFieldSelector/index.vue";
import {
  defaultMemberColumns,
  MEMBER_STORAGE_KEY,
  type TableColumnConfig,
} from "#/constants/tableColumns";
import { useDicts } from "#/hooks/useDict";
import { ModuleCodeMap, useExport } from "#/hooks/useExport";

import AuthList from "./components/AuthList.vue";

const { member_status, member_sex } = useDicts(["member_status", "member_sex"]);
const { exporting, exportData } = useExport(ModuleCodeMap.MEMBER);

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultMemberColumns]);

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
const tableData = ref<Member[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const activeTab = ref("basic");

// 表单弹窗
const formVisible = ref(false);
const formTitle = ref("");
const formData = ref<Partial<Member>>({});
const formSubmitting = ref(false);

// 详情弹窗
const detailVisible = ref(false);
const detailData = ref<Member | null>(null);

// 钱包弹窗
const walletVisible = ref(false);
const walletActiveTab = ref("info");
const currentMember = ref<Member | null>(null);
const walletInfo = ref<any>(null);
const walletLoading = ref(false);

// 流水记录
const flowLoading = ref(false);
const flowData = ref<MemberWalletFlow[]>([]);
const flowTotal = ref(0);
const flowQueryParams = reactive<MemberWalletFlowPageParams>({
  pageNo: 1,
  pageSize: 10,
  memberId: undefined,
  flowType: undefined,
  startTime: undefined,
  endTime: undefined,
});
const flowDateRange = ref<string[]>([]);

// 流水类型选项
const flowTypeOptions = [
  { label: "全部", value: undefined },
  { label: "售卖收益入账", value: 0 },
  { label: "提现冻结", value: 1 },
  { label: "提现成功扣减", value: 2 },
  { label: "提现失败解冻退回", value: 3 },
];

// 状态选项
const statusOptions = [
  { label: "全部", value: undefined },
  { label: "启用", value: 0 },
  { label: "禁用", value: 1 },
  { label: "黑名单", value: 2 },
];

const sexOptions = [
  { label: "全部", value: undefined },
  { label: "未知", value: 0 },
  { label: "男", value: 1 },
  { label: "女", value: 2 },
];

// 查询参数
const queryParams = reactive<MemberPageParams>({
  pageNo: 1,
  pageSize: 10,
  memberId: undefined,
  mobile: undefined,
  nickname: undefined,
  sex: undefined,
  status: undefined,
});

// --- 辅助函数 ---
function getStatusText(status: number): string {
  return MemberStatusMap[status]?.label || "未知";
}

function getStatusType(status: number): string {
  return MemberStatusMap[status]?.type || "info";
}

function getSexText(sex: number): string {
  return SexMap[sex] || "未知";
}

function getWalletStatusText(status: number): string {
  return WalletStatusMap[status]?.label || "未知";
}

function getWalletStatusType(status: number): string {
  return WalletStatusMap[status]?.type || "info";
}

function formatBalance(balance: number): string {
  return `¥ ${(balance || 0).toFixed(2)}`;
}

function getFlowTypeText(type: number): string {
  return FlowTypeMap[type]?.label || "未知";
}

function getFlowTypeType(type: number): string {
  return FlowTypeMap[type]?.type || "info";
}

function getFlowSign(type: number): string {
  return FlowTypeMap[type]?.sign || "";
}

function formatChangeAmount(amount: number, type: number): string {
  const sign = getFlowSign(type);
  const formatted = formatBalance(Math.abs(amount || 0));
  return sign === "+" ? `+${formatted}` : `-${formatted}`;
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getMemberPageApi(queryParams);
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
async function handleView(row: Member) {
  try {
    const res = await getMemberDetailApi(row.memberId);
    detailData.value = res;
    detailVisible.value = true;
  } catch {
    ElMessage.error("获取详情失败");
  }
}

// --- 查看钱包 ---
async function handleViewWallet(row: Member) {
  currentMember.value = row;
  walletActiveTab.value = "info";
  walletVisible.value = true;

  // 加载钱包信息
  await loadWalletInfo(row.memberId);

  // 加载流水记录
  await loadFlowData(row.memberId);
}

async function loadWalletInfo(memberId: number) {
  walletLoading.value = true;
  try {
    const res = await getMemberWalletDetailApi(memberId);
    walletInfo.value = res;
  } catch {
    ElMessage.error("获取钱包信息失败");
  } finally {
    walletLoading.value = false;
  }
}

async function loadFlowData(memberId: number) {
  flowLoading.value = true;
  flowQueryParams.memberId = memberId;

  // 处理时间范围
  if (flowDateRange.value && flowDateRange.value.length === 2) {
    flowQueryParams.startTime = flowDateRange.value[0];
    flowQueryParams.endTime = flowDateRange.value[1];
  } else {
    flowQueryParams.startTime = undefined;
    flowQueryParams.endTime = undefined;
  }

  try {
    const res = await getMemberWalletFlowPageApi(flowQueryParams);
    flowData.value = res.records || [];
    flowTotal.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error("加载流水记录失败");
  } finally {
    flowLoading.value = false;
  }
}

// --- 冻结/解冻钱包 ---
async function handleWalletStatusToggle() {
  if (!walletInfo.value) return;

  const newStatus = walletInfo.value.status === 0 ? 1 : 0;
  const action = newStatus === 0 ? "解冻" : "冻结";

  try {
    await ElMessageBox.confirm(`确定要${action}该会员钱包吗？`, "提示", {
      type: "warning",
    });
    await updateWalletStatusApi(walletInfo.value.memberWalletId, newStatus);
    ElMessage.success(`${action}成功`);
    // 刷新钱包信息
    await loadWalletInfo(currentMember.value!.memberId);
  } catch {
    // 取消操作
  }
}

// 流水查询
function handleFlowQuery() {
  if (currentMember.value) {
    flowQueryParams.pageNo = 1;
    loadFlowData(currentMember.value.memberId);
  }
}

function resetFlowQuery() {
  flowQueryParams.flowType = undefined;
  flowDateRange.value = [];
  flowQueryParams.startTime = undefined;
  flowQueryParams.endTime = undefined;
  flowQueryParams.pageNo = 1;
  if (currentMember.value) {
    loadFlowData(currentMember.value.memberId);
  }
}

function handleFlowPageChange() {
  if (currentMember.value) {
    loadFlowData(currentMember.value.memberId);
  }
}

// --- 新增/编辑 ---
function handleAdd() {
  formTitle.value = "新增会员";
  formData.value = {
    sex: 0,
    status: 0,
  };
  formVisible.value = true;
}

async function handleEdit(row: Member) {
  try {
    formTitle.value = "编辑会员";
    const res = await getMemberDetailApi(row.memberId);
    formData.value = res || {};
    formVisible.value = true;
  } catch {
    ElMessage.error("获取会员信息失败");
  }
}

async function handleSubmit() {
  if (!formData.value.mobile?.trim()) {
    ElMessage.warning("请输入手机号");
    return;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.memberId ? editMemberApi : addMemberApi;
    await api(formData.value);
    ElMessage.success(formData.value.memberId ? "修改成功" : "新增成功");
    formVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    formSubmitting.value = false;
  }
}

// --- 删除 ---
async function handleDelete(row?: Member) {
  let ids: number[] = [];

  if (row) {
    ids = [row.memberId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条会员吗？`,
      "提示",
      { type: "warning" }
    );

    for (const id of ids) {
      await deleteMemberApi(id);
    }

    ElMessage.success(`成功删除 ${ids.length} 条会员`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: Member[]) {
  selectedIds.value = selection.map((item) => item.memberId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.memberId = undefined;
  queryParams.mobile = undefined;
  queryParams.nickname = undefined;
  queryParams.sex = undefined;
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
      <!-- 统计卡片 -->
      <!-- <el-row :gutter="16" class="mb-4">
        <el-col :span="8">
          <el-card shadow="hover" class="text-center">
            <div class="text-gray-500 text-sm">会员总数</div>
            <div class="text-2xl font-bold text-primary">{{ total }}</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" class="text-center">
            <div class="text-gray-500 text-sm">正常会员</div>
            <div class="text-2xl font-bold text-success">
              {{ tableData.filter((item) => item.status === 0).length }}
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" class="text-center">
            <div class="text-gray-500 text-sm">禁用/黑名单</div>
            <div class="text-2xl font-bold text-danger">
              {{ tableData.filter((item) => item.status !== 0).length }}
            </div>
          </el-card>
        </el-col>
      </el-row> -->

      <!-- 查询表单 -->
      <el-card shadow="never" class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="会员ID">
            <el-input
              v-model="queryParams.memberId"
              placeholder="请输入会员ID"
              clearable
              style="width: 150px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="手机号">
            <el-input
              v-model="queryParams.mobile"
              placeholder="请输入手机号"
              clearable
              style="width: 150px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="昵称">
            <el-input
              v-model="queryParams.nickname"
              placeholder="请输入昵称"
              clearable
              style="width: 150px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="性别">
            <el-select
              v-model="queryParams.sex"
              placeholder="全部"
              clearable
              style="width: 100px"
            >
              <el-option
                v-for="item in sexOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select
              v-model="queryParams.status"
              placeholder="全部"
              clearable
              style="width: 100px"
            >
              <el-option
                v-for="item in statusOptions"
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
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
            <el-button type="primary" plain :icon="Plus" @click="handleAdd">
新增
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
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 -->
      <el-card shadow="never">
        <div class="flex justify-end mb-2">
          <ColumnSelector
            :storage-key="MEMBER_STORAGE_KEY"
            :default-columns="defaultMemberColumns"
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
              <!-- 头像 -->
              <template v-if="col.key === 'avatar'">
                <el-avatar :size="32" :src="row.avatar" />
              </template>
              <!-- 性别 -->
              <template v-else-if="col.key === 'sex'">
                <DictTag :options="member_sex" :value="row.sex" />
              </template>
              <!-- 状态 -->
              <template v-else-if="col.key === 'status'">
                <DictTag :options="member_status" :value="row.status" />
              </template>
              <!-- 昵称 -->
              <template v-else-if="col.key === 'nickname'">
                {{ row.nickname || "-" }}
              </template>
              <!-- 手机号 -->
              <template v-else-if="col.key === 'mobile'">
                {{ row.mobile || "-" }}
              </template>
              <!-- 会员ID -->
              <template v-else-if="col.key === 'memberId'">
                {{ row.memberId }}
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
            width="350"
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
                link
                type="primary"
                :icon="Wallet"
                @click="handleViewWallet(row)"
                >
钱包
</el-button>
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="formVisible"
      :title="formTitle"
      width="500px"
      append-to-body
    >
      <el-form :model="formData" label-width="80px">
        <el-form-item label="手机号" required>
          <el-input v-model="formData.mobile" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="formData.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="头像">
          <el-input v-model="formData.avatar" placeholder="请输入头像URL" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="formData.sex">
            <el-radio :value="0">未知</el-radio>
            <el-radio :value="1">男</el-radio>
            <el-radio :value="2">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="formData.status">
            <el-radio :value="0">启用</el-radio>
            <el-radio :value="1">禁用</el-radio>
            <el-radio :value="2">黑名单</el-radio>
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

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="会员详情"
      width="800px"
      append-to-body
    >
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions :column="1" border v-if="detailData">
            <el-descriptions-item label="会员ID">
{{
              detailData.memberId
            }}
</el-descriptions-item>
            <el-descriptions-item label="手机号">
{{
              detailData.mobile
            }}
</el-descriptions-item>
            <el-descriptions-item label="昵称">
{{
              detailData.nickname || "-"
            }}
</el-descriptions-item>
            <el-descriptions-item label="性别">
{{
              getSexText(detailData.sex)
            }}
</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="getStatusType(detailData.status)" size="small">
                {{ getStatusText(detailData.status) }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <el-tab-pane label="认证信息" name="auth">
          <AuthList
            :member-id="detailData?.memberId"
            :member-name="detailData?.nickname"
          />
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 钱包弹窗 -->
    <el-dialog
      v-model="walletVisible"
      :title="`钱包管理 - ${currentMember?.nickname || currentMember?.mobile}`"
      width="900px"
      append-to-body
    >
      <el-tabs v-model="walletActiveTab">
        <!-- 钱包信息 Tab -->
        <el-tab-pane label="钱包信息" name="info">
          <div v-loading="walletLoading">
            <el-descriptions :column="2" border v-if="walletInfo">
              <el-descriptions-item label="钱包ID">
{{
                walletInfo.memberWalletId
              }}
</el-descriptions-item>
              <el-descriptions-item label="会员ID">
{{
                walletInfo.memberId
              }}
</el-descriptions-item>
              <el-descriptions-item label="可用余额">
                <span class="text-success font-bold text-lg">{{
                  formatBalance(walletInfo.balance)
                }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="冻结余额">
                <span class="text-warning">{{
                  formatBalance(walletInfo.freezeBalance)
                }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="钱包状态">
                <el-tag
                  :type="getWalletStatusType(walletInfo.status)"
                  size="small"
                >
                  {{ getWalletStatusText(walletInfo.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="操作">
                <el-button
                  v-if="walletInfo.status === 0"
                  type="danger"
                  size="small"
                  @click="handleWalletStatusToggle"
                >
                  冻结钱包
                </el-button>
                <el-button
                  v-else
                  type="success"
                  size="small"
                  @click="handleWalletStatusToggle"
                >
                  解冻钱包
                </el-button>
              </el-descriptions-item>
            </el-descriptions>
            <el-empty v-else description="暂无钱包信息" />
          </div>
        </el-tab-pane>

        <!-- 流水记录 Tab -->
        <el-tab-pane label="流水记录" name="flow">
          <div class="mb-4">
            <el-form :inline="true">
              <el-form-item label="流水类型">
                <el-select
                  v-model="flowQueryParams.flowType"
                  placeholder="全部"
                  clearable
                  style="width: 140px"
                >
                  <el-option
                    v-for="item in flowTypeOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="时间范围">
                <el-date-picker
                  v-model="flowDateRange"
                  type="datetimerange"
                  range-separator="至"
                  start-placeholder="开始时间"
                  end-placeholder="结束时间"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 360px"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleFlowQuery">
查询
</el-button>
                <el-button @click="resetFlowQuery">重置</el-button>
              </el-form-item>
            </el-form>
          </div>

          <el-table
            v-loading="flowLoading"
            :data="flowData"
            border
            stripe
            style="width: 100%"
          >
            <el-table-column
              prop="memberWalletFlowId"
              label="流水ID"
              width="90"
              align="center"
            />
            <el-table-column
              prop="batchNo"
              label="批次号"
              min-width="180"
              align="center"
              show-overflow-tooltip
            />
            <el-table-column
              prop="flowType"
              label="流水类型"
              width="130"
              align="center"
            >
              <template #default="{ row }">
                <el-tag :type="getFlowTypeType(row.flowType)" size="small">
                  {{ getFlowTypeText(row.flowType) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="changeAmount"
              label="变动金额"
              width="130"
              align="right"
            >
              <template #default="{ row }">
                <span
                  :class="
                    row.flowType === 0 || row.flowType === 3
                      ? 'text-success'
                      : 'text-danger'
                  "
                >
                  {{ formatChangeAmount(row.changeAmount, row.flowType) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column
              prop="beforeBalance"
              label="变动前余额"
              width="120"
              align="right"
            >
              <template #default="{ row }">
                {{ formatBalance(row.beforeBalance) }}
              </template>
            </el-table-column>
            <el-table-column
              prop="afterBalance"
              label="变动后余额"
              width="120"
              align="right"
            >
              <template #default="{ row }">
                <span class="font-medium">{{
                  formatBalance(row.afterBalance)
                }}</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="createTime"
              label="发生时间"
              width="160"
              align="center"
            />
            <el-table-column
              prop="remark"
              label="备注"
              min-width="150"
              align="left"
              show-overflow-tooltip
            />
          </el-table>

          <!-- 分页 -->
          <div class="flex justify-end mt-4">
            <el-pagination
              v-model:current-page="flowQueryParams.pageNo"
              v-model:page-size="flowQueryParams.pageSize"
              :total="flowTotal"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleFlowPageChange"
              @current-change="handleFlowPageChange"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="walletVisible = false">关闭</el-button>
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
</style>
