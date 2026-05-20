<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Refresh, View } from '@element-plus/icons-vue';
import { Page } from '@vben/common-ui';

import {
  getMemberWalletFlowPageApi,
  getMemberWalletFlowDetailApi,
  FlowTypeMap,
  type MemberWalletFlow,
  type MemberWalletFlowPageParams,
} from '#/api/member/memberWalletFlow';

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<MemberWalletFlow[]>([]);
const total = ref(0);

// 详情弹窗
const detailVisible = ref(false);
const detailData = ref<MemberWalletFlow | null>(null);

// 会员选项
const memberOptions = ref<{ label: string; value: number }[]>([]);

// 流水类型选项
const flowTypeOptions = [
  { label: '全部', value: undefined },
  { label: '售卖收益入账', value: 0 },
  { label: '提现冻结', value: 1 },
  { label: '提现成功扣减', value: 2 },
  { label: '提现失败解冻退回', value: 3 },
];

// 查询参数
const queryParams = reactive<MemberWalletFlowPageParams>({
  pageNo: 1,
  pageSize: 10,
  memberId: undefined,
  flowType: undefined,
  startTime: undefined,
  endTime: undefined,
});

// 时间范围
const dateRange = ref<[string, string] | null>(null);

// --- 辅助函数 ---
function getFlowTypeText(type: number): string {
  return FlowTypeMap[type]?.label || '未知';
}

function getFlowTypeType(type: number): string {
  return FlowTypeMap[type]?.type || 'info';
}

function getFlowSign(type: number): string {
  return FlowTypeMap[type]?.sign || '';
}

function formatAmount(amount: number): string {
  return `¥ ${(amount || 0).toFixed(2)}`;
}

function formatChangeAmount(amount: number, type: number): string {
  const sign = getFlowSign(type);
  const formatted = formatAmount(Math.abs(amount || 0));
  return sign === '+' ? `+${formatted}` : `-${formatted}`;
}



// --- 数据加载 ---
async function loadData() {
  // 处理时间范围
  if (dateRange.value && dateRange.value.length === 2) {
    queryParams.startTime = dateRange.value[0];
    queryParams.endTime = dateRange.value[1];
  } else {
    queryParams.startTime = undefined;
    queryParams.endTime = undefined;
  }

  try {
    loading.value = true;
    const res = await getMemberWalletFlowPageApi(queryParams);
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
async function handleView(row: MemberWalletFlow) {
  try {
    const res = await getMemberWalletFlowDetailApi(row.memberWalletFlowId);
    detailData.value = res;
    detailVisible.value = true;
  } catch {
    ElMessage.error('获取详情失败');
  }
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.memberId = undefined;
  queryParams.flowType = undefined;
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
      <el-row :gutter="16" class="mb-4">
        <el-col :span="8">
          <el-card shadow="hover" class="text-center">
            <div class="text-gray-500 text-sm">流水总数</div>
            <div class="text-2xl font-bold text-primary">{{ total }}</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" class="text-center">
            <div class="text-gray-500 text-sm">总入账金额</div>
            <div class="text-2xl font-bold text-success">
              {{ formatAmount(tableData.filter(item => item.flowType === 0 || item.flowType === 3).reduce((sum, item) => sum + (item.changeAmount || 0), 0)) }}
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" class="text-center">
            <div class="text-gray-500 text-sm">总出账金额</div>
            <div class="text-2xl font-bold text-danger">
              {{ formatAmount(tableData.filter(item => item.flowType === 1 || item.flowType === 2).reduce((sum, item) => sum + Math.abs(item.changeAmount || 0), 0)) }}
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 查询表单 -->
      <el-card shadow="never" class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="会员Id">
            <el-input v-model="queryParams.memberId" placeholder="请输入会员ID" clearable style="width: 180px" />
          </el-form-item>
          <el-form-item label="流水类型">
            <el-select v-model="queryParams.flowType" placeholder="全部" clearable style="width: 140px">
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
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              style="width: 260px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 -->
      <el-card shadow="never">
        <el-table
          v-loading="loading"
          :data="tableData"
          border
          stripe
          style="width: 100%"
        >
          <el-table-column prop="memberWalletFlowId" label="流水ID" min-width="90" align="center" />
          <el-table-column prop="batchNo" label="批次号" min-width="180" align="center" show-overflow-tooltip />
          <el-table-column prop="memberId" label="会员ID" min-width="80" align="center" />
          <el-table-column prop="flowType" label="流水类型" width="130" align="center">
            <template #default="{ row }">
              <el-tag :type="getFlowTypeType(row.flowType)" size="small">
                {{ getFlowTypeText(row.flowType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="changeAmount" label="变动金额" width="130" align="right">
            <template #default="{ row }">
              <span :class="row.flowType === 0 || row.flowType === 3 ? 'text-success' : 'text-danger'">
                {{ formatChangeAmount(row.changeAmount, row.flowType) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="beforeBalance" label="变动前余额" width="120" align="right">
            <template #default="{ row }">
              {{ formatAmount(row.beforeBalance) }}
            </template>
          </el-table-column>
          <el-table-column prop="afterBalance" label="变动后余额" width="120" align="right">
            <template #default="{ row }">
              <span class="font-medium">{{ formatAmount(row.afterBalance) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="relatedBizId" label="关联业务ID" width="100" align="center">
            <template #default="{ row }">
              {{ row.relatedBizId || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="150" align="left" show-overflow-tooltip />
          <el-table-column label="操作" width="80" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" :icon="View" @click="handleView(row)">详情</el-button>
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

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="资金流水详情" width="600px" append-to-body>
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="流水ID" :span="2">{{ detailData.memberWalletFlowId }}</el-descriptions-item>
        <el-descriptions-item label="批次号" :span="2">{{ detailData.batchNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="会员ID">{{ detailData.memberId }}</el-descriptions-item>
        <el-descriptions-item label="商户ID">{{ detailData.merchantId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="流水类型">
          <el-tag :type="getFlowTypeType(detailData.flowType)" size="small">
            {{ getFlowTypeText(detailData.flowType) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="关联业务ID">{{ detailData.relatedBizId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="变动金额">
          <span :class="detailData.flowType === 0 || detailData.flowType === 3 ? 'text-success' : 'text-danger'">
            {{ formatChangeAmount(detailData.changeAmount, detailData.flowType) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="变动前余额">{{ formatAmount(detailData.beforeBalance) }}</el-descriptions-item>
        <el-descriptions-item label="变动后余额">
          <span class="font-bold text-primary">{{ formatAmount(detailData.afterBalance) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailData.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped>
.text-primary { color: #409eff; }
.text-success { color: #67c23a; }
.text-danger { color: #f56c6c; }
.font-bold { font-weight: 600; }
</style>