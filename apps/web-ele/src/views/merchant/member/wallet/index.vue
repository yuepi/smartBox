<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Edit, View } from '@element-plus/icons-vue';
import { Page } from '@vben/common-ui';

import {
  getMemberWalletPageApi,
  getMemberWalletDetailApi,
  updateWalletStatusApi,
  WalletStatusMap,
  type MemberWallet,
  type MemberWalletPageParams,
} from '#/api/member/memberWallet';

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<MemberWallet[]>([]);
const total = ref(0);

// 详情弹窗
const detailVisible = ref(false);
const detailData = ref<MemberWallet | null>(null);

// 会员选项
const memberOptions = ref<{ label: string; value: number }[]>([]);

// 状态选项
const statusOptions = [
  { label: '全部', value: undefined },
  { label: '正常', value: 0 },
  { label: '冻结', value: 1 },
];

// 查询参数
const queryParams = reactive<MemberWalletPageParams>({
  pageNo: 1,
  pageSize: 10,
  memberId: undefined,
  status: undefined,
  minBalance: undefined,
  maxBalance: undefined,
});

// 余额范围
const balanceRange = ref<[number | null, number | null]>([null, null]);

// --- 辅助函数 ---
function getStatusText(status: number): string {
  return WalletStatusMap[status]?.label || '未知';
}

function getStatusType(status: number): string {
  return WalletStatusMap[status]?.type || 'info';
}

function formatBalance(balance: number): string {
  return `¥ ${(balance || 0).toFixed(2)}`;
}



// --- 数据加载 ---
async function loadData() {
  if (balanceRange.value[0] !== null) queryParams.minBalance = balanceRange.value[0];
  else queryParams.minBalance = undefined;
  if (balanceRange.value[1] !== null) queryParams.maxBalance = balanceRange.value[1];
  else queryParams.maxBalance = undefined;

  try {
    loading.value = true;
    const res = await getMemberWalletPageApi(queryParams);
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
async function handleView(row: MemberWallet) {
  try {
    const res = await getMemberWalletDetailApi(row.memberWalletId);
    detailData.value = res;
    detailVisible.value = true;
  } catch {
    ElMessage.error('获取详情失败');
  }
}

// --- 冻结/解冻 ---
async function handleStatusToggle(row: MemberWallet) {
  const newStatus = row.status === 0 ? 1 : 0;
  const action = newStatus === 0 ? '解冻' : '冻结';

  try {
    await ElMessageBox.confirm(`确定要${action}该会员钱包吗？`, '提示', { type: 'warning' });
    await updateWalletStatusApi(row.memberWalletId, newStatus);
    ElMessage.success(`${action}成功`);
    loadData();

  } catch {
    // 取消操作
  }
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.memberId = undefined;
  queryParams.status = undefined;
  balanceRange.value = [null, null];
  queryParams.minBalance = undefined;
  queryParams.maxBalance = undefined;
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
            <div class="text-gray-500 text-sm">会员总数</div>
            <div class="text-2xl font-bold text-primary">{{ total }}</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" class="text-center">
            <div class="text-gray-500 text-sm">总余额</div>
            <div class="text-2xl font-bold text-success">
              {{formatBalance(tableData.reduce((sum, item) => sum + (item.balance || 0), 0))}}
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" class="text-center">
            <div class="text-gray-500 text-sm">总冻结金额</div>
            <div class="text-2xl font-bold text-warning">
              {{formatBalance(tableData.reduce((sum, item) => sum + (item.freezeBalance || 0), 0))}}
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 查询表单 -->
      <el-card shadow="never" class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="会员Id">
            <el-input v-model="queryParams.memberId" placeholder="请输入会员ID" clearable style="width: 150px"
              @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="钱包状态">
            <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 100px">
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="余额范围">
            <el-input-number v-model="balanceRange[0]" :min="0" placeholder="最低" controls-position="right"
              style="width: 120px" />
            <span class="mx-2">-</span>
            <el-input-number v-model="balanceRange[1]" :min="0" placeholder="最高" controls-position="right"
              style="width: 120px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 -->
      <el-card shadow="never">
        <el-table v-loading="loading" :data="tableData" border stripe style="width: 100%">
          <el-table-column prop="memberWalletId" label="钱包ID" width="80" align="center" />
          <el-table-column prop="memberId" label="会员ID" width="80" align="center" />
          <el-table-column prop="balance" label="可用余额" min-width="140" align="right">
            <template #default="{ row }">
              <span class="font-medium text-success">{{ formatBalance(row.balance) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="freezeBalance" label="冻结余额" min-width="140" align="right">
            <template #default="{ row }">
              <span class="text-warning">{{ formatBalance(row.freezeBalance) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="钱包状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" :icon="View" @click="handleView(row)">详情</el-button>
              <el-button v-if="row.status === 0" link type="danger" @click="handleStatusToggle(row)">
                冻结
              </el-button>
              <el-button v-else link type="success" @click="handleStatusToggle(row)">解冻</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="flex justify-end mt-4">
          <el-pagination v-model:current-page="queryParams.pageNo" v-model:page-size="queryParams.pageSize"
            :total="total" :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadData" @current-change="loadData" />
        </div>
      </el-card>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="钱包详情" width="500px" append-to-body>
      <el-descriptions :column="1" border v-if="detailData">
        <el-descriptions-item label="钱包ID">{{ detailData.memberWalletId }}</el-descriptions-item>
        <el-descriptions-item label="会员ID">{{ detailData.memberId }}</el-descriptions-item>
        <el-descriptions-item label="可用余额">{{ formatBalance(detailData.balance) }}</el-descriptions-item>
        <el-descriptions-item label="冻结余额">{{ formatBalance(detailData.freezeBalance) }}</el-descriptions-item>
        <el-descriptions-item label="钱包状态">
          <el-tag :type="getStatusType(detailData.status)" size="small">
            {{ getStatusText(detailData.status) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
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

.font-bold {
  font-weight: 600;
}
</style>