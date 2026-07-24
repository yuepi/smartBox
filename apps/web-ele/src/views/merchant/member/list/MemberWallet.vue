<script lang="ts" setup>
import type { Member } from '#/api/member/member';
import type { MemberWalletFlow, MemberWalletFlowPageParams } from '#/api/member/memberWalletFlow';

import { getMemberWalletDetailApi, updateWalletStatusApi } from '#/api/member/memberWallet';
import { getMemberWalletFlowPageApi } from '#/api/member/memberWalletFlow';

const visible = ref(false);
const loading = ref(false);
const flowLoading = ref(false);
const currentMember = ref<Member | null>(null);
const walletInfo = ref<any>(null);
const walletActiveTab = ref('info');

// 流水记录
const flowData = ref<MemberWalletFlow[]>([]);
const flowTotal = ref(0);
const flowDateRange = ref<string[]>([]);
const flowQueryParams = reactive<MemberWalletFlowPageParams>({
  pageNo: 1,
  pageSize: 10,
  memberId: undefined,
  flowType: undefined,
  startTime: undefined,
  endTime: undefined,
});

const flowTypeOptions = [
  { label: '全部', value: undefined },
  { label: '售卖收益入账', value: 0 },
  { label: '提现冻结', value: 1 },
  { label: '提现成功扣减', value: 2 },
  { label: '提现失败解冻退回', value: 3 },
];

function getWalletStatusText(status: number): string {
  const map: Record<number, string> = { 0: '正常', 1: '冻结' };
  return map[status] || '未知';
}

function getWalletStatusType(status: number): string {
  const map: Record<number, string> = { 0: 'success', 1: 'danger' };
  return map[status] || 'info';
}

function formatBalance(balance: number): string {
  return `¥ ${(balance || 0).toFixed(2)}`;
}

function getFlowTypeText(type: number): string {
  const map: Record<number, string> = {
    0: '售卖收益入账',
    1: '提现冻结',
    2: '提现成功扣减',
    3: '提现失败解冻退回',
  };
  return map[type] || '未知';
}

function getFlowTypeType(type: number): string {
  const map: Record<number, string> = { 0: 'success', 1: 'warning', 2: 'danger', 3: 'info' };
  return map[type] || 'info';
}

function getFlowSign(type: number): string {
  const map: Record<number, string> = { 0: '+', 1: '-', 2: '-', 3: '+' };
  return map[type] || '';
}

function formatChangeAmount(amount: number, type: number): string {
  const sign = getFlowSign(type);
  const formatted = formatBalance(Math.abs(amount || 0));
  return sign === '+' ? `+${formatted}` : `-${formatted}`;
}

async function loadWalletInfo(memberId: number) {
  loading.value = true;
  try {
    const res = await getMemberWalletDetailApi(memberId);
    walletInfo.value = res;
  } catch {
    ElMessage.error('获取钱包信息失败');
  } finally {
    loading.value = false;
  }
}

async function loadFlowData(memberId: number) {
  flowLoading.value = true;
  flowQueryParams.memberId = memberId;

  if (flowDateRange.value?.length === 2) {
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
  } catch {
    ElMessage.error('加载流水记录失败');
  } finally {
    flowLoading.value = false;
  }
}

async function handleWalletStatusToggle() {
  if (!walletInfo.value) return;
  const newStatus = walletInfo.value.status === 0 ? 1 : 0;
  const action = newStatus === 0 ? '解冻' : '冻结';

  try {
    await ElMessageBox.confirm(`确定要${action}该会员钱包吗？`, '提示', { type: 'warning' });
    await updateWalletStatusApi(walletInfo.value.memberWalletId, newStatus);
    ElMessage.success(`${action}成功`);
    await loadWalletInfo(currentMember.value!.memberId);
  } catch {
    // 取消操作
  }
}

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

async function open(row: Member) {
  currentMember.value = row;
  walletActiveTab.value = 'info';
  visible.value = true;
  await loadWalletInfo(row.memberId);
  await loadFlowData(row.memberId);
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="`钱包管理 - ${currentMember?.nickname || currentMember?.mobile}`"
    width="900px"
    append-to-body
  >
    <el-tabs v-model="walletActiveTab">
      <!-- 钱包信息 Tab -->
      <el-tab-pane label="钱包信息" name="info">
        <div v-loading="loading">
          <el-descriptions :column="2" border v-if="walletInfo">
            <el-descriptions-item label="钱包ID">{{ walletInfo.memberWalletId }}</el-descriptions-item>
            <el-descriptions-item label="会员ID">{{ walletInfo.memberId }}</el-descriptions-item>
            <el-descriptions-item label="可用余额">
              <span class="text-success font-bold text-lg">{{ formatBalance(walletInfo.balance) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="冻结余额">
              <span class="text-warning">{{ formatBalance(walletInfo.freezeBalance) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="钱包状态">
              <el-tag :type="getWalletStatusType(walletInfo.status)" size="small">
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
              <el-button v-else type="success" size="small" @click="handleWalletStatusToggle">解冻钱包</el-button>
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
              <el-button type="primary" @click="handleFlowQuery">查询</el-button>
              <el-button @click="resetFlowQuery">重置</el-button>
            </el-form-item>
          </el-form>
        </div>

        <el-table v-loading="flowLoading" :data="flowData" border stripe style="width: 100%">
          <el-table-column prop="memberWalletFlowId" label="流水ID" width="90" align="center" />
          <el-table-column prop="batchNo" label="批次号" min-width="180" align="center" show-overflow-tooltip />
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
            <template #default="{ row }">{{ formatBalance(row.beforeBalance) }}</template>
          </el-table-column>
          <el-table-column prop="afterBalance" label="变动后余额" width="120" align="right">
            <template #default="{ row }"><span class="font-medium">{{ formatBalance(row.afterBalance) }}</span></template>
          </el-table-column>
          <el-table-column prop="createTime" label="发生时间" width="160" align="center" />
          <el-table-column prop="remark" label="备注" min-width="150" align="left" show-overflow-tooltip />
        </el-table>

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
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
