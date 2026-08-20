<script lang="ts" setup>
import type { Qrcode, QrcodePageParams } from '#/api/device/qrCode';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from "@vben/common-ui";

import {
  batchDownQrcodeFileApi,
  deleteQrcodeApi,
  getQrcodePageApi,
} from '#/api/device/qrCode';
import { defaultQrcodeColumns, QRCODE_STORAGE_KEY } from '#/constants/tableColumns';
import { ModuleCodeMap } from "#/hooks/useExport";

import DetailDialog from './Detail.vue';
import GenerateDialog from './Generate.vue';
import ShowDialog from './ShowDialog.vue';

const { qrcode_type, qrcode_bind_status, qrcode_status } = useDicts([
  'qrcode_type',
  'qrcode_bind_status',
  'qrcode_status'
]);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultQrcodeColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用弹窗 ---
const detailDialogRef = ref();
const generateDialogRef = ref();
const showDialogRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Qrcode[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

// 查询参数
const queryParams = reactive<QrcodePageParams>({
  pageNo: 1,
  pageSize: 10,
  qrcodeCode: undefined,
  qrcodeType: undefined,
  bindFlag: undefined,
  status: undefined,
});

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getQrcodePageApi(queryParams);
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
function handleView(row: Qrcode) {
  detailDialogRef.value?.open(row.qrcodeId);
}

// --- 生成 ---
function handleGenerate() {
  generateDialogRef.value?.open();
}

// --- 单个展示 ---
function handleShowSingle(row: Qrcode) {
  showDialogRef.value?.open([row.qrcodeId], `二维码展示 - ${row.qrcodeCode}`);
}

// --- 单个下载 ---
async function handleDownloadSingle(row: Qrcode) {
  try {
    const res = await batchDownQrcodeFileApi({ qrcodeIds: [row.qrcodeId] });
    const blob = res.data;
    if (!(blob instanceof Blob)) return;

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR_${row.qrcodeCode}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    ElMessage.success('下载成功');
  } catch {
    ElMessage.error('下载失败');
  }
}

// --- 批量二维码操作 ---
function handleBatchQrcodeCommand(cmd: string) {
  const ids = selectedIds.value;
  if (ids.length === 0) {
    ElMessage.warning('请先选择二维码');
    return;
  }
  if (cmd === 'show') {
    handleBatchShow();
  } else if (cmd === 'download') {
    handleBatchDownload();
  }
}

// --- 批量删除 ---
async function handleBatchDelete() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要删除的二维码');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 个二维码吗？`,
      '提示',
      { type: 'warning' }
    );
    for (const id of selectedIds.value) {
      await deleteQrcodeApi(id);
    }
    ElMessage.success(`成功删除 ${selectedIds.value.length} 个二维码`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}


// --- 批量展示 ---
function handleBatchShow() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要展示的二维码');
    return;
  }
  showDialogRef.value?.open(selectedIds.value, `批量展示二维码 (共 ${selectedIds.value.length} 个)`);
}

// --- 批量下载 ---
async function handleBatchDownload() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要下载的二维码');
    return;
  }
  try {
    const res = await batchDownQrcodeFileApi({ qrcodeIds: selectedIds.value });
    const blob = res.data;
    if (!(blob instanceof Blob)) return;

    let filename = `qrcodes_${Date.now()}.zip`;
    const contentDisposition = res.headers?.['content-disposition'];
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^"';]+)['"]?/i);
      if (match?.[1]) filename = decodeURIComponent(match[1]);
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    ElMessage.success('批量下载已开始');
  } catch {
    ElMessage.error('批量下载失败');
  }
}

// --- 查看二维码图片 ---
function showQrcodeImage(row: Qrcode) {
  if (row.qrcodeUrl) {
    window.open(row.qrcodeUrl, '_blank');
  } else {
    ElMessage.warning('无二维码图片');
  }
}

// --- 选中 ---
function handleSelectionChange(selection: Qrcode[]) {
  selectedIds.value = selection.map((item) => item.qrcodeId);
}

