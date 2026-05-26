<!-- views/merchant/info/index.vue -->
<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from "vue";

import { Page } from "@vben/common-ui";
import { useUserStore } from "@vben/stores";

import { ElMessage } from "element-plus";
import QRCode from "qrcode";

import { h5PayApi, nativePayApi, refundByMerchantApi } from "#/api/common/pay";
import {
  editMerchantConfigApi,
  getMerchantAccountApi,
  getMerchantAccountFlowPageApi,
  getMerchantConfigDetailApi,
  getMerchantInfoApi,
  getMerchantRechargePageApi,
  type MerchantAccount,
  type MerchantAccountFlow,
  type MerchantAccountFlowPageParams,
  type MerchantConfig,
  type MerchantInfo,
  type MerchantRecharge,
  type MerchantRechargePageParams,
} from "#/api/system/merchant";

import MerchantFlowTable from '../components/MerchantFlowTable.vue';
import MerchantRechargeTable from '../components/MerchantRechargeTable.vue';
// 添加 ref
const rechargeTableRef = ref();
const flowTableRef = ref();

// 刷新数据的方法
function refreshRechargeData() {
  rechargeTableRef.value?.loadData();
}

function refreshFlowData() {
  flowTableRef.value?.loadData();
}

// --- 状态变量 ---
const activeTab = ref("basic");
const merchantId = ref(0);

// 充值弹窗
const rechargeDialogVisible = ref(false);
const rechargeAmount = ref(0);
const rechargeSubmitting = ref(false);
const qrcodeUrl = ref("");
const h5PayUrl = ref("");

// 基本信息
const infoLoading = ref(false);
const merchantInfo = ref<MerchantInfo | null>(null);

// 商户配置
const configLoading = ref(false);
const configData = ref<MerchantConfig | null>(null);
const configSubmitting = ref(false);

// 账户信息
const accountLoading = ref(false);
const accountInfo = ref<MerchantAccount | null>(null);

// 充值订单
const rechargeLoading = ref(false);
const rechargeData = ref<MerchantRecharge[]>([]);
const rechargeTotal = ref(0);
const rechargeDateRange = ref<string[]>([]);
const rechargeDetailVisible = ref(false);
const rechargeDetail = ref<MerchantRecharge | null>(null);

let closeTimer: null | ReturnType<typeof setTimeout> = null;

// 资金流水
const flowLoading = ref(false);
const flowData = ref<MerchantAccountFlow[]>([]);
const flowTotal = ref(0);
const flowDateRange = ref<string[]>([]);

// 弹窗手动关闭时清理定时器
const handleDialogClose = () => {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  rechargeDialogVisible.value = false;
};

// 充值订单查询参数
const rechargeParams = reactive<MerchantRechargePageParams>({
  pageNo: 1,
  pageSize: 10,
  merchantId: undefined,
  rechargeNo: undefined,
  status: undefined,
  refundStatus: undefined,
  startTime: undefined,
  endTime: undefined,
});

// 资金流水查询参数
const flowParams = reactive<MerchantAccountFlowPageParams>({
  pageNo: 1,
  pageSize: 10,
  merchantId: undefined,
  changeType: undefined,
  startTime: undefined,
  endTime: undefined,
});

// 选项
const payStatusOptions = [
  { label: "待支付", value: 0 },
  { label: "支付中", value: 1 },
  { label: "已支付", value: 2 },
  { label: "支付失败", value: 3 },
];

const refundStatusOptions = [
  { label: "未退款", value: 0 },
  { label: "退款中", value: 1 },
  { label: "已退款", value: 2 },
  { label: "退款失败", value: 3 },
];

const changeTypeOptions = [
  { label: "充值到账", value: 0, type: "success" },
  { label: "平台服务费扣减", value: 1, type: "danger" },
  { label: "会员提现扣款", value: 2, type: "warning" },
];

