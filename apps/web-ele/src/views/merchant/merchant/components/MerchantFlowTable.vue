<!-- components/MerchantFlowTable.vue -->
<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";

import { Refresh, Search } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

import {
  getMerchantAccountFlowPageApi,
  type MerchantAccountFlow,
  type MerchantAccountFlowPageParams,
} from "#/api/system/merchant";
import ColumnSelector from "#/components/ColumnSelector/index.vue";
import {
  defaultMerchantFlowColumns,
  MERCHANT_FLOW_STORAGE_KEY,
  type TableColumnConfig,
} from "#/constants/tableColumns";
import { ModuleCodeMap } from "#/hooks/useExport";

const props = defineProps<{ merchantId: number }>();

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultMerchantFlowColumns]);
const visibleColumns = computed(() =>
  columnConfig.value.filter((col) => col.visible)
);
function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

// 查询参数
const queryParams = reactive<MerchantAccountFlowPageParams>({
  pageNo: 1,
  pageSize: 10,
  merchantId: props.merchantId,
  changeType: undefined,
  startTime: undefined,
  endTime: undefined,
});

const dateRange = ref<string[]>([]);
const loading = ref(false);
const tableData = ref<MerchantAccountFlow[]>([]);
const total = ref(0);

const changeTypeOptions = [
  { label: "充值到账", value: 0, type: "success" },
  { label: "平台服务费扣减", value: 1, type: "danger" },
  { label: "会员提现扣款", value: 2, type: "warning" },
];

watch(dateRange, (newVal) => {
  if (newVal?.length === 2) {
    queryParams.startTime = newVal[0];
    queryParams.endTime = newVal[1];
  } else {
    queryParams.startTime = undefined;
    queryParams.endTime = undefined;
  }
});

watch(
  () => props.merchantId,
  (newId) => {
    queryParams.merchantId = newId;
    loadData();
  }
);

function formatAmount(amount: number): string {
  return `¥ ${(amount || 0).toFixed(2)}`;
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

async function loadData() {
  loading.value = true;
  try {
    const res = await getMerchantAccountFlowPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch {
    ElMessage.error("加载资金流水失败");
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.changeType = undefined;
  dateRange.value = [];
  queryParams.startTime = undefined;
  queryParams.endTime = undefined;
  queryParams.pageNo = 1;
  loadData();
}

defineExpose({ loadData });
</script>

<template>
  <div class="flow-table">
    <!-- 查询表单 -->
    <el-card shadow="never" class="border-none mb-4 !p-2">
      <el-form
        :inline="true"
        :model="queryParams"
        class="flex flex-wrap gap-x-2 gap-y-2 items-center"
      >
        <el-form-item class="!mb-0 !mr-2">
          <el-select
            v-model="queryParams.changeType"
            clearable
            style="width: 200px"
          >
            <template #prefix>
<span class="text-xs text-gray-400 mr-0.5">变动类型:</span>
</template>
            <el-option
              v-for="item in changeTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-2">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 280px"
          />
        </el-form-item>

        <el-form-item class="!mb-0 !mr-0 md:ml-auto flex items-center gap-1">
          <el-tooltip content="查询" placement="top">
            <el-button type="primary" :icon="Search" circle @click="loadData" />
          </el-tooltip>
          <el-tooltip content="重置" placement="top">
            <el-button :icon="Refresh" circle @click="resetQuery" />
          </el-tooltip>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格操作栏 -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <ExportButton
          :module-code="ModuleCodeMap.MERCHANT_FLOW"
          :fields="visibleColumns"
          :find-cond="queryParams"
        />
      </div>
      <div class="flex items-center">
        <ColumnSelector
          :storage-key="MERCHANT_FLOW_STORAGE_KEY"
          :default-columns="defaultMerchantFlowColumns"
          @update:columns="handleColumnsUpdate"
        />
      </div>
    </div>

    <!-- 表格 -->
    <el-table
      v-loading="loading"
      :data="tableData"
      border
      stripe
      style="width: 100%"
    >
      <el-table-column
        v-for="col in visibleColumns"
        :key="col.key"
        :prop="col.key"
        :label="col.label"
        :width="col.width"
        :min-width="col.minWidth"
        :align="col.align"
        :show-overflow-tooltip="col.showOverflowTooltip"
      >
        <template #default="{ row }">
          <template v-if="col.key === 'changeType'">
            <el-tag
              :type="getChangeTypeType(row.changeType)"
              size="small"
              round
              effect="light"
            >
              {{ getChangeTypeText(row.changeType) }}
            </el-tag>
          </template>
          <template v-else-if="col.key === 'changeAmount'">
            <span
              :class="row.changeAmount > 0 ? 'text-success' : 'text-danger'"
            >
              {{ row.changeAmount > 0 ? "+" : ""
              }}{{ formatAmount(row.changeAmount) }}
            </span>
          </template>
          <template v-else>
            {{ (row as any)[col.key] ?? '-' }}
          </template>
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
  </div>
</template>
