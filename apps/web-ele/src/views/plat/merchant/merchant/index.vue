<script lang="ts" setup>
import type { Merchant, MerchantPageParams } from '#/api/system/merchant';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from '@vben/common-ui';

import { deletePlatMerchantApi, getPlatMerchantPageApi } from '#/api/system/merchant';
import { defaultMerchantColumns, MERCHANT_STORAGE_KEY } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

import MerchantAccountDialog from './MerchantAccountDialog.vue';
import MerchantForm from './MerchantForm.vue';
import MigrationDialog from './MigrationDialog.vue';

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultMerchantColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const merchantFormRef = ref();
const accountDialogRef = ref();
const migrationDialogRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Merchant[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

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

// --- 辅助函数 ---
function getStatusText(status: number): string {
  return status === 0 ? '启用' : '禁用';
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
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// --- 新增 ---
function handleAdd() {
  merchantFormRef.value?.open();
}

// --- 编辑 ---
function handleEdit(row: Merchant) {
  merchantFormRef.value?.open(row);
}

// --- 账户 ---
function handleViewAccount(row: Merchant) {
  accountDialogRef.value?.open(row);
}

// --- 数据迁移 ---
function handleMigration(row: Merchant) {
  migrationDialogRef.value?.open(row);
}

// --- 删除 ---
async function handleDelete(row?: Merchant) {
  let ids: number[] = [];
  if (row) {
    ids = [row.merchantId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条商户吗？删除商户会同时删除其下的管理员账号和所有关联数据。`,
      '提示',
      { type: 'warning' }
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

function handleSelectionChange(selection: Merchant[]) {
  selectedIds.value = selection.map((item) => item.merchantId);
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
            v-model="queryParams.merchantName"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">商户名称:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="queryParams.merchantCode"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">商户编码:</span>
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
      </template>

      <!-- 📥 高级筛选项 -->
      <template #search-advanced>
        <el-form-item>
          <el-input
            v-model="queryParams.phone"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">联系电话:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.status" clearable style="width: 200px">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">状态:</span>
            </template>
            <el-option label="启用" :value="0" />
            <el-option label="禁用" :value="1" />
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <el-button type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
        <ExportButton :module-code="ModuleCodeMap.MERCHANT" :fields="visibleColumns" :find-cond="queryParams" />
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
          :storage-key="MERCHANT_STORAGE_KEY"
          :default-columns="defaultMerchantColumns"
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
            :width="col.width"
            :min-width="col.minWidth"
            :align="col.align"
            :show-overflow-tooltip="col.showOverflowTooltip"
          >
            <template #default="{ row }">
              <template v-if="col.key === 'status'">
                <el-tag :type="row.status === 0 ? 'success' : 'danger'" size="small" round effect="light">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="150" fixed="right" align="center">
            <template #default="{ row }">
              <el-tooltip content="账户" placement="top" :enterable="false">
                <el-button link type="primary" icon="Wallet" @click="handleViewAccount(row)" />
              </el-tooltip>
              <el-tooltip content="编辑" placement="top" :enterable="false">
                <el-button link type="primary" icon="Edit" @click="handleEdit(row)" />
              </el-tooltip>
               <el-tooltip content="数据迁移" placement="top" :enterable="false">
              <el-button link type="warning" icon="Upload" @click="handleMigration(row)" />
            </el-tooltip>
              <el-tooltip content="删除" placement="top" :enterable="false">
                <el-button link type="danger" icon="Delete" @click="handleDelete(row)" />
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <!-- ===== 弹窗们 ===== -->
    <MerchantForm ref="merchantFormRef" @success="handleQuery" />
    <MerchantAccountDialog ref="accountDialogRef" />
    <MigrationDialog ref="migrationDialogRef" @success="handleQuery" />
  </Page>
</template>

<style scoped>
.selected-alert-badge {
  display: inline-block;
}
</style>