// --- 计算属性 ---
const totalRechargeAmount = computed(() => {
  return rechargeData.value
    .filter((item) => item.status === 2)
    .reduce((sum, item) => sum + (item.amount || 0), 0);
});

const totalExpenseAmount = computed(() => {
  return flowData.value
    .filter((item) => item.changeAmount < 0)
    .reduce((sum, item) => sum + Math.abs(item.changeAmount || 0), 0);
});

// --- 辅助函数 ---
function formatAmount(amount: number): string {
  if (amount === undefined || amount === null) return "¥ 0.00";
  return `¥ ${amount.toFixed(2)}`;
}

// 检测是否为手机浏览器
function isMobileDevice(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    "android",
    "iphone",
    "ipad",
    "ipod",
    "windows phone",
    "mobile",
  ];
  return mobileKeywords.some((keyword) => ua.includes(keyword));
}

// 打开充值弹窗
function openRechargeDialog() {
  rechargeAmount.value = 0;
  qrcodeUrl.value = "";
  h5PayUrl.value = "";
  rechargeDialogVisible.value = true;
}

// 执行充值
async function handleRecharge() {
  if (rechargeAmount.value <= 0) {
    ElMessage.warning("请输入充值金额");
    return;
  }

  rechargeSubmitting.value = true;
  try {
    const isMobile = isMobileDevice();
    // const clientIp = await getClientIp();
    const clientIp = "";

    if (isMobile) {
      // H5 支付（手机浏览器）
      const res = await h5PayApi({
        payAmount: rechargeAmount.value,
        clientIp,
        merchantId: merchantId.value,
      });

      if (res?.h5Url) {
        // 跳转到 H5 支付页面
        window.location.href = res.h5Url;
      } else {
        ElMessage.error("获取支付链接失败");
      }
    } else {
      // TODO: PC端 Native 支付
      const res = await nativePayApi({
        payAmount: rechargeAmount.value,
      });

      if (res?.codeUrl) {
        // 将 codeUrl 生成二维码展示
        await generateQrcode(res.codeUrl);
        ElMessage.info("请使用微信扫码支付");
        closeTimer = setTimeout(() => {
          if (rechargeDialogVisible.value) {
            rechargeDialogVisible.value = false;
            loadAccountInfo();
            loadRechargeData();
            ElMessage.info("支付窗口已关闭，可在充值订单中查看支付结果");
          }
        }, 120_000);
      } else {
        ElMessage.error("获取支付二维码失败");
      }
    }
  } catch (error) {
    console.error("充值失败", error);
    ElMessage.error("充值失败");
  } finally {
    rechargeSubmitting.value = false;
  }
}

// 退款弹窗
const refundDialogVisible = ref(false);
const refundSubmitting = ref(false);
const currentRechargeOrder = ref<MerchantRecharge | null>(null);
const refundAmount = ref(0);

// 打开退款弹窗
function openRefundDialog(row: MerchantRecharge) {
  // 只有已支付的订单才能退款
  if (row.status !== 2) {
    ElMessage.warning("只有已支付的订单才能退款");
    return;
  }
  // 检查是否已退款
  if (row.refundStatus === 2) {
    ElMessage.warning("该订单已完成退款");
    return;
  }
  currentRechargeOrder.value = row;
  refundAmount.value = 0;
  refundDialogVisible.value = true;
}

// 执行退款
async function handleRefund() {
  if (refundAmount.value <= 0) {
    ElMessage.warning("请输入退款金额");
    return;
  }

  const order = currentRechargeOrder.value;
  if (!order) return;

  if (refundAmount.value > order.amount) {
    ElMessage.warning(`退款金额不能超过订单金额 ${formatAmount(order.amount)}`);
    return;
  }

  refundSubmitting.value = true;
  try {
    await refundByMerchantApi({
      outTradeNo: order.rechargeNo, // 商户订单号
      refundAmount: refundAmount.value,
      totalAmount: order.amount,
    });
    ElMessage.success("退款申请已提交");
    refundDialogVisible.value = false;
    // 刷新充值订单列表
    loadRechargeData();
  } catch {
    ElMessage.error("退款失败");
  } finally {
    refundSubmitting.value = false;
  }
}

