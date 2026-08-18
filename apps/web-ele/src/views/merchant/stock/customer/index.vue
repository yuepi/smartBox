<script lang="ts" setup>
import type { Customer, CustomerPageParams } from '#/api/stock/customer';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from '@vben/common-ui';

import { deleteCustomerApi, getCustomerPageApi } from '#/api/stock/customer';
import { CUSTOMER_STORAGE_KEY, defaultCustomerColumns } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

import CustomerForm from './CustomerForm.vue';

const { default_status } = useDicts(['default_status']);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultCustomerColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const customerFormRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Customer[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

// 查询参数
const queryParams = reactive<CustomerPageParams>({
  pageNo: 1,
  pageSize: 10,
  customerName: undefined,
  contact: undefined,
  phone: undefined,
  status: undefined,
});

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getCustomerPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// --- 新增 ---
function handleAdd() {
  customerFormRef.value?.open();
}

// --- 编辑 ---
function handleEdit(row: Customer) {
  customerFormRef.value?.open(row);
}

// --- 删除 ---
async function handleDelete(row?: Customer) {
  let ids: number[] = [];
  if (row) {
    ids = [row.customerId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${ids.length} 条回收商吗？`, '提示', { type: 'warning' });
    for (const id of ids) {
      await deleteCustomerApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条回收商`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: Customer[]) {
  selectedIds.value = selection.map((item) => item.customerId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.customerName = undefined;
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
    <BaseTableLayout
      v-model:query-params="queryParams"
      v-model:more-params="moreParams"
      :loading="loading"
      :total="total"
      @search="loadData"
      @reset="resetQuery"
    >
      <!-- 📥 基础筛选项 -->
      <template #search-basic>
        <el-form-item>
          <el-input
            v-model="queryParams.customerName"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">回收商名称:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="queryParams.contact"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">联系人:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="queryParams.phone"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">电话:</span>
            </template>
          </el-input>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <template #search-advanced>
        <el-form-item>
          <el-select v-model="queryParams.status" clearable style="width: 200px">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">状态:</span>
            </template>
            <el-option
              v-for="item in default_status"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <el-button type="primary" plain icon="Plus" @click="handleAdd">新增回收商</el-button>
        <ExportButton :module-code="ModuleCodeMap.CUSTOMER" :fields="visibleColumns" :find-cond="queryParams" />
        <el-button type="danger" plain icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete()">
          批量删除
        </el-button>
        <transition name="el-fade-in">
          <span v-if="selectedIds.length > 0" class="selected-alert-badge ml-2 text-xs text-gray-400">
            已选 <span class="text-red-500 font-medium">{{ selectedIds.length }}</span> 项
          </span>
        </transition>
      </template>

      <!-- 📥 工具栏右侧 -->
      <template #toolbar-right>
        <ColumnSelector
          :storage-key="CUSTOMER_STORAGE_KEY"
          :default-columns="defaultCustomerColumns"
          @update:columns="handleColumnsUpdate"
        />
      </template>

      <!-- 📥 表格 -->
      <template #table>
        <el-table
          :data="tableData"
          border
          stripe
          style="width: 100%; height: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" align="center" />

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
              <template v-if="col.key === 'status'">
                <DictTag :options="default_status" :value="row.status" />
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="150" fixed="right" align="center">
            <template #default="{ row }">
              <el-tooltip content="编辑" placement="top" :enterable="false">
                <el-button link type="primary" icon="Edit" @click="handleEdit(row)" />
              </el-tooltip>
              <el-tooltip content="删除" placement="top" :enterable="false">
                <el-button link type="danger" icon="Delete" @click="handleDelete(row)" />
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <CustomerForm ref="customerFormRef" @success="handleQuery" />
  </Page>
</template>

<style scoped>
.selected-alert-badge {
  display: inline-block;
}
</style>
