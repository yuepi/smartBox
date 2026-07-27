<script lang="ts" setup>
import type { OperLog, OperLogPageParams } from '#/api/monitor/oper';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from '@vben/common-ui';

import { deleteMerchantOperLogApi, getMerchantOperLogPageApi } from '#/api/monitor/oper';
import { defaultOperLogColumns, OPER_LOG_STORAGE_KEY } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

const { business_type, account_type, oper_status } = useDicts(['business_type', 'account_type', 'oper_status']);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultOperLogColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<OperLog[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

// 详情弹窗
const detailVisible = ref(false);
const detailData = ref<null | OperLog>(null);

// 查询参数
const queryParams = reactive<OperLogPageParams>({
  pageNo: 1,
  pageSize: 10,
  title: undefined,
  businessType: undefined,
  operAccountType: undefined,
  operAccountName: undefined,
  status: undefined,
});

// --- 辅助函数 ---
function formatCostTime(costTime: number): string {
  if (costTime === undefined || costTime === null) return '-';
  return `${costTime}ms`;
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getMerchantOperLogPageApi(queryParams);
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
function handleView(row: OperLog) {
  detailData.value = row;
  detailVisible.value = true;
}

// --- 删除 ---
async function handleDelete(row?: OperLog) {
  let ids: number[] = [];
  if (row) {
    ids = [row.operLogId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${ids.length} 条日志吗？`, '提示', { type: 'warning' });
    for (const id of ids) {
      await deleteMerchantOperLogApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条日志`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: OperLog[]) {
  selectedIds.value = selection.map((item) => item.operLogId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.title = undefined;
  queryParams.businessType = undefined;
  queryParams.operAccountType = undefined;
  queryParams.operAccountName = undefined;
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
            v-model="queryParams.title"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">模块标题:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="queryParams.operAccountName"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">操作人:</span>
            </template>
          </el-input>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <template #search-advanced>
        <el-form-item>
          <el-select v-model="queryParams.businessType" clearable style="width: 200px">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">业务类型:</span>
            </template>
            <el-option
              v-for="item in business_type"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.operAccountType" clearable style="width: 200px">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">操作人类型:</span>
            </template>
            <el-option
              v-for="item in account_type"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.status" clearable style="width: 200px">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">状态:</span>
            </template>
            <el-option
              v-for="item in oper_status"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <ExportButton :module-code="ModuleCodeMap.OPER_LOG" :fields="visibleColumns" :find-cond="queryParams" />
        <el-button type="danger" plain icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete">
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
          :storage-key="OPER_LOG_STORAGE_KEY"
          :default-columns="defaultOperLogColumns"
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
              <template v-if="col.key === 'businessType'">
                <DictTag :options="business_type" :value="row.businessType" />
              </template>
              <template v-else-if="col.key === 'operAccountType'">
                <DictTag :options="account_type" :value="row.operAccountType" />
              </template>
              <template v-else-if="col.key === 'status'">
                <DictTag :options="oper_status" :value="row.status" />
              </template>
              <template v-else-if="col.key === 'operRequestMethod'">
                <el-tag :type="row.operRequestMethod === 'GET' ? 'success' : 'primary'" size="small" round effect="light">
                  {{ row.operRequestMethod || '-' }}
                </el-tag>
              </template>
              <template v-else-if="col.key === 'costTime'">
                <span :class="row.costTime > 1000 ? 'text-danger' : ''">
                  {{ formatCostTime(row.costTime) }}
                </span>
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="100" fixed="right" align="center">
            <template #default="{ row }">
              <el-tooltip content="详情" placement="top" :enterable="false">
                <el-button link type="primary" icon="View" @click="handleView(row)" />
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <!-- ===== 详情弹窗（优化布局） ===== -->
    <el-dialog v-model="detailVisible" title="操作日志详情" width="800px" append-to-body>
      <template v-if="detailData">
        <!-- 顶部概要卡片 -->
        <div class="grid grid-cols-4 gap-4 mb-6">
          <div class="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 text-center">
            <div class="text-xs text-gray-400 mb-1">操作ID</div>
            <div class="font-mono font-medium text-sm">{{ detailData.operLogId }}</div>
          </div>
          <div class="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 text-center">
            <div class="text-xs text-gray-400 mb-1">操作状态</div>
            <DictTag :options="oper_status" :value="detailData.status" />
          </div>
          <div class="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 text-center">
            <div class="text-xs text-gray-400 mb-1">请求方式</div>
            <el-tag :type="detailData.operRequestMethod === 'GET' ? 'success' : 'primary'" size="small">
              {{ detailData.operRequestMethod || '-' }}
            </el-tag>
          </div>
          <div class="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 text-center">
            <div class="text-xs text-gray-400 mb-1">操作耗时</div>
            <span :class="detailData.costTime > 1000 ? 'text-danger font-bold' : ''">
              {{ formatCostTime(detailData.costTime) }}
            </span>
          </div>
        </div>

        <!-- 详细信息 -->
        <el-descriptions :column="2" border label-width="120px">
          <el-descriptions-item label="模块标题" :span="2">
            <span class="font-medium">{{ detailData.title }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="业务类型">
            <DictTag :options="business_type" :value="detailData.businessType" />
          </el-descriptions-item>
          <el-descriptions-item label="操作人">
            {{ detailData.operAccountName }}
          </el-descriptions-item>
          <el-descriptions-item label="操作人类型">
            <DictTag :options="account_type" :value="detailData.operAccountType" />
          </el-descriptions-item>
          <el-descriptions-item label="操作IP">
            {{ detailData.operIp }}
          </el-descriptions-item>
          <el-descriptions-item label="操作地点">
            {{ detailData.operLocation || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="请求URL" :span="2">
            <span class="font-mono text-sm break-all">{{ detailData.operUrl || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="请求参数" :span="2">
            <pre class="whitespace-pre-wrap break-all max-h-48 overflow-auto bg-gray-50 dark:bg-zinc-900 p-3 rounded text-sm font-mono">{{ detailData.operParam || '-' }}</pre>
          </el-descriptions-item>
          <el-descriptions-item label="返回结果" :span="2">
            <pre class="whitespace-pre-wrap break-all max-h-48 overflow-auto bg-gray-50 dark:bg-zinc-900 p-3 rounded text-sm font-mono">{{ detailData.operResultData || '-' }}</pre>
          </el-descriptions-item>
          <el-descriptions-item v-if="detailData.errorMsg" label="异常信息" :span="2">
            <pre class="whitespace-pre-wrap break-all text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm font-mono">{{ detailData.errorMsg }}</pre>
          </el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped>
.selected-alert-badge {
  display: inline-block;
}
</style>