// 生成二维码（PC端扫码支付）
async function generateQrcode(url: string) {
  if (!url) return;
  try {
    const qrcodeCanvas = await QRCode.toDataURL(url, { width: 200, margin: 2 });
    qrcodeUrl.value = qrcodeCanvas;
  } catch (error) {
    console.error("生成二维码失败", error);
  }
}

function getPayStatusText(status: number): string {
  const map: Record<number, string> = {
    0: "待支付",
    1: "支付中",
    2: "已支付",
    3: "支付失败",
  };
  return map[status] || "未知";
}

function getPayStatusType(status: number): string {
  const map: Record<number, string> = {
    0: "warning",
    1: "info",
    2: "success",
    3: "danger",
  };
  return map[status] || "info";
}

function getRefundStatusText(status: number): string {
  const map: Record<number, string> = {
    0: "未退款",
    1: "退款中",
    2: "已退款",
    3: "退款失败",
  };
  return map[status] || "未知";
}

function getRefundStatusType(status: number): string {
  const map: Record<number, string> = {
    0: "info",
    1: "warning",
    2: "success",
    3: "danger",
  };
  return map[status] || "info";
}

function getChangeTypeText(type: number): string {
  const map: Record<number, string> = {
    0: "充值到账",
    1: "平台服务费扣减",
    2: "会员提现扣款",
  };
  return map[type] || "未知";
}

function getChangeTypeType(type: number): string {
  const map: Record<number, string> = {
    0: "success",
    1: "danger",
    2: "warning",
  };
  return map[type] || "info";
}

// --- 数据加载 ---
async function loadMerchantInfo() {
  infoLoading.value = true;
  try {
    const res = await getMerchantInfoApi(merchantId.value);
    merchantInfo.value = res;
  } catch {
    ElMessage.error("获取商户信息失败");
  } finally {
    infoLoading.value = false;
  }
}

async function loadAccountInfo() {
  accountLoading.value = true;
  try {
    const res = await getMerchantAccountApi(merchantId.value);
    accountInfo.value = res;
  } catch {
    ElMessage.error("获取账户信息失败");
  } finally {
    accountLoading.value = false;
  }
}

async function loadRechargeData() {
  rechargeParams.merchantId = merchantId.value;

  // 处理时间范围
  if (rechargeDateRange.value && rechargeDateRange.value.length === 2) {
    rechargeParams.startTime = rechargeDateRange.value[0];
    rechargeParams.endTime = rechargeDateRange.value[1];
  } else {
    rechargeParams.startTime = undefined;
    rechargeParams.endTime = undefined;
  }

  rechargeLoading.value = true;
  try {
    const res = await getMerchantRechargePageApi(rechargeParams);
    rechargeData.value = res.records || [];
    rechargeTotal.value = res.total || 0;
  } catch {
    ElMessage.error("加载充值订单失败");
  } finally {
    rechargeLoading.value = false;
  }
}

async function loadFlowData() {
  flowParams.merchantId = merchantId.value;

  // 处理时间范围
  if (flowDateRange.value && flowDateRange.value.length === 2) {
    flowParams.startTime = flowDateRange.value[0];
    flowParams.endTime = flowDateRange.value[1];
  } else {
    flowParams.startTime = undefined;
    flowParams.endTime = undefined;
  }

  flowLoading.value = true;
  try {
    const res = await getMerchantAccountFlowPageApi(flowParams);
    flowData.value = res.records || [];
    flowTotal.value = res.total || 0;
  } catch {
    ElMessage.error("加载资金流水失败");
  } finally {
    flowLoading.value = false;
  }
}

async function loadConfigData(merchantId: number) {
  configLoading.value = true;
  try {
    const res = await getMerchantConfigDetailApi(merchantId);
    configData.value = res;
  } catch {
    ElMessage.error("获取商户配置失败");
  } finally {
    configLoading.value = false;
  }
}

