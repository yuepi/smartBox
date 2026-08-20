<script lang="ts" setup>
import type { MemberWithdraw, MemberWithdrawPageParams } from '#/api/member/memberWithdraw';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from '@vben/common-ui';

import {
  deleteMemberWithdrawApi,
  getMemberWithdrawPageApi,
} from '#/api/member/memberWithdraw';
import { defaultMemberWithdrawColumns, MEMBER_WITHDRAW_STORAGE_KEY } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';
import { getRecentDays } from '#/utils/date';

import RecentOrders from './RecentOrders.vue';
import WithdrawAudit from './WithdrawAudit.vue';
import WithdrawDetail from './WithdrawDetail.vue';

const { withdraw_status, audit_mode } = useDicts(['withdraw_status', 'audit_mode']);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultMemberWithdrawColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const detailRef = ref();
const auditRef = ref();
const recentOrdersRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<MemberWithdraw[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);
const dateRange = ref<string[]>([]);

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

// --- 初始化日期 ---
function initDateRange() {
  const { startTime, endTime } = getRecentDays(7);
  dateRange.value = [startTime, endTime];
  queryParams.startTime = startTime;
  queryParams.endTime = endTime;
}

watch(dateRange, (newVal) => {
  if (newVal?.length === 2) {
    queryParams.startTime = newVal[0];
    queryParams.endTime = newVal[1];
  } else {
    queryParams.startTime = undefined;
    queryParams.endTime = undefined;
  }
});

// --- 辅助函数 ---
function formatAmount(amount: number): string {
  return `¥ ${(amount || 0).toFixed(2)}`;
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getMemberWithdrawPageApi(queryParams);
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
function handleView(row: MemberWithdraw) {
  detailRef.value?.open(row);
}

// --- 审核 ---
function handleAudit(row: MemberWithdraw) {
  auditRef.value?.open(row);
}

// --- 近期订单 ---
function handleViewRecentOrders(row: MemberWithdraw) {
  recentOrdersRef.value?.open(row);
}

// --- 删除 ---
async function handleDelete(row?: MemberWithdraw) {
  // eslint-disable-next-line no-useless-assignment
  let ids: number[] = [];
  if (row) {
    ids = [row.memberWithdrawId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${ids.length} 条提现记录吗？`, '提示', { type: 'warning' });
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
  dateRange.value = [];
  queryParams.startTime = undefined;
  queryParams.endTime = undefined;
  queryParams.pageNo = 1;
  loadData();
}

onMounted(() => {
  initDateRange();
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
v-model="queryParams.withdrawNo" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">提现单号:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
v-model="queryParams.memberId" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">会员ID:</span>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-select v-model="queryParams.status" clearable style="width: 200px">
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">提现状态:</span>
            </template>
            <el-option v-for="item in withdraw_status" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-date-picker
v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期"
            end-placeholder="结束日期" style="width: 280px"
/>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <!-- <template #search-advanced>
      </template> -->

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <ExportButton :module-code="ModuleCodeMap.WITHDRAW" :fields="visibleColumns" :find-cond="queryParams" />
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
:storage-key="MEMBER_WITHDRAW_STORAGE_KEY" :default-columns="defaultMemberWithdrawColumns"
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
            :show-overflow-tooltip="col.showOverflowTooltip || false"
>
            <template #default="{ row }">
              <template v-if="col.key === 'recentOrder'">
                <el-button type="primary" size="small" @click="handleViewRecentOrders(row)">查看订单</el-button>
              </template>
              <template v-else-if="col.key === 'applyAmount' || col.key === 'platformFee'">
                {{ formatAmount((row as any)[col.key] || 0) }}
              </template>
              <template v-else-if="col.key === 'realWithdrawAmount'">
                <span class="text-success">{{ formatAmount(row.realWithdrawAmount) }}</span>
              </template>
              <template v-else-if="col.key === 'auditMode'">
                <DictTag :options="audit_mode" :value="row.auditMode" />
              </template>
              <template v-else-if="col.key === 'status'">
                <DictTag :options="withdraw_status" :value="row.status" />
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right" align="center">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="handleView(row)">
                  详情
                </el-button>
                <el-button v-if="row.status === 0" size="small" type="success" @click="handleAudit(row)">
                  审核
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
    <WithdrawDetail ref="detailRef" />
    <WithdrawAudit ref="auditRef" @success="handleQuery" />
    <RecentOrders ref="recentOrdersRef" />
  </Page>
</template>

<style scoped>
.selected-alert-badge {
  display: inline-block;
}
</style>
