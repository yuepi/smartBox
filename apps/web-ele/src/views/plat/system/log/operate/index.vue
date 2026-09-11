<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { OperLog, OperLogPageParams } from '#/api/monitor/oper';

import { h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deletePlatOperLogApi,
  getPlatOperLogListApi,
  getPlatOperLogPageApi,
} from '#/api/monitor/oper';
import { ModuleCodeMap } from '#/hooks/useVxeExport';

// 加载字典选项
const { log_business_type, log_account_type, log_oper_status } = useDicts([
  'log_business_type',
  'log_account_type',
  'log_oper_status',
]);

// 详情弹窗状态
const detailVisible = ref(false);
const detailData = ref<null | OperLog>(null);
const queryParams = ref({});

// 辅助格式化
function formatCostTime(costTime: number): string {
  if (costTime === undefined || costTime === null) return '-';
  return `${costTime}ms`;
}

// 详情处理
function handleView(row: OperLog) {
  detailData.value = row;
  detailVisible.value = true;
}

// 批量/单条删除
async function handleDelete(row?: OperLog) {
  let ids: number[];
  if (row) {
    ids = [row.operLogId];
  } else {
    // 获取当前勾选的数据行
    const selectedRows = gridApi.grid?.getCheckboxRecords() || [];
    if (selectedRows.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedRows.map((item: OperLog) => item.operLogId);
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条日志吗？`,
      '提示',
      { type: 'warning' },
    );
    for (const id of ids) {
      await deletePlatOperLogApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条日志`);
    gridApi.query();
  } catch {
    // 取消删除
  }
}

const formOptions: VbenFormProps = {
  wrapperClass: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-6',
  collapsed: false,
  showCollapseButton: true,
  submitOnEnter: true,
  schema: [
    {
      component: 'Input',
      fieldName: 'title',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '模块标题:'),
      }),
      componentProps: {
        placeholder: '请输入',
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'operAccountName',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '操作人:'),
      }),
      componentProps: {
        placeholder: '请输入',
        clearable: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'businessType',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '业务类型:'),
      }),
      componentProps: {
        options: log_business_type,
        placeholder: '请选择',
        clearable: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'operAccountType',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '操作人类型:'),
      }),
      componentProps: {
        options: log_account_type,
        placeholder: '请选择',
        clearable: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'status',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '状态:'),
      }),
      componentProps: {
        options: log_oper_status,
        placeholder: '请选择',
        clearable: true,
      },
    },
  ],
};

const gridOptions: VxeTableGridOptions<OperLog> = {
  keepSource: true,
  height: 'auto',
  id: 'oper_log_grid_custom',
  columns: [
    {
      field: 'checkbox',
      type: 'checkbox',
      width: 50,
    },
    {
      field: 'operLogId',
      title: '操作ID',
      width: 80,
    },
    {
      field: 'title',
      title: '模块标题',
      minWidth: 150,
    },
    {
      field: 'businessType',
      title: '业务类型',
      width: 120,
      slots: { default: 'businessType' },
    },
    {
      field: 'operAccountName',
      title: '操作人',
      width: 200,
    },
    {
      field: 'operAccountType',
      title: '操作人类型',
      width: 150,
      slots: { default: 'operAccountType' },
    },
    { field: 'operIp', title: '操作IP', width: 150 },
    {
      field: 'operLocation',
      title: '操作地点',
      width: 200,
    },
    {
      field: 'operRequestMethod',
      title: '请求方式',
      width: 100,
      slots: { default: 'operRequestMethod' },
    },
    {
      field: 'status',
      title: '状态',
      width: 100,
      slots: { default: 'status' },
    },
    {
      field: 'costTime',
      title: '耗时',
      width: 100,
      slots: { default: 'costTime' },
    },
    {
      field: 'operUrl',
      title: '请求URL',
      visible: false,
      minWidth: 200,
      align: 'left',
    },
    {
      field: 'operParam',
      title: '请求参数',
      visible: false,
      minWidth: 200,
      align: 'left',
    },
    {
      field: 'operResultData',
      title: '返回结果',
      visible: false,
      minWidth: 200,
      align: 'left',
    },
    {
      field: 'errorMsg',
      title: '异常信息',
      visible: false,
      minWidth: 200,
      align: 'left',
    },
    {
      field: 'createTime',
      title: '操作时间',
      visible: false,
      width: 160,
    },
    {
      field: 'action',
      title: '操作',
      width: 200,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        const params: OperLogPageParams = {
          pageNo: page.currentPage,
          pageSize: page.pageSize,
          ...formValues,
        };
        queryParams.value = params;
        return await getPlatOperLogPageApi(params);
      },
      queryAll: () => {
        return getPlatOperLogListApi({
          pageNo: 1,
          pageSize: 10_000,
        });
      },
    },
  },
};