async function handleSaveConfig() {
  if (!configData.value) return;

  configSubmitting.value = true;
  try {
    await editMerchantConfigApi({
      merchantConfigId: configData.value.merchantConfigId,
      orderWalletSync: configData.value.orderWalletSync,
      status: configData.value.status,
    });
    ElMessage.success("保存成功");
  } catch {
    ElMessage.error("保存失败");
  } finally {
    configSubmitting.value = false;
  }
}

// 充值订单详情
function handleViewRecharge(row: MerchantRecharge) {
  rechargeDetail.value = row;
  rechargeDetailVisible.value = true;
}

// 重置查询
function resetRechargeQuery() {
  rechargeParams.rechargeNo = undefined;
  rechargeParams.status = undefined;
  rechargeParams.refundStatus = undefined;
  rechargeDateRange.value = [];
  rechargeParams.startTime = undefined;
  rechargeParams.endTime = undefined;
  rechargeParams.pageNo = 1;
  loadRechargeData();
}

function resetFlowQuery() {
  flowParams.changeType = undefined;
  flowDateRange.value = [];
  flowParams.startTime = undefined;
  flowParams.endTime = undefined;
  flowParams.pageNo = 1;
  loadFlowData();
}

// 监听 Tab 切换，懒加载数据
watch(activeTab, (newTab) => {
  if (newTab === "account" && !accountInfo.value) {
    loadAccountInfo();
  } else if (newTab === "recharge" && rechargeData.value.length === 0) {
    loadRechargeData();
  } else if (newTab === "flow" && flowData.value.length === 0) {
    loadFlowData();
  } else if (newTab === "config" && !configData.value) {
    loadConfigData(merchantId.value);
  }
});

