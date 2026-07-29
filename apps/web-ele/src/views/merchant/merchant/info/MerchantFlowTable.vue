<script setup lang="ts">
import type { MerchantAccountFlow, MerchantAccountFlowPageParams } from '#/api/system/merchant';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { getMerchantAccountFlowPageApi } from '#/api/system/merchant';
import { defaultMerchantFlowColumns, MERCHANT_FLOW_STORAGE_KEY } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

const props = defineProps<{ merchantId: number }>();

const { flow_change_type } = useDicts(['flow_change_type']);

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultMerchantFlowColumns]);
const visibleColumns = computed(() => columnConfig.value.filter((col) => col.visible));

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

// 监听时间范围
watch(dateRange, (newVal) => {
  if (newVal?.length === 2) {
    queryParams.startTime = newVal[0];
    queryParams.endTime = newVal[1];
  } else {
    queryParams.startTime = undefined;
    queryParams.endTime = undefined;
  }
});

// 监听 merchantId 变化
watch(
  () => props.merchantId,
  (newId) => {
    queryParams.merchantId = newId;
    loadData();
  },
  { immediate: true }
);

function formatAmount(amount: number): string {
  return `¥ ${(amount || 0).toFixed(2)}`;
}

async function loadData() {
  if (!queryParams.merchantId) return;
  loading.value = true;
  try {
    const res = await getMerchantAccountFlowPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch {
    ElMessage.error('加载资金流水失败');
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
    <div class="filter-bar">
      <el-form :inline="true" :model="queryParams" class="filter-form">
        <el-form-item>
          <el-select v-model="queryParams.changeType" clearable style="width: 180px" placeholder="变动类型">
            <template #prefix><span class="text-xs text-gray-400">变动类型:</span></template>
            <el-option
              v-for="item in flow_change_type"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
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

        <el-form-item class="filter-actions">
          <el-button type="primary" icon="Search" @click="loadData">查询</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表格 -->
    <div class="table-wrapper">
      <div class="table-toolbar">
        <div class="toolbar-left">
          <ExportButton
            :module-code="ModuleCodeMap.MERCHANT_FLOW"
            :fields="visibleColumns"
            :find-cond="queryParams"
          />
        </div>
        <div class="toolbar-right">
          <ColumnSelector
            :storage-key="MERCHANT_FLOW_STORAGE_KEY"
            :default-columns="defaultMerchantFlowColumns"
            @update:columns="handleColumnsUpdate"
          />
        </div>
      </div>

      <el-table v-loading="loading" :data="tableData" border stripe style="width: 100%">
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
              <DictTag :options="flow_change_type" :value="row.changeType" />
            </template>
            <template v-else-if="col.key === 'changeAmount'">
              <span :class="row.changeAmount > 0 ? 'text-success' : 'text-danger'">
                {{ row.changeAmount > 0 ? '+' : '' }}{{ formatAmount(row.changeAmount) }}
              </span>
            </template>
            <template v-else>
              {{ (row as any)[col.key] ?? '-' }}
            </template>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
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
  </div>
</template>

<style scoped>
.flow-table {
  .filter-bar {
    padding: 12px 16px;
    margin-bottom: 12px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;

    .filter-form {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;

      .filter-actions {
        display: flex;
        gap: 6px;
        margin-left: auto;
      }
    }
  }

  .table-wrapper {
    .table-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .pagination-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    }
  }
}
</style>
