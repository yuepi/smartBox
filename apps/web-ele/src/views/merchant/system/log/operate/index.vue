<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Delete, Refresh, Search, View } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  deleteMerchantOperLogApi,
  getMerchantOperLogDetailApi,
  getMerchantOperLogPageApi,
  type OperLog,
  type OperLogPageParams,
} from '#/api/monitor/oper';

// 业务类型映射
const businessTypeMap: Record<number, string> = {
  0: '其他',
  1: '新增',
  2: '修改',
  3: '删除',
  4: '查询',
  5: '导出',
};

const businessTypeOptions = [
  { label: '全部', value: undefined },
  { label: '其他', value: 0 },
  { label: '新增', value: 1 },
  { label: '修改', value: 2 },
  { label: '删除', value: 3 },
  { label: '查询', value: 4 },
  { label: '导出', value: 5 },
];

// 操作人类型映射
const accountTypeMap: Record<number, string> = {
  0: '后台用户',
  1: '会员',
};

const accountTypeOptions = [
  { label: '全部', value: undefined },
  { label: '后台用户', value: 0 },
  { label: '会员', value: 1 },
];

// 操作状态映射
const statusMap: Record<number, string> = {
  0: '成功',
  1: '失败',
};

const statusOptions = [
  { label: '全部', value: undefined },
  { label: '成功', value: 0 },
  { label: '失败', value: 1 },
];

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<OperLog[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 详情弹窗控制
const detailVisible = ref(false);
const detailData = ref<null | OperLog>(null);

// 新增/编辑弹窗控制
const formVisible = ref(false);
const formTitle = ref('');
const formData = ref<Partial<OperLog>>({});
const formSubmitting = ref(false);

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

// 获取业务类型文本
function getBusinessTypeText(type: number): string {
  return businessTypeMap[type] || '未知';
}

// 获取操作人类型文本
function getAccountTypeText(type: number): string {
  return accountTypeMap[type] || '未知';
}

// 获取状态文本
function getStatusText(status: number): string {
  return statusMap[status] || '未知';
}

// 格式化耗时显示
function formatCostTime(costTime: number): string {
  if (costTime === undefined || costTime === null) return '-';
  return `${costTime}ms`;
}

// --- 数据加载 ---

// 加载分页数据
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

// --- 详情相关 ---
async function handleView(row: OperLog) {
  try {
    const res = await getMerchantOperLogDetailApi(row.operLogId);
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
    // 单条删除
    ids = [row.operLogId];
  } else {
    // 批量删除
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条日志吗？`,
      '提示',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      }
    );

    // 逐个删除（API 只支持单个删除）
    for (const id of ids) {
      await deleteMerchantOperLogApi(id);
    }

    ElMessage.success(`成功删除 ${ids.length} 条日志`);
    // 清空选中
    selectedIds.value = [];
    handleQuery();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
}

// 表格选中变化
function handleSelectionChange(selection: OperLog[]) {
  selectedIds.value = selection.map((item) => item.operLogId);
}

// --- 搜索与重置 ---
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

// --- 生命周期 ---
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
          <el-form-item label="模块标题">
            <el-input v-model="queryParams.title" placeholder="请输入模块标题" clearable style="width: 180px"
              @keyup.enter="handleQuery" />
          </el-form-item>

          <el-form-item label="业务类型">
            <el-select v-model="queryParams.businessType" placeholder="全部" clearable style="width: 120px">
              <el-option v-for="item in businessTypeOptions" :key="item.value" :label="item.label"
                :value="item.value" />
            </el-select>
          </el-form-item>

          <el-form-item label="操作人类型">
            <el-select v-model="queryParams.operAccountType" placeholder="全部" clearable style="width: 120px">
              <el-option v-for="item in accountTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>

          <el-form-item label="操作人">
            <el-input v-model="queryParams.operAccountName" placeholder="请输入操作人" clearable style="width: 150px"
              @keyup.enter="handleQuery" />
          </el-form-item>

          <el-form-item label="状态">
            <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 100px">
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleQuery">
              查询
            </el-button>
            <el-button :icon="Refresh" @click="resetQuery">
              重置
            </el-button>
            <el-button type="danger" plain :icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete()">
              批量删除
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 -->
      <el-card shadow="never">
        <el-table v-loading="loading" :data="tableData" border style="width: 100%"
          @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column prop="operLogId" label="操作ID" width="80" align="center" />
          <el-table-column prop="title" label="模块标题" min-width="150" align="center" show-overflow-tooltip />
          <el-table-column prop="businessType" label="业务类型" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.businessType === 1 ? 'success' : row.businessType === 3 ? 'danger' : 'info'">
                {{ getBusinessTypeText(row.businessType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="operAccountName" label="操作人" width="120" align="center" />
          <el-table-column prop="operAccountType" label="操作人类型" width="100" align="center">
            <template #default="{ row }">
              {{ getAccountTypeText(row.operAccountType) }}
            </template>
          </el-table-column>
          <el-table-column prop="operIp" label="操作IP" width="140" align="center" />
          <el-table-column prop="operLocation" label="操作地点" width="150" align="center" show-overflow-tooltip />
          <el-table-column prop="operRequestMethod" label="请求方式" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.operRequestMethod === 'GET' ? 'success' : 'primary'" size="small">
                {{ row.operRequestMethod }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 0 ? 'success' : 'danger'">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="costTime" label="耗时" width="80" align="center">
            <template #default="{ row }">
              <span :class="row.costTime > 1000 ? 'text-red-500' : ''">
                {{ formatCostTime(row.costTime) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" :icon="View" @click="handleView(row)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="flex justify-end mt-4">
          <el-pagination v-model:current-page="queryParams.pageNo" v-model:page-size="queryParams.pageSize"
            :total="total" :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadData" @current-change="loadData" />
        </div>
      </el-card>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="操作日志详情" width="700px" append-to-body>
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="操作ID" :span="2">
          {{ detailData.operLogId }}
        </el-descriptions-item>
        <el-descriptions-item label="模块标题" :span="2">
          {{ detailData.title }}
        </el-descriptions-item>
        <el-descriptions-item label="业务类型">
          <el-tag :type="detailData.businessType === 1 ? 'success' : detailData.businessType === 3 ? 'danger' : 'info'">
            {{ getBusinessTypeText(detailData.businessType) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操作状态">
          <el-tag :type="detailData.status === 0 ? 'success' : 'danger'">
            {{ getStatusText(detailData.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操作人">
          {{ detailData.operAccountName }}
        </el-descriptions-item>
        <el-descriptions-item label="操作人类型">
          {{ getAccountTypeText(detailData.operAccountType) }}
        </el-descriptions-item>
        <el-descriptions-item label="操作IP">
          {{ detailData.operIp }}
        </el-descriptions-item>
        <el-descriptions-item label="操作地点">
          {{ detailData.operLocation || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="请求URL">
          {{ detailData.operUrl || '-' }}
        </el-descriptions-item>
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
        <el-descriptions-item label="操作耗时">
          {{ formatCostTime(detailData.costTime) }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped>
.text-red-500 {
  color: #f56c6c;
}
</style>
