<script lang="ts" setup>
import { computed, nextTick, onMounted, reactive, ref } from "vue";

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

import { refundByMerchantApi } from "#/api/common/pay";
import { getPlatMenuListApi } from "#/api/system/menu";
import {
  addPlatMerchantApi,
  deletePlatMerchantApi,
  editPlatMerchantApi,
  editPlatMerchantConfigApi,
  getPlatMerchantAccountApi,
  getPlatMerchantConfigDetailApi,
  getPlatMerchantDetailApi,
  getPlatMerchantPageApi,
  type Merchant,
  type MerchantConfig,
  type MerchantPageParams,
  type MerchantRecharge,
} from "#/api/system/merchant";
import AreaCascader from "#/components/AreaCascader/index.vue";
import ColumnSelector from "#/components/ColumnSelector/index.vue";
import ExportFieldSelector from "#/components/ExportFieldSelector/index.vue";
import MapPicker from "#/components/MapPicker/index.vue";
import {
  defaultMerchantColumns,
  MERCHANT_STORAGE_KEY,
  type TableColumnConfig,
} from "#/constants/tableColumns";
import { ModuleCodeMap, useExport } from "#/hooks/useExport";

import MerchantFlowTable from "../components/MerchantFlowTable.vue";
import MerchantRechargeTable from "../components/MerchantRechargeTable.vue";

const { exporting, exportData } = useExport(ModuleCodeMap.MERCHANT);

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultMerchantColumns]);

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
const tableData = ref<Merchant[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const location = ref<null | { lat: number; lng: number }>(null);
const activeTab = ref("basic");
const menuTreeRef = ref();
const menuTreeData = ref<any[]>([]);
const menuLoading = ref(false);

// 表单弹窗控制
const formVisible = ref(false);
const formTitle = ref("");
const formData = ref<Partial<Merchant>>({});
const formSubmitting = ref(false);
const formRef = ref();
const formRules = reactive({
  merchantName: [{ required: true, message: "请输入商户名称", trigger: "blur" }],
});

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

// 充值订单（用于弹窗中的退款）
const rechargeDetailVisible = ref(false);
const rechargeDetail = ref<MerchantRecharge | null>(null);

// 退款弹窗
const refundDialogVisible = ref(false);
const refundSubmitting = ref(false);
const currentRechargeOrder = ref<MerchantRecharge | null>(null);
const refundAmount = ref(0);

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

const areaCodes = ref("");

function handleAreaChange(codes: string) {
  console.log("选中的区域编码:", codes);
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
    const res = await getPlatMenuListApi({ platformType: 1 });
    menuTreeData.value = buildMenuTree(res || []);

    await nextTick();

    if (menuTreeRef.value && formData.value.merchantMenuIds?.length) {
      const checkedIds = formData.value.merchantMenuIds;
      const leafKeys: any[] = [];

      const findLeafIds = (nodes: any[]) => {
        nodes.forEach((node) => {
          if (!node.children || node.children.length === 0) {
            if (checkedIds.includes(node.menuId)) {
              leafKeys.push(node.menuId);
            }
          } else {
            findLeafIds(node.children);
          }
        });
      };

      findLeafIds(menuTreeData.value);
      menuTreeRef.value.setCheckedKeys(leafKeys);
    }
  } catch (error) {
    console.error("加载菜单失败：", error);
    ElMessage.error("加载菜单权限失败");
  } finally {
    menuLoading.value = false;
  }
}

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

