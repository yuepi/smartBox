<script lang="ts" setup>
import type { DeviceBag, DeviceBagPageParams } from '#/api/device/deviceBag';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from '@vben/common-ui';

import {
  bagUnBindDeviceHatchApi,
  batchDownDeviceBagQrcodeFileApi,
  deleteDeviceBagApi,
  downOneDeviceBagQrcodeFileApi,
  downOneDeviceBagQrcodeJsonApi,
  getDeviceBagPageApi,
} from '#/api/device/deviceBag';
import { BAG_STORAGE_KEY, defaultBagColumns } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

import BagForm from './BagForm.vue';
import BindDialog from './BindDialog.vue';
import GenerateDialog from './GenerateDialog.vue';
import QrcodeDialog from './QrcodeDialog.vue';

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultBagColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const bagFormRef = ref();
const generateDialogRef = ref();
const qrcodeDialogRef = ref();
const bindDialogRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<DeviceBag[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

// 查询参数
const queryParams = reactive<DeviceBagPageParams>({
  pageNo: 1,
  pageSize: 10,
  bagNo: undefined,
  bagStatus: undefined,
  status: undefined,
});

// --- 辅助函数 ---
function getBagStatusText(status: number): string {
  const map: Record<number, string> = { 0: '未绑定', 1: '已绑定', 2: '已破损' };
  return map[status] || '未知';
}

function getBagStatusType(status: number): string {
  const map: Record<number, string> = { 0: 'info', 1: 'success', 2: 'danger' };
  return map[status] || 'info';
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getDeviceBagPageApi(queryParams);
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
  bagFormRef.value?.open();
}

// --- 编辑 ---
function handleEdit(row: DeviceBag) {
  bagFormRef.value?.open(row);
}

// --- 生成 ---
function handleGenerate() {
  generateDialogRef.value?.open();
}

// --- 查看二维码 ---
async function handleViewQrcode(row: DeviceBag) {
  try {
    const res = await downOneDeviceBagQrcodeJsonApi(row.deviceBagId);
    if (res?.length > 0) {
      qrcodeDialogRef.value?.open(res[0]?.base64BagQrCode || '');
    } else {
      ElMessage.error('获取二维码失败');
    }
  } catch {
    ElMessage.error('获取二维码失败');
  }
}

// --- 下载单个二维码 ---
async function handleDownloadQrcode(row: DeviceBag) {
  try {
    const response = await downOneDeviceBagQrcodeFileApi(row.deviceBagId);
    const blob = response.data || response;
    let downloadName = `qrcode_${row.bagNo}.png`;
    const contentDisposition = response.headers?.['content-disposition'];
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^"';]+)['"]?/i);
      if (fileNameMatch?.[1]) {
        downloadName = decodeURIComponent(fileNameMatch[1]);
      }
    }
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    ElMessage.success('下载成功');
  } catch {
    ElMessage.error('下载失败');
  }
}

// --- 批量下载 ---
async function handleBatchDownloadQrcode() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要下载的包袋');
    return;
  }
  try {
    const res = await batchDownDeviceBagQrcodeFileApi(selectedIds.value);
    const blob = res.data;
    if (!(blob instanceof Blob)) {
      ElMessage.error('文件流获取失败');
      return;
    }
    let filename = `batch_qrcodes_${Date.now()}.zip`;
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

// --- 绑定 ---
function handleBind(row: DeviceBag) {
  if (row.bagStatus === 1) {
    ElMessage.warning('该包袋已绑定，请先解绑');
    return;
  }
  bindDialogRef.value?.open(row.deviceBagId);
}

// --- 解绑 ---
async function handleUnbind(row: DeviceBag) {
  if (row.bagStatus !== 1) {
    ElMessage.warning('该包袋未绑定');
    return;
  }
  try {
    await ElMessageBox.confirm(`确定要解绑包袋【${row.bagNo}】吗？`, '提示', { type: 'warning' });
    await bagUnBindDeviceHatchApi(row.deviceBagId);
    ElMessage.success('解绑成功');
    handleQuery();
  } catch {
    // 取消操作
  }
}

// --- 删除 ---
async function handleDelete(row?: DeviceBag) {
  let ids: number[] = [];
  if (row) {
    ids = [row.deviceBagId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${ids.length} 条包袋吗？`, '提示', { type: 'warning' });
    for (const id of ids) {
      await deleteDeviceBagApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条包袋`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: DeviceBag[]) {
  selectedIds.value = selection.map((item) => item.deviceBagId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.bagNo = undefined;
  queryParams.bagStatus = undefined;
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
v-model="queryParams.bagNo" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">包袋编号:</span>
            </template>
          </el-input>
        </el-form-item>
         <el-form-item>
          <el-select v-model="queryParams.bagStatus" clearable style="width: 200px">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">包袋状态:</span>
            </template>
            <el-option label="未绑定" :value="0" />
            <el-option label="已绑定" :value="1" />
            <el-option label="已破损" :value="2" />
          </el-select>
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

      <!-- 📥 高级筛选项 -->
      <!-- <template #search-advanced>
      </template> -->

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <el-button type="primary" icon="Plus" @click="handleAdd">新增包袋</el-button>
        <el-button type="success" plain icon="Picture" @click="handleGenerate">生成包袋</el-button>
        <ExportButton :module-code="ModuleCodeMap.BAG" :fields="visibleColumns" :find-cond="queryParams" />
        <el-button type="danger" plain icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete()">
          批量删除
        </el-button>
        <el-button
type="warning" plain icon="Download" :disabled="selectedIds.length === 0"
          @click="handleBatchDownloadQrcode"
>
          批量下载
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
:storage-key="BAG_STORAGE_KEY" :default-columns="defaultBagColumns"
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
            :show-overflow-tooltip="col.showOverflowTooltip || false"
>
            <template #default="{ row }">
              <template v-if="col.key === 'bagStatus'">
                <el-tag :type="getBagStatusType(row.bagStatus)" size="small" round effect="light">
                  {{ getBagStatusText(row.bagStatus) }}
                </el-tag>
              </template>
              <template v-else-if="col.key === 'status'">
                <el-tag :type="row.status === 0 ? 'success' : 'danger'" size="small" round effect="light">
                  {{ row.status === 0 ? '启用' : '禁用' }}
                </el-tag>
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right" align="center">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="handleViewQrcode(row)">
                  二维码
                </el-button>
                <el-button size="small" type="primary" @click="handleDownloadQrcode(row)">
                  下载
                </el-button>
                <el-button size="small" type="primary" @click="handleEdit(row)">
                  编辑
                </el-button>
                <el-button size="small" type="danger" @click="handleDelete(row)">
                  删除
                </el-button>
                <el-button v-if="row.bagStatus !== 1" size="small" type="success" @click="handleBind(row)">
                  绑定
                </el-button>
                <el-button v-else size="small" type="warning" @click="handleUnbind(row)">
                  解绑
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <!-- ===== 弹窗们 ===== -->
    <BagForm ref="bagFormRef" @success="handleQuery" />
    <GenerateDialog ref="generateDialogRef" @success="handleQuery" />
    <QrcodeDialog ref="qrcodeDialogRef" />
    <BindDialog ref="bindDialogRef" @success="handleQuery" />
  </Page>
</template>

<style scoped lang="scss">
.selected-alert-badge {
  display: inline-block;
}
</style>
