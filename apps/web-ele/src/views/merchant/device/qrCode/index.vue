<script lang="ts" setup>
import { computed, onMounted, reactive,ref } from "vue";

import { Page } from "@vben/common-ui";

import {
  Download,
  Loading,
  Picture,
  Plus,
  Refresh,
  Search,
  View,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

import {
  batchDownQrcodeFileApi,
  batchDownQrcodeJsonApi,
  type BatchQrcodeData,
  generateQrcodeApi,
  type GenerateQrcodeParams,
  getQrcodeDetailApi,
  getQrcodePageApi,
  type Qrcode,
  type QrcodePageParams,
} from "#/api/device/qrCode";
import ColumnSelector from "#/components/ColumnSelector/index.vue";
import ExportFieldSelector from "#/components/ExportFieldSelector/index.vue";
import {
  defaultQrcodeColumns,
  QRCODE_STORAGE_KEY,
  type TableColumnConfig,
} from "#/constants/tableColumns";
import { ModuleCodeMap, useExport } from "#/hooks/useExport";

const { exporting, exportData } = useExport(ModuleCodeMap.QRCODE);

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultQrcodeColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

// 可见的数据列
const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// 可导出的字段
const getExportableFields = computed(() => {
  return visibleColumns.value.map((col) => ({
    prop: col.key,
    label: col.label,
  }));
});

// 导出字段选择弹窗
const exportFieldVisible = ref(false);
const exportFields = ref<{ label: string; prop: string }[]>([]);

function openExportSelector() {
  exportFields.value = getExportableFields.value;
  exportFieldVisible.value = true;
}

async function handleExportConfirm(selectedFields: string[]) {
  await exportData(queryParams, selectedFields);
}

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Qrcode[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 生成二维码弹窗
const generateVisible = ref(false);
const generateForm = reactive<GenerateQrcodeParams>({
  qrcodeType: 0,
  qrcodeTotal: 10,
});
const generateSubmitting = ref(false);

// 详情弹窗
const detailVisible = ref(false);
const detailData = ref<null | Qrcode>(null);

// 二维码展示弹窗
const qrcodeVisible = ref(false);
const qrcodeTitle = ref("");
const qrcodeLoading = ref(false);
const qrcodeList = ref<BatchQrcodeData[]>([]);

// 选项
const qrcodeTypeOptions = [
  { label: "设备二维码", value: 0 },
  { label: "包袋二维码", value: 1 },
];

const statusOptions = [
  { label: "启用", value: 0 },
  { label: "禁用", value: 1 },
];

// 查询参数
const queryParams = reactive<QrcodePageParams>({
  pageNo: 1,
  pageSize: 10,
  qrcodeCode: undefined,
  qrcodeType: undefined,
  bindFlag: undefined,
  status: undefined,
});

// --- 辅助函数 ---
function getQrcodeTypeText(type: number): string {
  return type === 0 ? "设备二维码" : "包袋二维码";
}

function getStatusText(status: number): string {
  return status === 0 ? "启用" : "禁用";
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getQrcodePageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error("加载数据失败");
  } finally {
    loading.value = false;
  }
}

// --- 详情 ---
async function handleView(row: Qrcode) {
  try {
    const res = await getQrcodeDetailApi(row.qrcodeId);
    detailData.value = res;
    detailVisible.value = true;
  } catch {
    ElMessage.error("获取详情失败");
  }
}

// --- 生成二维码 ---
function handleGenerate() {
  generateForm.qrcodeType = 0;
  generateForm.qrcodeTotal = 10;
  generateVisible.value = true;
}

async function submitGenerate() {
  if (!generateForm.qrcodeTotal || generateForm.qrcodeTotal < 1) {
    ElMessage.warning("请输入生成数量");
    return;
  }

  generateSubmitting.value = true;
  try {
    await generateQrcodeApi(generateForm);
    ElMessage.success(`成功生成 ${generateForm.qrcodeTotal} 个二维码`);
    generateVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error("生成失败");
  } finally {
    generateSubmitting.value = false;
  }
}

// --- 单个二维码展示/下载 ---

/** 展示单个二维码 (JSON 模式) */
async function handleShowQrcode(row: Qrcode) {
  qrcodeTitle.value = `二维码展示 - ${row.qrcodeCode}`;
  qrcodeLoading.value = true;
  qrcodeVisible.value = true;
  qrcodeList.value = [];

  try {
    // 调用拆分后的 Json 接口，拦截器会自动解构返回 data 部分
    const res = await batchDownQrcodeJsonApi({
      qrcodeIds: [row.qrcodeId],
    });
    qrcodeList.value = res || [];
  } catch (error) {
    console.error("展示失败:", error);
    // 拦截器通常已经报错，这里可以做兜底
  } finally {
    qrcodeLoading.value = false;
  }
}

/** 下载单个二维码 (File/Blob 模式) */
async function handleDownloadQrcode(row: Qrcode) {
  try {
    // 调用拆分后的 File 接口，拦截器返回全量 response
    const res = await batchDownQrcodeFileApi({
      qrcodeIds: [row.qrcodeId],
    });

    const blob = res.data;
    if (!(blob instanceof Blob)) return;

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // 如果是单个下载
    link.download = `QR_${row.qrcodeCode}.zip`;

    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    ElMessage.success("下载成功");
  } catch (error) {
    console.error("下载失败:", error);
  }
}

// --- 批量展示/下载 ---

/** 批量展示二维码 (JSON 模式) */
async function handleBatchShowQrcode() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning("请选择要展示的二维码");
    return;
  }

  qrcodeTitle.value = `批量展示二维码 (共 ${selectedIds.value.length} 个)`;
  qrcodeLoading.value = true;
  qrcodeVisible.value = true;
  qrcodeList.value = [];

  try {
    const res = await batchDownQrcodeJsonApi({
      qrcodeIds: selectedIds.value,
    });
    qrcodeList.value = res || [];
  } catch (error) {
    console.error("批量展示获取失败:", error);
  } finally {
    qrcodeLoading.value = false;
  }
}