// 退款弹窗
function openRefundDialog(row: MerchantRecharge) {
  if (row.status !== 2) {
    ElMessage.warning("只有已支付的订单才能退款");
    return;
  }
  if (row.refundStatus === 2) {
    ElMessage.warning("该订单已完成退款");
    return;
  }
  currentRechargeOrder.value = row;
  refundAmount.value = 0;
  refundDialogVisible.value = true;
}

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
      outTradeNo: order.rechargeNo,
      refundAmount: refundAmount.value,
      totalAmount: order.amount,
    });
    ElMessage.success("退款申请已提交");
    refundDialogVisible.value = false;
    // 刷新充值订单列表
    // rechargeTableRef.value?.loadData();
  } catch {
    ElMessage.error("退款失败");
  } finally {
    refundSubmitting.value = false;
  }
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
    activeTab.value = "basic";
    const res = await getPlatMerchantDetailApi(row.merchantId);
    formData.value = res || {};

    if (res.longitude && res.latitude) {
      location.value = {
        lng: res.longitude,
        lat: res.latitude,
      };
    }

    if (res.provinceCode || res.cityCode || res.districtCode) {
      areaCodes.value = buildAreaCodes(
        res.provinceCode,
        res.cityCode,
        res.districtCode
      );
    }

    formVisible.value = true;
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

  if (menuTreeRef.value) {
    const checkedKeys = menuTreeRef.value.getCheckedKeys();
    const halfCheckedKeys = menuTreeRef.value.getHalfCheckedKeys();
    formData.value.merchantMenuIds = [...checkedKeys, ...halfCheckedKeys];
  }

  if (!formData.value.merchantMenuIds || formData.value.merchantMenuIds.length === 0) {
    ElMessage.warning("请选择商户菜单");
    return;
  }

  if (areaCodes.value) {
    const { provinceCode, cityCode, districtCode } = parseAreaCodes(areaCodes.value);
    formData.value.provinceCode = provinceCode;
    formData.value.cityCode = cityCode;
    formData.value.districtCode = districtCode;
  }

  formData.value.areaCodes = areaCodes.value;

  formSubmitting.value = true;
  try {
    const api = formData.value.merchantId ? editPlatMerchantApi : addPlatMerchantApi;
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

// Tab 点击事件
const handleTabClick = (tab: any) => {
  if (tab.paneName === "menu" && menuTreeData.value.length === 0) {
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
      { type: "warning" }
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

// 地图选点变化
const handleMapChange = (info: any) => {
  if (info) {
    formData.value.longitude = info.lng;
    formData.value.latitude = info.lat;
    formData.value.detailAddress = info.address;
    areaCodes.value = info.areaCodes;

    if (info.areaCodes) {
      const codes = parseAreaCodes(info.areaCodes);
      formData.value.provinceCode = codes.provinceCode;
      formData.value.cityCode = codes.cityCode;
      formData.value.districtCode = codes.districtCode;
    }

    formData.value.province = info.province;
    formData.value.city = info.city;
    formData.value.district = info.district;
  } else {
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

// 重置表单
function resetForm() {
  if (formRef.value) {
    formRef.value.resetFields();
  }
  formData.value = {
    status: 0,
    merchantMenuIds: [],
    provinceCode: "",
    cityCode: "",
    districtCode: "",
  };
  location.value = null;
  areaCodes.value = "";
}

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
      <el-card shadow="never" class="border-none mb-4 !p-2">
        <el-form :inline="true" :model="queryParams" class="flex flex-wrap gap-x-2 gap-y-2 items-center">
          <el-form-item class="!mb-0 !mr-2">
            <el-input
v-model="queryParams.merchantName" placeholder="请输入" clearable style="width: 200px"
              @keyup.enter="handleQuery"
>
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">商户名称:</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-input
v-model="queryParams.merchantCode" placeholder="请输入" clearable style="width: 200px"
              @keyup.enter="handleQuery"
>
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">商户编码:</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-input
v-model="queryParams.contact" placeholder="请输入" clearable style="width: 200px"
              @keyup.enter="handleQuery"
>
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">联系人:</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-input
v-model="queryParams.phone" placeholder="请输入" clearable style="width: 200px"
              @keyup.enter="handleQuery"
>
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">联系电话:</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select v-model="queryParams.status" clearable style="width: 200px">
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">状态:</span>
              </template>
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-0 md:ml-auto flex items-center gap-1">
            <el-tooltip content="查询" placement="top">
              <el-button type="primary" :icon="Search" circle @click="handleQuery" />
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
            <el-button type="primary" plain :icon="Plus" @click="handleAdd">新增</el-button>
            <el-button :loading="exporting" @click="openExportSelector">导出</el-button>
            <el-button type="danger" plain :icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete()">
              批量删除
            </el-button>
            <span v-if="selectedIds.length > 0" class="text-xs text-gray-400 ml-2">
              已选 <span class="text-red-500 font-medium">{{ selectedIds.length }}</span> 项
            </span>
          </div>
          <div class="flex items-center">
            <ColumnSelector
:storage-key="MERCHANT_STORAGE_KEY" :default-columns="defaultMerchantColumns"
              @update:columns="handleColumnsUpdate"
/>
          </div>
        </div>

        <el-table
v-loading="loading" :data="tableData" border stripe style="width: 100%"
          @selection-change="handleSelectionChange"
>
          <el-table-column type="selection" width="50" align="center" />

          <el-table-column
v-for="col in visibleColumns" :key="col.key" :prop="col.key" :label="col.label"
            :width="col.width" :min-width="col.minWidth" :align="col.align" :show-overflow-tooltip="col.showOverflowTooltip"
>
            <template #default="{ row }">
              <template v-if="col.key === 'merchantName'">
                <div class="flex items-center gap-2">
                  <el-avatar :size="24" :src="row.logo">
                    <House class="w-4 h-4" />
                  </el-avatar>
                  <span>{{ row.merchantName }}</span>
                </div>
              </template>
              <template v-else-if="col.key === 'status'">
                <el-tag :type="row.status === 0 ? 'success' : 'danger'" size="small" round effect="light">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="280" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" :icon="Wallet" @click="handleViewAccount(row)">账户</el-button>
              <el-button link type="primary" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="flex justify-end mt-4">
          <el-pagination
v-model:current-page="queryParams.pageNo" v-model:page-size="queryParams.pageSize"
            :total="total" :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper"
            background @size-change="loadData" @current-change="loadData"
/>
        </div>
      </el-card>
    </div>

    <ExportFieldSelector
v-model:visible="exportFieldVisible" :fields="exportFields" :loading="exporting"
      @confirm="handleExportConfirm"
/>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="formTitle" width="1400px" append-to-body @close="resetForm">
      <el-tabs v-model="activeTab" type="border-card" @tab-click="handleTabClick">
        <el-tab-pane label="基本信息" name="basic">
          <el-row :gutter="20">
            <el-col :span="10">
              <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px" label-position="right">
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="商户名称" prop="merchantName" required>
                      <el-input v-model="formData.merchantName" placeholder="请输入商户名称" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="商户编码">
                      <el-input v-model="formData.merchantCode" placeholder="请输入商户编码" />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="联系人">
                      <el-input v-model="formData.contact" placeholder="请输入联系人" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="联系电话">
                      <el-input v-model="formData.phone" placeholder="请输入联系电话" />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-form-item label="商户Logo">
                  <el-input v-model="formData.logo" placeholder="请输入Logo图片URL" />
                </el-form-item>

                <el-form-item label="区域">
                  <AreaCascader v-model="areaCodes" placeholder="请选择区域" @change="handleAreaChange" />
                </el-form-item>

                <el-form-item label="详细地址">
                  <el-input v-model="formData.detailAddress" placeholder="请输入详细地址" />
                </el-form-item>

                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="经度">
                      <el-input-number
v-model="formData.longitude" :precision="6" :step="0.000001" placeholder="经度"
                        :controls="false" style="width: 100%"
/>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="纬度">
                      <el-input-number
v-model="formData.latitude" :precision="6" :step="0.000001" placeholder="纬度"
                        :controls="false" style="width: 100%"
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

            <el-col :span="14">
              <div class="map-wrapper">
                <MapPicker v-model="location" height="500px" @change="handleMapChange" />
              </div>
            </el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="菜单权限" name="menu">
          <div class="menu-permission-wrapper">
            <div class="menu-tip">提示：勾选下方菜单，设置商户可访问的菜单权限</div>
            <el-tree
ref="menuTreeRef" :data="menuTreeData" show-checkbox node-key="menuId"
              :props="{ label: 'menuName', children: 'children' }" :default-checked-keys="formData.merchantMenuIds"
              default-expand-all class="menu-tree"
/>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 账户详情弹窗 -->
    <el-dialog
v-model="accountDialogVisible" :title="`账户详情 - ${currentMerchant?.merchantName}`" width="1200px"
      append-to-body
>
      <div v-loading="accountLoading">
        <el-descriptions :column="3" border v-if="accountDetail">
          <el-descriptions-item label="商户名称">{{ currentMerchant?.merchantName }}</el-descriptions-item>
          <el-descriptions-item label="商户编码">{{ currentMerchant?.merchantCode }}</el-descriptions-item>
          <el-descriptions-item label="账户ID">{{ accountDetail.merchantAccountId || "-" }}</el-descriptions-item>
          <el-descriptions-item label="账户余额" label-class-name="font-medium">
            <span class="text-lg font-bold" :class="accountDetail.balance > 0 ? 'text-success' : 'text-danger'">
              {{ formatBalance(accountDetail.balance) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="账户状态">
            <el-tag :type="getAccountStatusType(accountDetail.status)" size="default">
              {{ getAccountStatusText(accountDetail.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="商户状态">
            <el-tag :type="currentMerchant?.status === 0 ? 'success' : 'danger'" size="default">
              {{ getStatusText(currentMerchant?.status ?? 0) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-tabs class="mt-4">
          <el-tab-pane label="充值订单">
            <MerchantRechargeTable
:merchant-id="currentMerchant?.merchantId" @view-detail="handleViewRecharge"
              @open-refund="openRefundDialog"
/>
          </el-tab-pane>
          <el-tab-pane label="资金流水">
            <MerchantFlowTable :merchant-id="currentMerchant?.merchantId" />
          </el-tab-pane>
          <el-tab-pane label="商户配置">
            <div v-loading="configLoading" class="config-form">
              <el-form v-if="configData" :model="configData" label-width="180px" label-position="right">
                <el-form-item label="回收订单审核方式">
                  <el-select v-model="configData.orderWalletSync" placeholder="请选择" style="width: 100%">
                    <el-option label="不需要审核，直接到钱包" :value="0" />
                    <el-option label="需要审核，到预计收益" :value="1" />
                  </el-select>
                  <div class="text-gray-400 text-xs mt-1">选择后影响回收订单的收益结算方式</div>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :loading="configSubmitting" @click="handleSaveConfig">保存配置</el-button>
                </el-form-item>
              </el-form>
              <el-empty v-else description="暂无配置信息" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <template #footer>
        <el-button @click="accountDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleViewAccount(currentMerchant!)" :loading="accountLoading">刷新</el-button>
      </template>
    </el-dialog>

    <!-- 充值订单详情弹窗 -->
    <el-dialog v-model="rechargeDetailVisible" title="充值订单详情" width="600px" append-to-body>
      <el-descriptions :column="2" border v-if="rechargeDetail">
        <el-descriptions-item label="充值ID">{{ rechargeDetail.merchantRechargeId }}</el-descriptions-item>
        <el-descriptions-item label="充值单号">{{ rechargeDetail.rechargeNo }}</el-descriptions-item>
        <el-descriptions-item label="充值金额">
          <span class="text-success">{{ formatAmount(rechargeDetail.amount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="支付状态">
          <el-tag :type="getPayStatusType(rechargeDetail.status)" size="small">
            {{ getPayStatusText(rechargeDetail.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="充值人">{{ rechargeDetail.rechargeUserName || "-" }}</el-descriptions-item>
        <el-descriptions-item label="支付时间">{{ rechargeDetail.payTime || "-" }}</el-descriptions-item>
        <el-descriptions-item label="退款状态">
          <el-tag :type="getRefundStatusType(rechargeDetail.refundStatus)" size="small">
            {{ getRefundStatusText(rechargeDetail.refundStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="退款金额">
          {{ rechargeDetail.totalRefundAmount > 0 ? formatAmount(rechargeDetail.totalRefundAmount) : "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="退款时间">{{ rechargeDetail.refundTime || "-" }}</el-descriptions-item>
        <el-descriptions-item label="支付请求ID" :span="2">{{ rechargeDetail.payRequestId || "-" }}</el-descriptions-item>
        <el-descriptions-item label="退款请求ID" :span="2">{{ rechargeDetail.refundRequestId || "-" }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="rechargeDetailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 退款弹窗 -->
    <el-dialog v-model="refundDialogVisible" title="订单退款" width="450px" append-to-body>
      <el-form label-width="100px">
        <el-form-item label="订单金额">
          <span class="font-bold text-primary">{{ formatAmount(currentRechargeOrder?.amount || 0) }}</span>
        </el-form-item>
        <el-form-item label="退款金额" required>
          <el-input-number
v-model="refundAmount" :min="0.01" :precision="2" :step="10" :max="currentRechargeOrder?.amount"
            placeholder="请输入退款金额" style="width: 100%"
/>
          <div class="text-gray-400 text-xs mt-1">最高可退 {{ formatAmount(currentRechargeOrder?.amount || 0) }}</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="refundSubmitting" @click="handleRefund">确认退款</el-button>
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
