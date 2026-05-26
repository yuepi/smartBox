<script lang="ts" setup>
import { nextTick, onMounted, reactive, ref } from "vue";

import { Page } from "@vben/common-ui";

import {
  Delete,
  Edit,
  House,
  Plus,
  Refresh,
  Search,
  Wallet,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import {refundByMerchantApi } from "#/api/common/pay";
import { getPlatMenuListApi } from "#/api/system/menu";
import {
  addPlatMerchantApi,
  deletePlatMerchantApi,
  editPlatMerchantApi,
  editPlatMerchantConfigApi,
  getPlatMerchantAccountApi,
  getPlatMerchantAccountFlowPageApi,
  getPlatMerchantConfigDetailApi,
  getPlatMerchantDetailApi,
  getPlatMerchantPageApi,
  getPlatMerchantRechargePageApi,
  type Merchant,
  type MerchantAccountFlow,
  type MerchantAccountFlowPageParams,
  type MerchantConfig,
  type MerchantPageParams,
  type MerchantRecharge,
  type MerchantRechargePageParams,
} from "#/api/system/merchant";
import AreaCascader from "#/components/AreaCascader/index.vue";
import MapPicker from "#/components/MapPicker/index.vue";

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Merchant[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const location = ref<null | { lat: number; lng: number }>(null);
const activeTab = ref("basic"); // 当前激活的tab
const menuTreeRef = ref(); // 树形组件引用
const menuTreeData = ref<any[]>([]); // 菜单树数据
const menuLoading = ref(false); // 菜单加载状态

// 表单弹窗控制
const formVisible = ref(false);
const formTitle = ref("");
const formData = ref<Partial<Merchant>>({});
const formSubmitting = ref(false);

// 账户详情弹窗控制
const accountDialogVisible = ref(false);
const accountLoading = ref(false);
const currentMerchant = ref<Merchant | null>(null);
const accountDetail = ref<null | {
  balance: number;
  merchantAccountId: number;
  merchantId: number;
  status: number;
}>(null);

// 商户配置
const configLoading = ref(false);
const configData = ref<MerchantConfig | null>(null);
const configSubmitting = ref(false);

// 充值订单
const rechargeLoading = ref(false);
const rechargeData = ref<MerchantRecharge[]>([]);
const rechargeTotal = ref(0);
const rechargeDateRange = ref<string[]>([]);
const rechargeDetailVisible = ref(false);
const rechargeDetail = ref<MerchantRecharge | null>(null);

// 资金流水
const flowLoading = ref(false);
const flowData = ref<MerchantAccountFlow[]>([]);
const flowTotal = ref(0);
const flowDateRange = ref<string[]>([]);

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

// 在 formatBalance 函数后面添加
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

// 状态选项
const statusOptions = [
  { label: "启用", value: 0 },
  { label: "禁用", value: 1 },
];

// 查询参数
const queryParams = reactive<MerchantPageParams>({
  pageNo: 1,
  pageSize: 10,
  merchantName: undefined,
  merchantCode: undefined,
  contact: undefined,
  phone: undefined,
  status: undefined,
});

const areaCodes = ref("110000,110100,110105"); // 北京市-北京市-海淀区

function handleAreaChange(codes: string) {
  console.log("选中的区域编码:", codes);
  // 同步省市区编码到 formData
  if (codes) {
    const { provinceCode, cityCode, districtCode } = parseAreaCodes(codes);
    formData.value.provinceCode = provinceCode;
    formData.value.cityCode = cityCode;
    formData.value.districtCode = districtCode;
  } else {
    formData.value.provinceCode = "";
    formData.value.cityCode = "";
    formData.value.districtCode = "";
  }
}

// 加载菜单树
async function loadMenuTree() {
  try {
    menuLoading.value = true;

    // 1. 请求商户菜单
    const res = await getPlatMenuListApi({ platformType: 1 });
    // 转换成树形结构
    menuTreeData.value = buildMenuTree(res || []);

    // 2. 等待 DOM 更新，确保 Tree 组件已经根据 menuTreeData 渲染好了
    await nextTick();

    if (menuTreeRef.value && formData.value.merchantMenuIds?.length) {
      // --- 核心逻辑：过滤出叶子节点 ---
      const checkedIds = formData.value.merchantMenuIds;
      const leafKeys: any[] = [];

      // 定义一个递归函数来找叶子
      const findLeafIds = (nodes: any[]) => {
        nodes.forEach((node) => {
          // 如果没有子节点，说明是叶子节点
          if (!node.children || node.children.length === 0) {
            // 如果后端返回的 ID 包含这个叶子 ID，才记录
            if (checkedIds.includes(node.menuId)) {
              leafKeys.push(node.menuId);
            }
          } else {
            // 如果有子节点，继续递归
            findLeafIds(node.children);
          }
        });
      };

      // 执行过滤
      findLeafIds(menuTreeData.value);

      // 3. 只给 Tree 设置叶子节点的勾选状态
      // 只要子节点勾选了，父节点会自动变成“全选”或“半选”状态
      menuTreeRef.value.setCheckedKeys(leafKeys);
    }
  } catch (error) {
    console.error("加载菜单失败：", error);
    ElMessage.error("加载菜单权限失败");
  } finally {
    menuLoading.value = false;
  }
}

// 将平级菜单列表转换为树形结构
function buildMenuTree(menuList: any[], parentId: number = 0): any[] {
  const tree: any[] = [];
  for (const menu of menuList) {
    if (menu.parentId === parentId) {
      const children = buildMenuTree(menuList, menu.menuId);
      if (children.length > 0) {
        menu.children = children;
      }
      tree.push(menu);
    }
  }
  return tree;
}

// --- 辅助函数 ---
function getStatusText(status: number): string {
  return status === 0 ? "启用" : "禁用";
}

function getAccountStatusText(status: number): string {
  return status === 0 ? "正常" : "冻结";
}

function getAccountStatusType(status: number): string {
  return status === 0 ? "success" : "danger";
}

function formatAmount(amount: number): string {
  if (amount === undefined || amount === null) return "¥ 0.00";
  return `¥ ${amount.toFixed(2)}`;
}

function formatBalance(balance: number): string {
  if (balance === undefined || balance === null) return "¥ 0.00";
  return `¥ ${balance.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * 将 areaCodes 字符串转换为省、市、区县编码
 * @param areaCodes 格式如 "140000,140400,140425" 或 "14,1404,140425"
 * @returns { provinceCode, cityCode, districtCode }
 */
function parseAreaCodes(areaCodes: string): {
  cityCode: string;
  districtCode: string;
  provinceCode: string;
} {
  if (!areaCodes) {
    return { provinceCode: "", cityCode: "", districtCode: "" };
  }

  const codes = areaCodes.split(",").filter(Boolean);
  return {
    provinceCode: codes[0] || "",
    cityCode: codes[1] || "",
    districtCode: codes[2] || "",
  };
}

/**
 * 将省、市、区县编码组合成 areaCodes 字符串
 * @param provinceCode 省级编码
 * @param cityCode 市级编码
 * @param districtCode 区县级编码
 * @returns 格式如 "140000,140400,140425"
 */
function buildAreaCodes(
  provinceCode?: string,
  cityCode?: string,
  districtCode?: string
): string {
  const parts = [provinceCode, cityCode, districtCode].filter(Boolean);
  return parts.join(",");
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getPlatMerchantPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error("加载数据失败");
  } finally {
    loading.value = false;
  }
}

// --- 账户详情 ---
async function handleViewAccount(row: Merchant) {
  currentMerchant.value = row;
  accountDialogVisible.value = true;
  accountDetail.value = null;

  // 重置分页和筛选条件
  rechargeParams.pageNo = 1;
  rechargeParams.pageSize = 10;
  flowParams.pageNo = 1;
  flowParams.pageSize = 10;
  rechargeDateRange.value = [];
  flowDateRange.value = [];

  try {
    accountLoading.value = true;
    const [accountRes, configRes] = await Promise.all([
      getPlatMerchantAccountApi(row.merchantId),
      getPlatMerchantConfigDetailApi(row.merchantId),
    ]);
    accountDetail.value = accountRes || {
      merchantAccountId: 0,
      merchantId: row.merchantId,
      balance: 0,
      status: 1,
    };
    configData.value = configRes;

    // 加载充值订单和资金流水
    await Promise.all([
      loadRechargeData(row.merchantId),
      loadFlowData(row.merchantId),
    ]);
  } catch (error) {
    console.error(error);
    ElMessage.error("获取账户信息失败");
    accountDetail.value = {
      merchantAccountId: 0,
      merchantId: row.merchantId,
      balance: 0,
      status: 1,
    };
  } finally {
    accountLoading.value = false;
  }
}
async function loadRechargeData(merchantId: number) {
  rechargeParams.merchantId = merchantId;

  if (rechargeDateRange.value && rechargeDateRange.value.length === 2) {
    rechargeParams.startTime = rechargeDateRange.value[0];
    rechargeParams.endTime = rechargeDateRange.value[1];
  } else {
    rechargeParams.startTime = undefined;
    rechargeParams.endTime = undefined;
  }

  rechargeLoading.value = true;
  try {
    const res = await getPlatMerchantRechargePageApi(rechargeParams);
    rechargeData.value = res.records || [];
    rechargeTotal.value = res.total || 0;
  } catch {
    ElMessage.error("加载充值订单失败");
  } finally {
    rechargeLoading.value = false;
  }
}

async function loadFlowData(merchantId: number) {
  flowParams.merchantId = merchantId;

  if (flowDateRange.value && flowDateRange.value.length === 2) {
    flowParams.startTime = flowDateRange.value[0];
    flowParams.endTime = flowDateRange.value[1];
  } else {
    flowParams.startTime = undefined;
    flowParams.endTime = undefined;
  }

  flowLoading.value = true;
  try {
    const res = await getPlatMerchantAccountFlowPageApi(flowParams);
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
    const res = await getPlatMerchantConfigDetailApi(merchantId);
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
    await editPlatMerchantConfigApi({
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
function resetRechargeQuery(merchantId: number) {
  rechargeParams.rechargeNo = undefined;
  rechargeParams.status = undefined;
  rechargeParams.refundStatus = undefined;
  rechargeDateRange.value = [];
  rechargeParams.startTime = undefined;
  rechargeParams.endTime = undefined;
  rechargeParams.pageNo = 1;
  loadRechargeData(merchantId);
}

function resetFlowQuery(merchantId: number) {
  flowParams.changeType = undefined;
  flowDateRange.value = [];
  flowParams.startTime = undefined;
  flowParams.endTime = undefined;
  flowParams.pageNo = 1;
  loadFlowData(merchantId);
}

// --- 新增/编辑 ---
async function handleAdd() {
  formTitle.value = "新增商户";
  activeTab.value = "basic";
  formData.value = {
    status: 0,
    merchantMenuIds: [],
    provinceCode: "",
    cityCode: "",
    districtCode: "",
  };
  location.value = null;
  areaCodes.value = "";
  formVisible.value = true;
  await loadMenuTree();
}

async function handleEdit(row: Merchant) {
  try {
    formTitle.value = "编辑商户";
    activeTab.value = "basic"; // 重置到基本信息tab
    const res = await getPlatMerchantDetailApi(row.merchantId);
    console.log(res);
    formData.value = res || {};

    // 如果有经纬度，构造 location 对象供地图显示
    if (res.longitude && res.latitude) {
      location.value = {
        lng: res.longitude,
        lat: res.latitude,
      };
    }

    // 如果有省市区编码，组合成 areaCodes 用于区域选择器回显
    if (res.provinceCode || res.cityCode || res.districtCode) {
      areaCodes.value = buildAreaCodes(
        res.provinceCode,
        res.cityCode,
        res.districtCode
      );
    }

    formVisible.value = true;
    // 加载菜单树
    await loadMenuTree();
  } catch {
    ElMessage.error("获取商户信息失败");
  }
}

async function handleSubmit() {
  if (!formData.value.merchantName?.trim()) {
    ElMessage.warning("请输入商户名称");
    return;
  }

  // 获取选中的菜单权限ID
  if (menuTreeRef.value) {
    const checkedKeys = menuTreeRef.value.getCheckedKeys();
    const halfCheckedKeys = menuTreeRef.value.getHalfCheckedKeys();
    formData.value.merchantMenuIds = [...checkedKeys, ...halfCheckedKeys];
  }

  if (
    !formData.value.merchantMenuIds ||
    formData.value.merchantMenuIds.length === 0
  ) {
    ElMessage.warning("请选择商户菜单");
    return;
  }

  // 提交时，确保省市区编码已同步
  if (areaCodes.value) {
    const { provinceCode, cityCode, districtCode } = parseAreaCodes(
      areaCodes.value
    );
    formData.value.provinceCode = provinceCode;
    formData.value.cityCode = cityCode;
    formData.value.districtCode = districtCode;
  }

  formData.value.areaCodes = areaCodes.value;

  formSubmitting.value = true;
  try {
    const api = formData.value.merchantId
      ? editPlatMerchantApi
      : addPlatMerchantApi;
    const res = await api(formData.value);

    if (res) {
      ElMessage.success(formData.value.merchantId ? "修改成功" : "新增成功");
      formVisible.value = false;
      handleQuery();
    } else {
      ElMessage.error(res.message || "操作失败");
    }
  } catch {
    ElMessage.error("操作失败");
  } finally {
    formSubmitting.value = false;
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

// Tab 点击事件
const handleTabClick = (tab: any) => {
  // tab.paneName 就是 name 属性值 'basic' 或 'menu'
  if (tab.paneName === "menu" && menuTreeData.value.length === 0) {
    // 切换到菜单权限且还没有加载数据时，才请求
    loadMenuTree();
  }
};

// --- 删除 ---
async function handleDelete(row?: Merchant) {
  let ids: number[] = [];

  if (row) {
    ids = [row.merchantId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条商户吗？删除商户会同时删除其下的管理员账号和所有关联数据。`,
      "提示",
      {
        type: "warning",
        confirmButtonText: "确定",
        cancelButtonText: "取消",
      }
    );

    for (const id of ids) {
      await deletePlatMerchantApi(id);
    }

    ElMessage.success(`成功删除 ${ids.length} 条商户`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

// 表格选中变化
function handleSelectionChange(selection: Merchant[]) {
  selectedIds.value = selection.map((item) => item.merchantId);
}

// 地图选点变化时，同步更新表单多个字段
const handleMapChange = (info: any) => {
  console.log("地图返回位置信息:", info);

  if (info) {
    // 1. 同步经纬度
    formData.value.longitude = info.lng;
    formData.value.latitude = info.lat;

    // 2. 同步详细地址
    formData.value.detailAddress = info.address;

    // 3. 同步区域选择器 (AreaCascader 绑定的变量)
    areaCodes.value = info.areaCodes;

    // 4. 同步省市区字段到 formData（用于提交）
    if (info.areaCodes) {
      const codes = parseAreaCodes(info.areaCodes);
      formData.value.provinceCode = codes.provinceCode;
      formData.value.cityCode = codes.cityCode;
      formData.value.districtCode = codes.districtCode;
    }

    // 5. 同步省市区名称（用于显示）
    formData.value.province = info.province;
    formData.value.city = info.city;
    formData.value.district = info.district;
  } else {
    // 清空逻辑
    formData.value.longitude = undefined;
    formData.value.latitude = undefined;
    formData.value.detailAddress = "";
    areaCodes.value = "";
    formData.value.provinceCode = "";
    formData.value.cityCode = "";
    formData.value.districtCode = "";
    formData.value.province = "";
    formData.value.city = "";
    formData.value.district = "";
  }
};

// 搜索与重置
function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.merchantName = undefined;
  queryParams.merchantCode = undefined;
  queryParams.contact = undefined;
  queryParams.phone = undefined;
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
      <!-- 查询表单 -->
      <el-card shadow="never" class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="商户名称">
            <el-input
              v-model="queryParams.merchantName"
              placeholder="请输入商户名称"
              clearable
              style="width: 180px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="商户编码">
            <el-input
              v-model="queryParams.merchantCode"
              placeholder="请输入商户编码"
              clearable
              style="width: 180px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="联系人">
            <el-input
              v-model="queryParams.contact"
              placeholder="请输入联系人"
              clearable
              style="width: 150px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="联系电话">
            <el-input
              v-model="queryParams.phone"
              placeholder="请输入联系电话"
              clearable
              style="width: 150px"
              @keyup.enter="handleQuery"
            />
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
        <el-table
          v-loading="loading"
          :data="tableData"
          border
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column
            prop="merchantId"
            label="商户ID"
            width="80"
            align="center"
          />
          <el-table-column
            prop="merchantName"
            label="商户名称"
            min-width="180"
            align="left"
          >
            <template #default="{ row }">
              <div class="flex items-center gap-2">
                <el-avatar :size="24" :src="row.logo">
                  <House class="w-4 h-4" />
                </el-avatar>
                <span>{{ row.merchantName }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="merchantCode"
            label="商户编码"
            width="150"
            align="center"
          />
          <el-table-column
            prop="contact"
            label="联系人"
            width="120"
            align="center"
          />
          <el-table-column
            prop="phone"
            label="联系电话"
            width="130"
            align="center"
          />
          <el-table-column
            prop="address"
            label="地址"
            min-width="200"
            align="center"
            show-overflow-tooltip
          />
          <el-table-column prop="status" label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 0 ? 'success' : 'danger'">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
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
                :icon="Wallet"
                @click="handleViewAccount(row)"
              >
                账户
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="formVisible"
      :title="formTitle"
      width="1400px"
      append-to-body
    >
      <el-tabs
        v-model="activeTab"
        type="border-card"
        @tab-click="handleTabClick"
      >
        <!-- 基本信息 Tab -->
        <el-tab-pane label="基本信息" name="basic">
          <el-row :gutter="20">
            <!-- 左侧：表单区域 -->
            <el-col :span="10">
              <el-form
                :model="formData"
                label-width="100px"
                label-position="right"
              >
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="商户名称" required>
                      <el-input
                        v-model="formData.merchantName"
                        placeholder="请输入商户名称"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="商户编码">
                      <el-input
                        v-model="formData.merchantCode"
                        placeholder="请输入商户编码"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="联系人">
                      <el-input
                        v-model="formData.contact"
                        placeholder="请输入联系人"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="联系电话">
                      <el-input
                        v-model="formData.phone"
                        placeholder="请输入联系电话"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-form-item label="商户Logo">
                  <el-input
                    v-model="formData.logo"
                    placeholder="请输入Logo图片URL"
                  />
                </el-form-item>

                <el-form-item label="区域">
                  <AreaCascader
                    v-model="areaCodes"
                    placeholder="请选择区域"
                    :level="3"
                    @change="handleAreaChange"
                  />
                </el-form-item>

                <el-form-item label="详细地址">
                  <el-input
                    v-model="formData.detailAddress"
                    placeholder="请输入详细地址"
                  />
                </el-form-item>

                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="经度">
                      <el-input-number
                        v-model="formData.longitude"
                        :precision="6"
                        :step="0.000001"
                        placeholder="经度"
                        :controls="false"
                        style="width: 100%"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="纬度">
                      <el-input-number
                        v-model="formData.latitude"
                        :precision="6"
                        :step="0.000001"
                        placeholder="纬度"
                        :controls="false"
                        style="width: 100%"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-form-item label="状态">
                  <el-radio-group v-model="formData.status">
                    <el-radio :value="0">启用</el-radio>
                    <el-radio :value="1">禁用</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-form>
            </el-col>

            <!-- 右侧：地图区域 -->
            <el-col :span="14">
              <div class="map-wrapper">
                <MapPicker
                  v-model="location"
                  height="500px"
                  @change="handleMapChange"
                />
              </div>
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- 菜单权限 Tab -->
        <el-tab-pane label="菜单权限" name="menu">
          <div class="menu-permission-wrapper">
            <div class="menu-tip">
              提示：勾选下方菜单，设置商户可访问的菜单权限
            </div>
            <el-tree
              ref="menuTreeRef"
              :data="menuTreeData"
              show-checkbox
              node-key="menuId"
              :props="{ label: 'menuName', children: 'children' }"
              :default-checked-keys="formData.merchantMenuIds"
              default-expand-all
              class="menu-tree"
            />
          </div>
        </el-tab-pane>
      </el-tabs>

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

    <!-- 账户详情弹窗 -->
    <el-dialog
      v-model="accountDialogVisible"
      :title="`账户详情 - ${currentMerchant?.merchantName}`"
      width="900px"
      append-to-body
    >
      <div v-loading="accountLoading">
        <!-- 账户信息 -->
        <el-descriptions :column="2" border v-if="accountDetail">
          <el-descriptions-item label="商户名称" :span="2">
            {{ currentMerchant?.merchantName }}
          </el-descriptions-item>
          <el-descriptions-item label="商户编码">
            {{ currentMerchant?.merchantCode }}
          </el-descriptions-item>
          <el-descriptions-item label="账户ID">
            {{ accountDetail.merchantAccountId || "-" }}
          </el-descriptions-item>
          <el-descriptions-item label="账户余额" label-class-name="font-medium">
            <span
              class="text-lg font-bold"
              :class="
                accountDetail.balance > 0 ? 'text-success' : 'text-danger'
              "
            >
              {{ formatBalance(accountDetail.balance) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="账户状态">
            <el-tag
              :type="getAccountStatusType(accountDetail.status)"
              size="default"
            >
              {{ getAccountStatusText(accountDetail.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="商户状态">
            <el-tag
              :type="currentMerchant?.status === 0 ? 'success' : 'danger'"
              size="default"
            >
              {{ getStatusText(currentMerchant?.status ?? 0) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <!-- Tab 页 -->
        <el-tabs class="mt-4">
          <!-- 充值订单 Tab -->
          <el-tab-pane label="充值订单">
            <div class="recharge-list">
              <el-form :inline="true" :model="rechargeParams" class="mb-4">
                <el-form-item label="充值单号">
                  <el-input
                    v-model="rechargeParams.rechargeNo"
                    placeholder="请输入充值单号"
                    clearable
                    style="width: 180px"
                    @keyup.enter="loadRechargeData(currentMerchant!.merchantId)"
                  />
                </el-form-item>
                <el-form-item label="支付状态">
                  <el-select
                    v-model="rechargeParams.status"
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
                <el-form-item label="退款状态">
                  <el-select
                    v-model="rechargeParams.refundStatus"
                    placeholder="全部"
                    clearable
                    style="width: 120px"
                  >
                    <el-option
                      v-for="item in refundStatusOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="时间范围">
                  <el-date-picker
                    v-model="rechargeDateRange"
                    type="datetimerange"
                    range-separator="至"
                    start-placeholder="开始时间"
                    end-placeholder="结束时间"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    style="width: 360px"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button
                    type="primary"
                    @click="loadRechargeData(currentMerchant!.merchantId)"
                  >
                    查询
                  </el-button>
                  <el-button
                    @click="resetRechargeQuery(currentMerchant!.merchantId)"
                  >
                    重置
                  </el-button>
                </el-form-item>
              </el-form>

              <el-table
                v-loading="rechargeLoading"
                :data="rechargeData"
                border
                stripe
                style="width: 100%"
              >
                <el-table-column
                  prop="rechargeNo"
                  label="充值单号"
                  min-width="200"
                  align="center"
                />
                <el-table-column
                  prop="amount"
                  label="充值金额"
                  width="120"
                  align="center"
                >
                  <template #default="{ row }">
                    <span class="text-success">{{
                      formatAmount(row.amount)
                    }}</span>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="status"
                  label="支付状态"
                  width="100"
                  align="center"
                >
                  <template #default="{ row }">
                    <el-tag :type="getPayStatusType(row.status)" size="small">
                      {{ getPayStatusText(row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="rechargeUserName"
                  label="充值人"
                  width="120"
                  align="center"
                />
                <el-table-column
                  prop="payTime"
                  label="支付时间"
                  width="160"
                  align="center"
                />
                <el-table-column
                  prop="refundStatus"
                  label="退款状态"
                  width="100"
                  align="center"
                >
                  <template #default="{ row }">
                    <el-tag
                      :type="getRefundStatusType(row.refundStatus)"
                      size="small"
                    >
                      {{ getRefundStatusText(row.refundStatus) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="totalRefundAmount"
                  label="退款金额"
                  width="120"
                  align="center"
                >
                  <template #default="{ row }">
                    {{
                      row.totalRefundAmount > 0
                        ? formatAmount(row.totalRefundAmount)
                        : "-"
                    }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="200" align="center">
                  <template #default="{ row }">
                    <el-button
                      link
                      type="primary"
                      @click="handleViewRecharge(row)"
                    >
                      详情
                    </el-button>
                     <el-button
                      v-if="row.status === 2 && row.refundStatus !== 2"
                      link
                      type="danger"
                      @click="openRefundDialog(row)"
                    >
                      退款
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>

              <div class="flex justify-end mt-4">
                <el-pagination
                  v-model:current-page="rechargeParams.pageNo"
                  v-model:page-size="rechargeParams.pageSize"
                  :total="rechargeTotal"
                  :page-sizes="[10, 20, 50, 100]"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="loadRechargeData(currentMerchant!.merchantId)"
                  @current-change="loadRechargeData(currentMerchant!.merchantId)"
                />
              </div>
            </div>
          </el-tab-pane>

          <!-- 资金流水 Tab -->
          <el-tab-pane label="资金流水">
            <div class="flow-list">
              <el-form :inline="true" :model="flowParams" class="mb-4">
                <el-form-item label="变动类型">
                  <el-select
                    v-model="flowParams.changeType"
                    placeholder="全部"
                    clearable
                    style="width: 140px"
                  >
                    <el-option
                      v-for="item in changeTypeOptions"
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
                  <el-button
                    type="primary"
                    @click="loadFlowData(currentMerchant!.merchantId)"
                  >
                    查询
                  </el-button>
                  <el-button
                    @click="resetFlowQuery(currentMerchant!.merchantId)"
                  >
                    重置
                  </el-button>
                </el-form-item>
              </el-form>

              <el-table
                v-loading="flowLoading"
                :data="flowData"
                border
                stripe
                style="width: 100%"
              >
                <el-table-column
                  prop="merchantAccountFlowId"
                  label="流水ID"
                  width="100"
                  align="center"
                />
                <el-table-column
                  prop="changeType"
                  label="变动类型"
                  width="140"
                  align="center"
                >
                  <template #default="{ row }">
                    <el-tag
                      :type="getChangeTypeType(row.changeType)"
                      size="small"
                    >
                      {{ getChangeTypeText(row.changeType) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="changeAmount"
                  label="变动金额"
                  width="120"
                  align="right"
                >
                  <template #default="{ row }">
                    <span
                      :class="
                        row.changeAmount > 0 ? 'text-success' : 'text-danger'
                      "
                    >
                      {{ row.changeAmount > 0 ? "+" : ""
                      }}{{ formatAmount(row.changeAmount) }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="beforeBalance"
                  label="变动前余额"
                  width="120"
                  align="right"
                >
                  {{ formatAmount(row.beforeBalance) }}
                </el-table-column>
                <el-table-column
                  prop="afterBalance"
                  label="变动后余额"
                  width="120"
                  align="right"
                >
                  <span class="font-medium">{{
                    formatAmount(row.afterBalance)
                  }}</span>
                </el-table-column>
                <el-table-column
                  prop="relatedId"
                  label="关联业务ID"
                  width="100"
                  align="center"
                >
                  {{ row.relatedId || "-" }}
                </el-table-column>
                <el-table-column
                  prop="remark"
                  label="备注"
                  min-width="180"
                  align="left"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="createTime"
                  label="发生时间"
                  width="160"
                  align="center"
                />
              </el-table>

              <div class="flex justify-end mt-4">
                <el-pagination
                  v-model:current-page="flowParams.pageNo"
                  v-model:page-size="flowParams.pageSize"
                  :total="flowTotal"
                  :page-sizes="[10, 20, 50, 100]"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="loadFlowData(currentMerchant!.merchantId)"
                  @current-change="loadFlowData(currentMerchant!.merchantId)"
                />
              </div>
            </div>
          </el-tab-pane>
          <!-- 商户配置 Tab -->
          <el-tab-pane label="商户配置">
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
      </div>

      <template #footer>
        <el-button @click="accountDialogVisible = false">关闭</el-button>
        <el-button
          type="primary"
          @click="handleViewAccount(currentMerchant!)"
          :loading="accountLoading"
        >
          刷新
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

<style scoped lang="scss">
.text-success {
  color: #67c23a;
}

.text-danger {
  color: #f56c6c;
}

.map-wrapper {
  padding: 0 8px;
}

.menu-permission-wrapper {
  min-height: 500px;
  padding: 16px;

  .menu-tip {
    padding: 8px 12px;
    margin-bottom: 16px;
    font-size: 12px;
    color: #909399;
    background-color: #f5f7fa;
    border-radius: 4px;
  }

  .menu-tree {
    max-height: 450px;
    padding: 12px;
    overflow-y: auto;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
  }
}
</style>