/** 批量下载二维码 (File/Blob 模式 - 通常返回 ZIP) */
async function handleBatchDownloadQrcode() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning("请选择要下载的二维码");
    return;
  }

  try {
    const res = await batchDownQrcodeFileApi({
      qrcodeIds: selectedIds.value,
    });

    const blob = res.data;
    if (!(blob instanceof Blob)) return;

    // 尝试从 header 获取文件名，否则默认为 zip
    let filename = `qrcodes_${Date.now()}.zip`;
    const contentDisposition = res.headers?.["content-disposition"];
    if (contentDisposition) {
      const match = contentDisposition.match(
        /filename\*?=['"]?(?:UTF-8'')?([^"';]+)['"]?/i
      );
      if (match?.[1]) filename = decodeURIComponent(match[1]);
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    ElMessage.success("批量下载已开始");
  } catch (error) {
    console.error("批量下载失败:", error);
  }
}

// 查看二维码图片
function showQrcodeImage(row: Qrcode) {
  if (row.qrcodeUrl) {
    window.open(row.qrcodeUrl, "_blank");
  } else {
    ElMessage.warning("无二维码图片");
  }
}

// 表格选中变化
function handleSelectionChange(selection: Qrcode[]) {
  selectedIds.value = selection.map((item) => item.qrcodeId);
}

