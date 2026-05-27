<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Delete, Refresh, Search, View } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  deletePlatOperLogApi,
  getPlatOperLogDetailApi,
  getPlatOperLogPageApi,
  type OperLog,
  type OperLogPageParams,
} from '#/api/monitor/oper';
import ColumnSelector from "#/components/ColumnSelector/index.vue";
import DictTag from "#/components/DictTag/index.vue";
import {
  defaultOperLogColumns,
  OPER_LOG_STORAGE_KEY,
  type TableColumnConfig,
} from "#/constants/tableColumns";
import { useDicts } from "#/hooks/useDict";
import { ModuleCodeMap } from "#/hooks/useExport";

const { business_type, account_type, oper_status } = useDicts(["business_type", "account_type", "oper_status"]);

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultOperLogColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// 业务类型选项（用于查询表单）
const businessTypeOptions = [
  { label: '全部', value: undefined },
  { label: '其他', value: 0 },
  { label: '新增', value: 1 },
  { label: '修改', value: 2 },
  { label: '删除', value: 3 },
  { label: '查询', value: 4 },
  { label: '导出', value: 5 },
];

// 操作人类型选项
const accountTypeOptions = [
  { label: '全部', value: undefined },
  { label: '后台用户', value: 0 },
  { label: '会员', value: 1 },
];

// 状态选项
const statusOptions = [
  { label: '全部', value: undefined },
  { label: '成功', value: 0 },
  { label: '失败', value: 1 },
];

// --- 辅助函数 ---
function formatCostTime(costTime: number): string {
  if (costTime === undefined || costTime === null) return '-';
  return `${costTime}ms`;
}

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<OperLog[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 详情弹窗控制
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

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getPlatOperLogPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// --- 详情相关 ---
async function handleView(row: OperLog) {
  try {
    const res = await getPlatOperLogDetailApi(row.operLogId);
    detailData.value = res;
    detailVisible.value = true;
  } catch {
    ElMessage.error('获取详情失败');
  }
}

// --- 删除相关 ---
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
      await deletePlatOperLogApi(id);
    }

    ElMessage.success(`成功删除 ${ids.length} 条日志`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

// 表格选中变化
function handleSelectionChange(selection: OperLog[]) {
  selectedIds.value = selection.map((item) => item.operLogId);
}

// 搜索与重置
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
    <div class="p-4">
      <!-- 查询表单 -->
      <el-card shadow="never" class="border-none mb-4 !p-2">
        <el-form :inline="true" :model="queryParams" class="flex flex-wrap gap-x-2 gap-y-2 items-center">
          <el-form-item class="!mb-0 !mr-2">
            <el-input
v-model="queryParams.title" placeholder="请输入" clearable style="width: 200px"
              @keyup.enter="handleQuery"
>
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">模块标题:</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select v-model="queryParams.businessType" clearable style="width: 200px">
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">业务类型:</span>
              </template>
              <el-option v-for="item in businessTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select v-model="queryParams.operAccountType" clearable style="width: 200px">
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">操作人类型:</span>
              </template>
              <el-option v-for="item in accountTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-input
v-model="queryParams.operAccountName" placeholder="请输入" clearable style="width: 200px"
              @keyup.enter="handleQuery"
>
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">操作人:</span>
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
            <ExportButton :module-code="ModuleCodeMap.OPER_LOG" :fields="visibleColumns" :find-cond="queryParams" />
            <el-button type="danger" plain :icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete">
              批量删除
            </el-button>
            <span v-if="selectedIds.length > 0" class="text-xs text-gray-400 ml-2">
              已选 <span class="text-red-500 font-medium">{{ selectedIds.length }}</span> 项
            </span>
          </div>
          <div class="flex items-center">
            <ColumnSelector
:storage-key="OPER_LOG_STORAGE_KEY" :default-columns="defaultOperLogColumns"
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
              <!-- 业务类型 -->
              <template v-if="col.key === 'businessType'">
                <DictTag :options="business_type" :value="row.businessType" />
              </template>
              <!-- 操作人类型 -->
              <template v-else-if="col.key === 'operAccountType'">
                <DictTag :options="account_type" :value="row.operAccountType" />
              </template>
              <!-- 状态 -->
              <template v-else-if="col.key === 'status'">
                <DictTag :options="oper_status" :value="row.status" />
              </template>
              <!-- 请求方式 -->
              <template v-else-if="col.key === 'operRequestMethod'">
                <el-tag :type="row.operRequestMethod === 'GET' ? 'success' : 'primary'" size="small" round effect="light">
                  {{ row.operRequestMethod || '-' }}
                </el-tag>
              </template>
              <!-- 耗时 -->
              <template v-else-if="col.key === 'costTime'">
                <span :class="row.costTime > 1000 ? 'text-danger' : ''">
                  {{ formatCostTime(row.costTime) }}
                </span>
              </template>
              <!-- 普通字段 -->
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="100" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" :icon="View" @click="handleView(row)">详情</el-button>
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

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="操作日志详情" width="700px" append-to-body>
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="操作ID" :span="2">{{ detailData.operLogId }}</el-descriptions-item>
        <el-descriptions-item label="模块标题" :span="2">{{ detailData.title }}</el-descriptions-item>
        <el-descriptions-item label="业务类型">
          <DictTag :options="business_type" :value="detailData.businessType" />
        </el-descriptions-item>
        <el-descriptions-item label="操作状态">
          <DictTag :options="oper_status" :value="detailData.status" />
        </el-descriptions-item>
        <el-descriptions-item label="操作人">{{ detailData.operAccountName }}</el-descriptions-item>
        <el-descriptions-item label="操作人类型">
          <DictTag :options="account_type" :value="detailData.operAccountType" />
        </el-descriptions-item>
        <el-descriptions-item label="操作IP">{{ detailData.operIp }}</el-descriptions-item>
        <el-descriptions-item label="操作地点">{{ detailData.operLocation || '-' }}</el-descriptions-item>
        <el-descriptions-item label="请求URL">{{ detailData.operUrl || '-' }}</el-descriptions-item>
        <el-descriptions-item label="请求方式">
          <el-tag :type="detailData.operRequestMethod === 'GET' ? 'success' : 'primary'" size="small">
            {{ detailData.operRequestMethod }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="请求参数" :span="2">
          <pre class="whitespace-pre-wrap break-all max-h-60 overflow-auto bg-gray-50 p-2 rounded text-sm">
            {{ detailData.operParam || '-' }}
          </pre>
        </el-descriptions-item>
        <el-descriptions-item label="返回结果" :span="2">
          <pre class="whitespace-pre-wrap break-all max-h-60 overflow-auto bg-gray-50 p-2 rounded text-sm">
            {{ detailData.operResultData || '-' }}
          </pre>
        </el-descriptions-item>
        <el-descriptions-item label="异常信息" :span="2" v-if="detailData.errorMsg">
          <pre class="whitespace-pre-wrap break-all text-red-500 bg-red-50 p-2 rounded text-sm">
            {{ detailData.errorMsg }}
          </pre>
        </el-descriptions-item>
        <el-descriptions-item label="操作耗时">{{ formatCostTime(detailData.costTime) }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped>
.text-danger {
  color: #f56c6c;
}
</style>