onMounted(async () => {
  const userStore = useUserStore();
  merchantId.value = userStore.userInfo?.merchantId || 0;
  await loadMerchantInfo();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <!-- 统计卡片 -->
      <el-row :gutter="16" class="mb-4">
        <el-col :span="8">
          <el-card
            shadow="hover"
            class="text-center"
            @click="activeTab = 'account'"
          >
            <div class="text-gray-500 text-sm">账户余额</div>
            <div class="text-2xl font-bold text-primary">
              {{ formatAmount(accountInfo?.balance) }}
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card
            shadow="hover"
            class="text-center"
            @click="activeTab = 'recharge'"
          >
            <div class="text-gray-500 text-sm">累计充值</div>
            <div class="text-2xl font-bold text-success">
              {{ formatAmount(totalRechargeAmount) }}
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card
            shadow="hover"
            class="text-center"
            @click="activeTab = 'flow'"
          >
            <div class="text-gray-500 text-sm">总支出</div>
            <div class="text-2xl font-bold text-danger">
              {{ formatAmount(totalExpenseAmount) }}
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Tab 页 -->
      <el-card shadow="never">
        <el-tabs v-model="activeTab">
          <!-- 基本信息 Tab -->
          <el-tab-pane label="基本信息" name="basic">
            <div class="basic-info" v-loading="infoLoading">
              <el-descriptions :column="2" border v-if="merchantInfo">
                <el-descriptions-item label="商户ID">
                  {{ merchantInfo.merchantId }}
                </el-descriptions-item>
                <el-descriptions-item label="商户名称">
                  {{ merchantInfo.merchantName }}
                </el-descriptions-item>
                <el-descriptions-item label="商户编码">
                  {{ merchantInfo.merchantCode }}
                </el-descriptions-item>
                <el-descriptions-item label="联系人">
                  {{ merchantInfo.contact || "-" }}
                </el-descriptions-item>
                <el-descriptions-item label="联系电话">
                  {{ merchantInfo.phone || "-" }}
                </el-descriptions-item>
                <el-descriptions-item label="商户状态">
                  <el-tag
                    :type="merchantInfo.status === 0 ? 'success' : 'danger'"
                    size="small"
                  >
                    {{ merchantInfo.status === 0 ? "启用" : "禁用" }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="所在区域">
                  {{ merchantInfo.province }} {{ merchantInfo.city }}
                  {{ merchantInfo.district }}
                </el-descriptions-item>
                <el-descriptions-item label="详细地址" :span="2">
                  {{ merchantInfo.detailAddress || "-" }}
                </el-descriptions-item>
                <el-descriptions-item label="地理位置" :span="2">
                  <span v-if="merchantInfo.longitude && merchantInfo.latitude">
                    经度：{{ merchantInfo.longitude }}，纬度：{{
                      merchantInfo.latitude
                    }}
                  </span>
                  <span v-else>-</span>
                </el-descriptions-item>
                <el-descriptions-item label="商户Logo" :span="2">
                  <el-image
                    v-if="merchantInfo.logo"
                    :src="merchantInfo.logo"
                    :preview-src-list="[merchantInfo.logo]"
                    fit="cover"
                    style="width: 60px; height: 60px; border-radius: 8px"
                  />
                  <span v-else>-</span>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>

          <!-- 账户信息 Tab -->
          <el-tab-pane label="账户信息" name="account">
            <div class="account-info" v-loading="accountLoading">
              <el-descriptions :column="2" border v-if="accountInfo">
                <el-descriptions-item label="账户ID">
                  {{ accountInfo.merchantAccountId }}
                </el-descriptions-item>
                <el-descriptions-item label="商户ID">
                  {{ accountInfo.merchantId }}
                </el-descriptions-item>
                <el-descriptions-item
                  label="可用余额"
                  label-class-name="font-medium"
                >
                  <span class="text-lg font-bold text-primary">{{
                    formatAmount(accountInfo.balance)
                  }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="账户状态">
                  <el-tag
                    :type="accountInfo.status === 0 ? 'success' : 'danger'"
                    size="small"
                  >
                    {{ accountInfo.status === 0 ? "正常" : "冻结" }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="操作" :span="2">
                  <el-button
                    type="primary"
                    size="small"
                    @click="openRechargeDialog"
                  >
                    充值
                  </el-button>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>

          <!-- 充值订单 Tab -->
          <el-tab-pane label="充值订单" name="recharge">
             <MerchantRechargeTable :merchant-id="merchantId" ref="rechargeTableRef" />
          </el-tab-pane>

          <!-- 资金流水 Tab -->
          <el-tab-pane label="资金流水" name="flow">
           <MerchantFlowTable :merchant-id="merchantId" ref="flowTableRef" />
          </el-tab-pane>
          <!-- 商户配置 Tab -->
          <el-tab-pane label="商户配置" name="config">
            <div v-loading="configLoading" class="config-form">
              <el-form
                v-if="configData"
                :model="configData"
                label-width="180px"
                label-position="right"
              >
                <el-form-item label="回收订单审核方式">
                  <el-select
                    v-model="configData.orderWalletSync"
                    placeholder="请选择"
                    style="width: 100%"
                  >
                    <el-option label="不需要审核，直接到钱包" :value="0" />
                    <el-option label="需要审核，到预计收益" :value="1" />
                  </el-select>
                  <div class="text-gray-400 text-xs mt-1">
                    选择后影响回收订单的收益结算方式
                  </div>
                </el-form-item>
                <!-- <el-form-item label="配置状态">
                  <el-radio-group v-model="configData.status">
                    <el-radio :value="0">启用</el-radio>
                    <el-radio :value="1">禁用</el-radio>
                  </el-radio-group>
                </el-form-item> -->
                <el-form-item>
                  <el-button
                    type="primary"
                    :loading="configSubmitting"
                    @click="handleSaveConfig"
                  >
                    保存配置
                  </el-button>
                </el-form-item>
              </el-form>
              <el-empty v-else description="暂无配置信息" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>

    <!-- 充值弹窗 -->
    <el-dialog
      v-model="rechargeDialogVisible"
      title="商户充值"
      width="400px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      append-to-body
      @close="handleDialogClose"
    >
      <div class="recharge-dialog">
        <!-- 未生成二维码时：显示充值表单 -->
        <div v-if="!qrcodeUrl" class="recharge-form">
          <el-form label-width="80px">
            <el-form-item label="充值金额">
              <el-input-number
                v-model="rechargeAmount"
                :min="0.01"
                :precision="2"
                :step="10"
                placeholder="请输入充值金额"
                style="width: 200px"
              />
              <span class="ml-2">元</span>
            </el-form-item>
            <div class="text-gray-400 text-sm mt-2">提示：支持微信支付</div>
          </el-form>
        </div>

        <!-- 已生成二维码时：显示二维码（PC端） -->
        <div v-else class="qrcode-content">
          <div class="flex justify-center mb-4">
            <img
              :src="qrcodeUrl"
              alt="支付二维码"
              style="width: 200px; height: 200px"
            />
          </div>
          <div class="text-center text-gray-500 text-sm">
            请使用微信扫码支付
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="rechargeDialogVisible = false">
          {{ qrcodeUrl ? "关闭" : "取消" }}
        </el-button>
        <el-button
          v-if="!qrcodeUrl"
          type="primary"
          :loading="rechargeSubmitting"
          @click="handleRecharge"
        >
          确认充值
        </el-button>
      </template>
    </el-dialog>

    <!-- 充值订单详情弹窗 -->
    <el-dialog
      v-model="rechargeDetailVisible"
      title="充值订单详情"
      width="600px"
      append-to-body
    >
      <el-descriptions :column="2" border v-if="rechargeDetail">
        <el-descriptions-item label="充值ID">
          {{ rechargeDetail.merchantRechargeId }}
        </el-descriptions-item>
        <el-descriptions-item label="充值单号">
          {{ rechargeDetail.rechargeNo }}
        </el-descriptions-item>
        <el-descriptions-item label="充值金额">
          <span class="text-success">{{
            formatAmount(rechargeDetail.amount)
          }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="支付状态">
          <el-tag :type="getPayStatusType(rechargeDetail.status)" size="small">
            {{ getPayStatusText(rechargeDetail.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="充值人">
          {{ rechargeDetail.rechargeUserName || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="支付时间">
          {{ rechargeDetail.payTime || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="退款状态">
          <el-tag
            :type="getRefundStatusType(rechargeDetail.refundStatus)"
            size="small"
          >
            {{ getRefundStatusText(rechargeDetail.refundStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="退款金额">
          {{
            rechargeDetail.totalRefundAmount > 0
              ? formatAmount(rechargeDetail.totalRefundAmount)
              : "-"
          }}
        </el-descriptions-item>
        <el-descriptions-item label="退款时间">
          {{ rechargeDetail.refundTime || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="支付请求ID" :span="2">
          {{ rechargeDetail.payRequestId || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="退款请求ID" :span="2">
          {{ rechargeDetail.refundRequestId || "-" }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="rechargeDetailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 退款弹窗 -->
    <el-dialog
      v-model="refundDialogVisible"
      title="订单退款"
      width="450px"
      append-to-body
    >
      <el-form label-width="100px">
        <el-form-item label="订单金额">
          <span class="font-bold text-primary">
            {{ formatAmount(currentRechargeOrder?.amount || 0) }}
          </span>
        </el-form-item>
        <el-form-item label="退款金额" required>
          <el-input-number
            v-model="refundAmount"
            :min="0.01"
            :precision="2"
            :step="10"
            :max="currentRechargeOrder?.amount"
            placeholder="请输入退款金额"
            style="width: 100%"
          />
          <div class="text-gray-400 text-xs mt-1">
            最高可退 {{ formatAmount(currentRechargeOrder?.amount || 0) }}
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="refundSubmitting"
          @click="handleRefund"
        >
          确认退款
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

.font-bold {
  font-weight: 600;
}
</style>