// 搜索与重置
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
     <div class="p-0">
      <!-- 查询表单 -->
      <el-card shadow="never" class="border-none mb-4 !p-2">
        <el-form
          :inline="true"
          :model="queryParams"
          class="flex flex-wrap gap-x-2 gap-y-2 items-center"
        >
          <el-form-item class="!mb-0 !mr-2">
            <el-input
              v-model="queryParams.qrcodeCode"
              placeholder="请输入"
              clearable
              style="width: 200px"
              @keyup.enter="handleQuery"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">二维码编号:</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select
              v-model="queryParams.qrcodeType"
              clearable
              style="width: 200px"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">二维码类型:</span>
              </template>
              <el-option
                v-for="item in qrcodeTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select
              v-model="queryParams.bindFlag"
              clearable
              style="width: 200px"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">绑定状态:</span>
              </template>
              <el-option label="未绑定" :value="0" />
              <el-option label="已绑定" :value="1" />
            </el-select>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select
              v-model="queryParams.status"
              clearable
              style="width: 200px"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">状态:</span>
              </template>
              <el-option
                v-for="item in statusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
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
            <el-button type="primary" plain :icon="Plus" @click="handleGenerate">
              生成二维码
            </el-button>
            <el-button :loading="exporting" @click="openExportSelector">
    导出
  </el-button>
            <el-button
              type="success"
              plain
              :icon="Picture"
              :disabled="selectedIds.length === 0"
              @click="handleBatchShowQrcode"
            >
              批量展示
            </el-button>
            <el-button
              type="warning"
              plain
              :icon="Download"
              :disabled="selectedIds.length === 0"
              @click="handleBatchDownloadQrcode"
            >
              批量下载
            </el-button>
            <span v-if="selectedIds.length > 0" class="text-xs text-gray-400 ml-2">
              已选 <span class="text-red-500 font-medium">{{ selectedIds.length }}</span> 项
            </span>
          </div>

          <div class="flex items-center">
            <ColumnSelector
              :storage-key="QRCODE_STORAGE_KEY"
              :default-columns="defaultQrcodeColumns"
              @update:columns="handleColumnsUpdate"
            />
          </div>
        </div>

        <el-table
          v-loading="loading"
          :data="tableData"
          border
          stripe
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <!-- 选择列固定写死 -->
          <el-table-column type="selection" width="50" align="center" />

          <!-- 动态数据列 -->
          <el-table-column
            v-for="col in visibleColumns"
            :key="col.key"
            :prop="col.key"
            :label="col.label"
            :width="typeof col.width === 'number' ? col.width : undefined"
            :min-width="col.minWidth"
            :align="col.align"
          >
            <template #default="{ row }">
              <!-- 二维码类型 -->
              <template v-if="col.key === 'qrcodeType'">
                <el-tag
                  :type="row.qrcodeType === 0 ? 'primary' : 'success'"
                  size="small"
                  round
                  effect="light"
                >
                  {{ getQrcodeTypeText(row.qrcodeType) }}
                </el-tag>
              </template>
              <!-- 绑定状态 -->
              <template v-else-if="col.key === 'bindFlag'">
                <el-tag
                  :type="row.bindFlag === 1 ? 'success' : 'info'"
                  size="small"
                  round
                  effect="light"
                >
                  {{ row.bindFlag === 1 ? "已绑定" : "未绑定" }}
                </el-tag>
              </template>
              <!-- 状态 -->
              <template v-else-if="col.key === 'status'">
                <el-tag
                  :type="row.status === 0 ? 'success' : 'danger'"
                  size="small"
                  round
                  effect="light"
                >
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
              <!-- 二维码图片 -->
              <template v-else-if="col.key === 'qrcodeUrl'">
                <el-button
                  v-if="row.qrcodeUrl"
                  link
                  type="primary"
                  size="small"
                  @click="showQrcodeImage(row)"
                >
                  查看图片
                </el-button>
                <span v-else class="text-gray-400">-</span>
              </template>
              <!-- 绑定业务ID -->
              <template v-else-if="col.key === 'bizId'">
                {{ row.bizId || "-" }}
              </template>
              <!-- 普通字段 -->
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <!-- 操作列固定写死 -->
          <el-table-column label="操作" width="220" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" :icon="View" @click="handleView(row)">
                详情
              </el-button>
              <el-button link type="primary" :icon="Picture" @click="handleShowQrcode(row)">
                展示
              </el-button>
              <el-button link type="warning" :icon="Download" @click="handleDownloadQrcode(row)">
                下载
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="flex justify-end mt-4">
          <el-pagination
            v-model:current-page="queryParams.pageNo"
            v-model:page-size="queryParams.pageSize"
            :total="total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="loadData"
            @current-change="loadData"
          />
        </div>
      </el-card>
    </div>

    <ExportFieldSelector
  v-model:visible="exportFieldVisible"
  :fields="exportFields"
  :loading="exporting"
  @confirm="handleExportConfirm"