const [Grid, gridApi] = useVbenVxeGrid<OperLog>({
  formOptions,
  gridOptions,
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <el-button
          type="danger"
          plain
          icon="Delete"
          @click="() => handleDelete()"
        >
          批量删除
        </el-button>
        <VxeExportButton
          :module-code="ModuleCodeMap.OPERATE_LOG"
          :find-cond="queryParams"
          :grid-api="gridApi"
        />
      </template>

      <template #businessType="{ row }">
        <DictTag :options="log_business_type" :value="row.businessType" />
      </template>

      <template #operAccountType="{ row }">
        <DictTag :options="log_account_type" :value="row.operAccountType" />
      </template>

      <template #status="{ row }">
        <DictTag :options="log_oper_status" :value="row.status" />
      </template>

      <template #operRequestMethod="{ row }">
        <el-tag
          :type="row.operRequestMethod === 'GET' ? 'success' : 'primary'"
          size="small"
          round
          effect="light"
        >
          {{ row.operRequestMethod || '-' }}
        </el-tag>
      </template>

      <template #costTime="{ row }">
        <span :class="row.costTime > 1000 ? 'text-danger font-bold' : ''">
          {{ formatCostTime(row.costTime) }}
        </span>
      </template>

      <template #action="{ row }">
        <div class="action-buttons">
          <el-button
            type="primary"
            @click="handleView(row)"
          >
            详情
          </el-button>
          <el-button
            type="danger"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </div>
      </template>
    </Grid>

    <!-- ===== 详情弹窗 ===== -->
    <el-dialog
      v-model="detailVisible"
      title="操作日志详情"
      width="700px"
      append-to-body
    >
      <template v-if="detailData">
        <!-- 顶部概要卡片 -->
        <div class="grid grid-cols-4 gap-4 mb-6">
          <div class="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 text-center">
            <div class="text-xs text-gray-400 mb-1">操作ID</div>
            <div class="font-mono font-medium text-sm">
              {{ detailData.operLogId }}
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 text-center">
            <div class="text-xs text-gray-400 mb-1">操作状态</div>
            <DictTag :options="log_oper_status" :value="detailData.status" />
          </div>
          <div class="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 text-center">
            <div class="text-xs text-gray-400 mb-1">请求方式</div>
            <el-tag
              :type="
                detailData.operRequestMethod === 'GET' ? 'success' : 'primary'
              "
              size="small"
            >
              {{ detailData.operRequestMethod || '-' }}
            </el-tag>
          </div>
          <div class="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 text-center">
            <div class="text-xs text-gray-400 mb-1">操作耗时</div>
            <span
              :class="detailData.costTime > 1000 ? 'text-danger font-bold' : ''"
            >
              {{ formatCostTime(detailData.costTime) }}
            </span>
          </div>
        </div>

        <!-- 详细信息 -->
        <el-descriptions :column="2" border label-width="120px">
          <el-descriptions-item label="模块标题" :span="2">
            <span class="font-medium">{{ detailData.title }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="业务类型" :span="1">
            <DictTag
              :options="log_business_type"
              :value="detailData.businessType"
            />
          </el-descriptions-item>
          <el-descriptions-item label="操作人">
            {{ detailData.operAccountName }}
          </el-descriptions-item>
          <el-descriptions-item label="操作人类型">
            <DictTag
              :options="log_account_type"
              :value="detailData.operAccountType"
            />
          </el-descriptions-item>
          <el-descriptions-item label="操作IP">
            {{ detailData.operIp }}
          </el-descriptions-item>
          <el-descriptions-item label="操作地点">
            {{ detailData.operLocation || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="请求URL" :span="2">
            <span class="font-mono text-sm break-all">{{
              detailData.operUrl || '-'
            }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="请求参数" :span="2">
            <pre
              class="whitespace-pre-wrap break-all max-h-48 overflow-auto bg-gray-50 dark:bg-zinc-900 p-3 rounded text-sm font-mono"
              >{{ detailData.operParam || '-' }}</pre>
          </el-descriptions-item>
          <el-descriptions-item label="返回结果" :span="2">
            <pre
              class="whitespace-pre-wrap break-all max-h-48 overflow-auto bg-gray-50 dark:bg-zinc-900 p-3 rounded text-sm font-mono"
              >{{ detailData.operResultData || '-' }}</pre>
          </el-descriptions-item>
          <el-descriptions-item
            v-if="detailData.errorMsg"
            label="异常信息"
            :span="2"
          >
            <pre
              class="whitespace-pre-wrap break-all text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm font-mono"
              >{{ detailData.errorMsg }}</pre>
          </el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </Page>
</template>
