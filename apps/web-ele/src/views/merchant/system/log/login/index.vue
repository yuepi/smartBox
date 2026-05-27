<script lang="ts" setup>
import type { LoginLogPageParams } from "#/api/monitor/login";

import { computed, onMounted, reactive, ref } from "vue";

import { Page } from '@vben/common-ui';

import { Delete, Refresh, Search, View } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import { deleteMerchantLoginLogApi, getMerchantLoginLogDetailApi, getMerchantLoginLogPageApi } from "#/api/monitor/login";
import ColumnSelector from "#/components/ColumnSelector/index.vue";
import DictTag from "#/components/DictTag/index.vue";
import {
  defaultLoginLogColumns,
  LOGIN_LOG_STORAGE_KEY,
  type TableColumnConfig,
} from "#/constants/tableColumns";
import { useDicts } from "#/hooks/useDict";
import { ModuleCodeMap } from "#/hooks/useExport";

const { login_status } = useDicts(["login_status"]);

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultLoginLogColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref([]);
const total = ref(0);
const selectedIds = ref<string[]>([]);

// 详情弹窗控制
const detailVisible = ref(false);
const detailData = ref<any>({});

// 查询参数
const queryParams = reactive<LoginLogPageParams>({
  pageNo: 1,
  pageSize: 10,
  accountName: undefined,
  status: undefined,
});

// 状态选项
const statusOptions = [
  { label: "成功", value: 0 },
  { label: "失败", value: 1 },
];

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getMerchantLoginLogPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

// 查看详情
async function handleView(row: any) {
  try {
    const res = await getMerchantLoginLogDetailApi(row.loginLogId);
    detailData.value = res;
    detailVisible.value = true;
  } catch {
    ElMessage.error("获取详情失败");
  }
}

// 批量删除
async function handleDelete() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning("请选择要删除的记录");
    return;
  }

  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 条日志吗？`, "提示", {
      type: "warning",
    });
    const ids = selectedIds.value.join(",");
    await deleteMerchantLoginLogApi(ids);
    ElMessage.success("删除成功");
    handleQuery();
  } catch {
    // 用户取消删除
  }
}

// 表格选中变化
function handleSelectionChange(selection: any[]) {
  selectedIds.value = selection.map((item) => item.loginLogId);
}

// 搜索与重置
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
    <div class="p-4">
      <!-- 查询表单 -->
      <el-card shadow="never" class="border-none mb-4 !p-2">
        <el-form :inline="true" :model="queryParams" class="flex flex-wrap gap-x-2 gap-y-2 items-center">
          <el-form-item class="!mb-0 !mr-2">
            <el-input
v-model="queryParams.accountName" placeholder="请输入" clearable style="width: 200px"
              @keyup.enter="handleQuery"
>
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">登录账号:</span>
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
            <ExportButton
              :module-code="ModuleCodeMap.LOGIN_LOG"
              :fields="visibleColumns"
              :find-cond="queryParams"
            />
            <el-button type="danger" plain :icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete">
              批量删除
            </el-button>
            <span v-if="selectedIds.length > 0" class="text-xs text-gray-400 ml-2">
              已选 <span class="text-red-500 font-medium">{{ selectedIds.length }}</span> 项
            </span>
          </div>
          <div class="flex items-center">
            <ColumnSelector
:storage-key="LOGIN_LOG_STORAGE_KEY" :default-columns="defaultLoginLogColumns"
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
              <!-- 状态 -->
              <template v-if="col.key === 'status'">
                <DictTag :options="login_status" :value="row.status" />
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
    <el-dialog v-model="detailVisible" title="登录日志详情" width="600px" append-to-body>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="登录账号">{{ detailData.accountName }}</el-descriptions-item>
        <el-descriptions-item label="登录IP">{{ detailData.ipAddr }}</el-descriptions-item>
        <el-descriptions-item label="登录地点">{{ detailData.loginLocation }}</el-descriptions-item>
        <el-descriptions-item label="浏览器">{{ detailData.browser }}</el-descriptions-item>
        <el-descriptions-item label="操作系统">{{ detailData.os }}</el-descriptions-item>
        <el-descriptions-item label="登录状态">
          <el-tag :type="detailData.status === 0 ? 'success' : 'danger'" size="small" round effect="light">
            {{ detailData.status === 0 ? "成功" : "失败" }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操作信息">{{ detailData.msg }}</el-descriptions-item>
        <el-descriptions-item label="登录日期">{{ detailData.loginTime }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped lang="scss">
// 不需要额外样式
</style>