/>

    <!-- 生成二维码弹窗 -->
    <el-dialog
      v-model="generateVisible"
      title="生成二维码"
      width="500px"
      append-to-body
    >
      <el-form :model="generateForm" label-width="100px">
        <el-form-item label="二维码类型" required>
          <el-select
            v-model="generateForm.qrcodeType"
            placeholder="请选择"
            style="width: 100%"
          >
            <el-option
              v-for="item in qrcodeTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="生成数量" required>
          <el-input-number
            v-model="generateForm.qrcodeTotal"
            :min="1"
            :max="1000"
            style="width: 100%"
          />
          <div class="text-gray-400 text-xs mt-1">最多一次生成1000个二维码</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="generateVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="generateSubmitting"
          @click="submitGenerate"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="二维码详情"
      width="800px"
      append-to-body
    >
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="二维码ID">
          {{ detailData.qrcodeId }}
        </el-descriptions-item>
        <el-descriptions-item label="二维码编号">
          {{ detailData.qrcodeCode }}
        </el-descriptions-item>
        <el-descriptions-item label="二维码类型">
          {{ getQrcodeTypeText(detailData.qrcodeType) }}
        </el-descriptions-item>
        <el-descriptions-item label="绑定状态">
          <el-tag
            :type="detailData.bindFlag === 1 ? 'success' : 'info'"
            size="small"
          >
            {{ detailData.bindFlag === 1 ? "已绑定" : "未绑定" }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="绑定业务ID">
          {{ detailData.bizId || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag
            :type="detailData.status === 0 ? 'success' : 'danger'"
            size="small"
          >
            {{ getStatusText(detailData.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="二维码地址" :span="2">
          <el-link :href="detailData.qrcodeUrl" target="_blank" type="primary">
            {{ detailData.qrcodeUrl || "-" }}
          </el-link>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 二维码展示弹窗 -->
    <el-dialog
      v-model="qrcodeVisible"
      :title="qrcodeTitle"
      width="900px"
      append-to-body
      class="rounded-xl"
    >
      <div v-loading="qrcodeLoading" class="min-height-[400px]">
        <el-scrollbar max-height="550px" always>
          <div v-if="qrcodeList.length === 0 && !qrcodeLoading" class="py-12">
            <el-empty description="暂无二维码数据" />
          </div>

          <!-- 优化后的网格列表 -->
          <div
            v-else
            class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2"
          >
            <div
              v-for="(item, index) in qrcodeList"
              :key="item.qrcodeId"
              class="group relative bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-gray-100 dark:border-zinc-700 transition-all hover:shadow-md hover:border-primary/30"
            >
              <!-- 编号标签 -->
              <div class="mb-2">
                <div
                  class="text-[11px] text-gray-400 uppercase tracking-wider mb-1"
                >
                  QR Code No.
                </div>
                <div
                  class="text-xs font-mono font-bold text-gray-700 dark:text-gray-200 truncate"
                  :title="item.qrcodeCode"
                >
                  {{ item.qrcodeCode }}
                </div>
              </div>

              <!-- 二维码图片展示区 -->
              <div
                class="relative aspect-square bg-white rounded-md overflow-hidden border border-gray-200 shadow-inner group-hover:border-primary/20"
              >
                <el-image
                  :src="item.base64QrCode || item.qrcodeUrl"
                  fit="contain"
                  class="w-full h-full p-2"
                  :preview-src-list="
                    qrcodeList.map((i) => i.base64QrCode || i.qrcodeUrl)
                  "
                  :initial-index="index"
                  preview-teleported
                >
                  <template #placeholder>
                    <div
                      class="flex items-center justify-center h-full bg-gray-50 text-gray-400"
                    >
                      <el-icon class="is-loading"><Loading /></el-icon>
                    </div>
                  </template>
                </el-image>

                <!-- 悬停提示遮罩 -->
                <div
                  class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                >
                  <el-icon color="white" :size="24"><View /></el-icon>
                </div>
              </div>

              <!-- 底部下载按钮 -->
              <div class="mt-3">
                <el-button
                  type="primary"
                  plain
                  size="small"
                  class="w-full !rounded-md"
                  :icon="Download"
                  @click="handleDownloadQrcode(item)"
                >
                  下载单图
                </el-button>
              </div>
            </div>
          </div>
        </el-scrollbar>
      </div>

      <template #footer>
        <div class="flex justify-between items-center px-2">
          <span class="text-xs text-gray-400">提示：点击图片可查看高清大图并轮播</span>
          <el-button @click="qrcodeVisible = false" class="!rounded-md">
            关闭
          </el-button>
        </div>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped lang="scss">
:deep(.el-dialog) {
  overflow: hidden;
  border-radius: 12px;

  .el-dialog__header {
    padding-bottom: 15px;
    margin-right: 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .el-dialog__body {
    padding: 20px;
    background-color: var(--el-bg-color-page);
  }
}

/* 让图片在缩放时保持清晰 */
.el-image img {
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}
</style>