// --- 查询/重置 ---
function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.qrcodeCode = undefined;
  queryParams.qrcodeType = undefined;
  queryParams.bindFlag = undefined;
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
v-model:query-params="queryParams" v-model:more-params="moreParams" :loading="loading"
      :total="total" @search="loadData" @reset="resetQuery"
>
      <!-- 📥 基础筛选项 -->
      <template #search-basic>
        <el-form-item>
          <el-input
v-model="queryParams.qrcodeCode" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">二维码编号:</span>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-select v-model="queryParams.qrcodeType" clearable style="width: 200px">
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">二维码类型:</span>
            </template>
            <el-option v-for="item in qrcode_type" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.bindFlag" clearable style="width: 200px">
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">绑定状态:</span>
            </template>
            <el-option v-for="item in qrcode_bind_status" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.status" clearable style="width: 200px">
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">状态:</span>
            </template>
            <el-option v-for="item in qrcode_status" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <!-- <template #search-advanced>
      </template> -->

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <el-button type="primary" plain icon="Plus" @click="handleGenerate">
          生成二维码
        </el-button>
        <ExportButton :module-code="ModuleCodeMap.QRCODE" :fields="visibleColumns" :find-cond="queryParams" />
        <el-button type="danger" plain icon="Delete" :disabled="selectedIds.length === 0" @click="handleBatchDelete">
          批量删除
        </el-button>

        <el-dropdown v-if="selectedIds.length > 0" @command="handleBatchQrcodeCommand">
          <el-button type="primary" plain>
            批量二维码
            <el-icon class="el-icon--right">
              <ArrowDown />
            </el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="show">批量展示二维码</el-dropdown-item>
              <el-dropdown-item command="download">批量下载二维码</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <transition name="el-fade-in">
          <span v-if="selectedIds.length > 0" class="selected-alert-badge ml-2 text-sm text-gray-400">
            已选
            <span class="text-red-500 font-medium">{{ selectedIds.length }}</span>
            项
          </span>
        </transition>
      </template>

      <!-- 📥 工具栏右侧 -->
      <template #toolbar-right>
        <ColumnSelector
:storage-key="QRCODE_STORAGE_KEY" :default-columns="defaultQrcodeColumns"
          @update:columns="handleColumnsUpdate"
/>
      </template>

      <!-- 📥 表格 -->
      <template #table>
        <el-table
:data="tableData" border stripe style="width: 100%; height: 100%"
          @selection-change="handleSelectionChange"
>
          <el-table-column type="selection" width="50" align="center" />

          <el-table-column
v-for="col in visibleColumns" :key="col.key" :prop="col.key" :label="col.label"
            :width="typeof col.width === 'number' ? col.width : undefined" :min-width="col.minWidth" :align="col.align"
>
            <template #default="{ row }">
              <template v-if="col.key === 'qrcodeType'">
                <DictTag :options="qrcode_type" :value="row.qrcodeType" />
              </template>
              <template v-else-if="col.key === 'bindFlag'">
                <DictTag :options="qrcode_bind_status" :value="row.bindFlag" />
              </template>
              <template v-else-if="col.key === 'status'">
                <DictTag :options="qrcode_status" :value="row.status" />
              </template>
              <template v-else-if="col.key === 'qrcodeUrl'">
                <el-button v-if="row.qrcodeUrl" link type="primary" size="small" @click="showQrcodeImage(row)">
                  查看图片
                </el-button>
                <span v-else class="text-gray-400">-</span>
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right" align="center">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="handleView(row)">
                  详情
                </el-button>
                <el-button size="small" type="primary" @click="handleShowSingle(row)">
                  展示
                </el-button>
                <el-button size="small" type="warning" @click="handleDownloadSingle(row)">
                  下载
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <!-- ===== 弹窗们 ===== -->
    <GenerateDialog ref="generateDialogRef" @success="handleQuery" />
    <DetailDialog ref="detailDialogRef" />
    <ShowDialog ref="showDialogRef" @download="handleDownloadSingle" />
  </Page>
</template>

<style scoped lang="scss">
.selected-alert-badge {
  display: inline-block;
}
</style>
