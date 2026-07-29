<script lang="ts" setup>
import type { LoginLogPageParams } from '#/api/monitor/login';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from '@vben/common-ui';

import { deletePlatLoginLogApi, getPlatLoginLogPageApi } from '#/api/monitor/login';
import { defaultLoginLogColumns, LOGIN_LOG_STORAGE_KEY } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

const { login_status } = useDicts(['login_status']);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultLoginLogColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const selectedIds = ref<string[]>([]);
const moreParams = ref(false);

// 详情弹窗
const detailVisible = ref(false);
const detailData = ref<any>({});

// 查询参数
const queryParams = reactive<LoginLogPageParams>({
  pageNo: 1,
  pageSize: 10,
  accountName: undefined,
  status: undefined,
});

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getPlatLoginLogPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

// --- 详情 ---
function handleView(row: any) {
  detailData.value = row;
  detailVisible.value = true;
}

// --- 批量删除 ---
async function handleDelete() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要删除的记录');
    return;
  }
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 条日志吗？`, '提示', { type: 'warning' });
    await deletePlatLoginLogApi(selectedIds.value.join(','));
    ElMessage.success('删除成功');
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: any[]) {
  selectedIds.value = selection.map((item) => item.loginLogId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.accountName = undefined;
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
            v-model="queryParams.accountName"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">登录账号:</span>
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
              v-for="item in login_status"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <ExportButton :module-code="ModuleCodeMap.LOGIN_LOG" :fields="visibleColumns" :find-cond="queryParams" />
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
          :storage-key="LOGIN_LOG_STORAGE_KEY"
          :default-columns="defaultLoginLogColumns"
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
                <DictTag :options="login_status" :value="row.status" />
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

    <!-- ===== 详情弹窗 ===== -->
    <el-dialog v-model="detailVisible" title="登录日志详情" width="600px" append-to-body>
      <el-descriptions :column="2" border v-if="detailData && Object.keys(detailData).length > 0">
        <el-descriptions-item label="登录账号">{{ detailData.accountName }}</el-descriptions-item>
        <el-descriptions-item label="登录IP">{{ detailData.ipAddr || '-' }}</el-descriptions-item>
        <el-descriptions-item label="登录地点">{{ detailData.loginLocation || '-' }}</el-descriptions-item>
        <el-descriptions-item label="浏览器">{{ detailData.browser || '-' }}</el-descriptions-item>
        <el-descriptions-item label="操作系统">{{ detailData.os || '-' }}</el-descriptions-item>
        <el-descriptions-item label="登录状态">
          <DictTag :options="login_status" :value="detailData.status" />
        </el-descriptions-item>
        <el-descriptions-item label="操作信息" :span="2">{{ detailData.msg || '-' }}</el-descriptions-item>
        <el-descriptions-item label="登录日期" :span="2">{{ detailData.loginTime || '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-empty v-else description="暂无数据" />
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
