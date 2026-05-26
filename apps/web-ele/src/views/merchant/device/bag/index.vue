<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

import { Page } from "@vben/common-ui";

import {
  Download,
  Edit,
  Link,
  Picture,
  Plus,
  Refresh,
  Search,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import { type Device, getDeviceListApi } from "#/api/device/device";
import {
  addDeviceBagApi,
  bagBindDeviceHatchApi,
  bagUnBindDeviceHatchApi,
  batchDownDeviceBagQrcodeFileApi,
  deleteDeviceBagApi,
  type DeviceBag,
  type DeviceBagPageParams,
  downOneDeviceBagQrcodeFileApi,
  downOneDeviceBagQrcodeJsonApi,
  editDeviceBagApi,
  generateDeviceBagApi,
  getDeviceBagDetailApi,
  getDeviceBagPageApi,
} from "#/api/device/deviceBag";
import {
  type DeviceHatch,
  getDeviceHatchListApi,
} from "#/api/device/deviceHatch";
import ColumnSelector from "#/components/ColumnSelector/index.vue";
import ExportFieldSelector from "#/components/ExportFieldSelector/index.vue";
import {
  BAG_STORAGE_KEY,
  defaultBagColumns,
  type TableColumnConfig,
} from "#/constants/tableColumns";
import { ModuleCodeMap, useExport } from "#/hooks/useExport";
const { exporting, exportData } = useExport(ModuleCodeMap.BAG);

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultBagColumns]);

// 组件内部会处理 localStorage，页面只需要监听 update:columns
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
  await exportData(queryParams, selectedFields );
}

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<DeviceBag[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 表单弹窗控制
const formVisible = ref(false);
const formTitle = ref("");
const formData = ref<Partial<DeviceBag>>({});
const formSubmitting = ref(false);

// 生成包袋弹窗
const generateVisible = ref(false);
const generateNum = ref(10);
const generateSubmitting = ref(false);

// 绑定弹窗
const bindVisible = ref(false);
const bindData = ref<null | {
  deviceBagId: number;
  deviceId?: number;
  hatchId?: number;
}>(null);
const bindForm = reactive({
  deviceId: undefined as number | undefined,
  hatchId: undefined as number | undefined,
});
const deviceOptions = ref<Device[]>([]);
const hatchOptions = ref<DeviceHatch[]>([]);

// 二维码预览
const qrcodeVisible = ref(false);
const qrcodeUrl = ref("");

// 设备选项加载中
const deviceLoading = ref(false);
const hatchLoading = ref(false);

// 包袋状态选项
const bagStatusOptions = [
  { label: "全部", value: undefined },
  { label: "未绑定", value: 0 },
  { label: "已绑定", value: 1 },
  { label: "已破损", value: 2 },
];

// 状态选项
const statusOptions = [
  { label: "启用", value: 0 },
  { label: "禁用", value: 1 },
];

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
  const map: Record<number, string> = { 0: "未绑定", 1: "已绑定", 2: "已破损" };
  return map[status] || "未知";
}

function getBagStatusType(status: number): string {
  const map: Record<number, string> = { 0: "info", 1: "success", 2: "danger" };
  return map[status] || "info";
}

function getStatusText(status: number): string {
  return status === 0 ? "启用" : "禁用";
}

// --- 加载选项 ---
async function loadDeviceOptions() {
  deviceLoading.value = true;
  try {
    const res = await getDeviceListApi({ status: 0 });
    deviceOptions.value = res || [];
  } catch {
    console.error("加载设备列表失败");
  } finally {
    deviceLoading.value = false;
  }
}

async function loadHatchOptions(deviceId: number) {
  hatchLoading.value = true;
  try {
    const res = await getDeviceHatchListApi({ deviceId, status: 0 });
    hatchOptions.value = res || [];
  } catch {
    console.error("加载仓口列表失败");
  } finally {
    hatchLoading.value = false;
  }
}

// 监听设备变化，加载仓口
async function onDeviceChange(deviceId: number) {
  bindForm.hatchId = undefined;
  if (deviceId) {
    await loadHatchOptions(deviceId);
  } else {
    hatchOptions.value = [];
  }
}

// --- 下载单个二维码 ---
async function handleDownloadQrcode(row: DeviceBag) {
  try {
    const response = await downOneDeviceBagQrcodeFileApi(row.deviceBagId);

    // 1. 获取 blob 数据
    const blob = response.data || response;

    // 2. 尝试从响应头获取文件名
    let downloadName = `qrcode_${row.bagNo}.png`; // 默认兜底文件名

    // 从 content-disposition 获取文件名 (处理兼容性)
    const contentDisposition = response.headers?.["content-disposition"];
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(
        /filename\*?=['"]?(?:UTF-8'')?([^"';]+)['"]?/i
      );
      if (fileNameMatch && fileNameMatch[1]) {
        downloadName = decodeURIComponent(fileNameMatch[1]);
      }
    }

    // 3. 执行下载流程
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement("a");
    link.href = url;

    // 设置下载文件名
    link.setAttribute("download", downloadName);

    document.body.append(link);
    link.click();

    // 4. 清理
    link.remove();
    window.URL.revokeObjectURL(url);

    ElMessage.success("下载成功");
  } catch (error) {
    console.error("下载出错:", error);
    ElMessage.error("下载失败");
  }
}

// --- 批量下载二维码 ---
async function handleBatchDownloadQrcode() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning("请选择要下载的包袋");
    return;
  }

  try {
    // 1. 调用封装好的 API
    const res = await batchDownDeviceBagQrcodeFileApi(selectedIds.value);

    // 2. 获取 Blob 数据（拦截器已处理，res 为 response 对象）
    const blob = res.data;

    if (!(blob instanceof Blob)) {
      ElMessage.error("文件流获取失败");
      return;
    }

    // 3. 尝试动态获取文件名
    let filename = `batch_qrcodes_${Date.now()}.zip`; // 默认名
    const contentDisposition = res.headers?.["content-disposition"];
    if (contentDisposition) {
      // 匹配 filename*=UTF-8''... 或 filename=...
      const match = contentDisposition.match(
        /filename\*?=['"]?(?:UTF-8'')?([^"';]+)['"]?/i
      );
      if (match && match[1]) {
        filename = decodeURIComponent(match[1]);
      }
    }

    // 4. 执行下载
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    document.body.append(link);
    link.click();

    // 5. 清理
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("批量下载错误:", error);
    ElMessage.error("批量下载失败");
  }
}
// 下载二维码图片
function downloadQrcodeImage(base64: string, filename: string) {
  const link = document.createElement("a");
  link.href = base64;
  link.download = `${filename}.png`;
  link.click();
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
    ElMessage.error("加载数据失败");
  } finally {
    loading.value = false;
  }
}

// --- 生成包袋 ---
function handleGenerate() {
  generateNum.value = 10;
  generateVisible.value = true;
}

async function handleGenerateSubmit() {
  if (generateNum.value < 1 || generateNum.value > 100) {
    ElMessage.warning("生成数量应在 1-100 之间");
    return;
  }

  generateSubmitting.value = true;
  try {
    await generateDeviceBagApi({ deviceBagNum: generateNum.value });
    ElMessage.success(`成功生成 ${generateNum.value} 个包袋`);
    generateVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error("生成失败");
  } finally {
    generateSubmitting.value = false;
  }
}

// --- 查看二维码 ---
async function handleViewQrcode(row: DeviceBag) {
  try {
    const res = await downOneDeviceBagQrcodeJsonApi(row.deviceBagId);
    if (res?.length > 0) {
      qrcodeUrl.value = res[0]?.base64BagQrCode || "";
      qrcodeVisible.value = true;
    } else {
      ElMessage.error("获取二维码失败");
    }
  } catch {
    ElMessage.error("获取二维码失败");
  }
}

// 下载预览的二维码
function downloadPreviewQrcode() {
  if (qrcodeUrl.value) {
    downloadQrcodeImage(qrcodeUrl.value, "qrcode");
  } else {
    ElMessage.warning("无二维码可下载");
  }
}

// --- 绑定包袋 ---
async function handleBind(row: DeviceBag) {
  if (row.bagStatus === 1) {
    ElMessage.warning("该包袋已绑定，请先解绑");
    return;
  }
  bindData.value = { deviceBagId: row.deviceBagId };
  bindForm.deviceId = undefined;
  bindForm.hatchId = undefined;
  hatchOptions.value = [];
  await loadDeviceOptions();
  bindVisible.value = true;
}

async function handleBindSubmit() {
  if (!bindData.value) return;
  if (!bindForm.deviceId) {
    ElMessage.warning("请选择设备");
    return;
  }
  if (!bindForm.hatchId) {
    ElMessage.warning("请选择仓口");
    return;
  }

  try {
    await bagBindDeviceHatchApi(
      bindData.value.deviceBagId,
      bindForm.deviceId,
      bindForm.hatchId
    );
    ElMessage.success("绑定成功");
    bindVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error("绑定失败");
  }
}

// --- 解绑包袋 ---
async function handleUnbind(row: DeviceBag) {
  if (row.bagStatus !== 1) {
    ElMessage.warning("该包袋未绑定");
    return;
  }

  try {
    await ElMessageBox.confirm(`确定要解绑包袋【${row.bagNo}】吗？`, "提示", {
      type: "warning",
    });
    await bagUnBindDeviceHatchApi(row.deviceBagId);
    ElMessage.success("解绑成功");
    handleQuery();
  } catch {
    // 取消操作
  }
}

// --- 新增/编辑 ---
function handleAdd() {
  formTitle.value = "新增包袋";
  formData.value = {
    status: 0,
    bagStatus: 0,
  };
  formVisible.value = true;
}

async function handleEdit(row: DeviceBag) {
  try {
    formTitle.value = "编辑包袋";
    const res = await getDeviceBagDetailApi(row.deviceBagId);
    formData.value = res || {};
    formVisible.value = true;
  } catch {
    ElMessage.error("获取包袋信息失败");
  }
}

async function handleSubmit() {
  if (!formData.value.bagNo?.trim()) {
    ElMessage.warning("请输入包袋编号");
    return;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.deviceBagId ? editDeviceBagApi : addDeviceBagApi;
    await api(formData.value);
    ElMessage.success(formData.value.deviceBagId ? "修改成功" : "新增成功");
    formVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    formSubmitting.value = false;
  }
}

// --- 删除 ---
async function handleDelete(row?: DeviceBag) {
  let ids: number[] = [];

  if (row) {
    ids = [row.deviceBagId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条包袋吗？`,
      "提示",
      { type: "warning" }
    );

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
              v-model="queryParams.bagNo"
              placeholder="请输入"
              clearable
              style="width: 200px"
              @keyup.enter="handleQuery"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">包袋编号:</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select
              v-model="queryParams.bagStatus"
              clearable
              style="width: 200px"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">包袋状态:</span>
              </template>
              <el-option
                v-for="item in bagStatusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
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
            <el-button type="primary" :icon="Plus" @click="handleAdd">
              新增包袋
            </el-button>
            <el-button type="success" plain :icon="Picture" @click="handleGenerate">
              生成包袋
            </el-button>
            <el-button :loading="exporting" @click="openExportSelector">
              导出
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
              :storage-key="BAG_STORAGE_KEY"
              :default-columns="defaultBagColumns"
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
            :show-overflow-tooltip="col.showOverflowTooltip || false"
          >
            <template #default="{ row }">
              <!-- 绑定设备ID -->
              <template v-if="col.key === 'deviceId'">
                {{ row.deviceId || "-" }}
              </template>
              <!-- 绑定仓口 -->
              <template v-else-if="col.key === 'hatchNo'">
                {{ row.hatchNo ? `${row.hatchNo}` : "-" }}
              </template>
              <!-- 包袋状态 -->
              <template v-else-if="col.key === 'bagStatus'">
                <el-tag
                  :type="getBagStatusType(row.bagStatus)"
                  size="small"
                  round
                  effect="light"
                >
                  {{ getBagStatusText(row.bagStatus) }}
                </el-tag>
              </template>
              <!-- 绑定时间 -->
              <template v-else-if="col.key === 'bindTime'">
                {{ row.bindTime || "-" }}
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
              <!-- 普通字段 -->
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <!-- 操作列固定写死 -->
          <el-table-column label="操作" width="360" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" :icon="Picture" @click="handleViewQrcode(row)">
                二维码
              </el-button>
              <el-button link type="primary" :icon="Download" @click="handleDownloadQrcode(row)">
                下载
              </el-button>
              <el-button
                v-if="row.bagStatus !== 1"
                link
                type="success"
                :icon="Link"
                @click="handleBind(row)"
              >
                绑定
              </el-button>
              <el-button
                v-else
                link
                type="warning"
                @click="handleUnbind(row)"
                :icon="Link"
              >
                解绑
              </el-button>
              <el-button link type="primary" :icon="Edit" @click="handleEdit(row)">
                编辑
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

    <!-- 导出字段选择组件 -->
    <ExportFieldSelector
      v-model:visible="exportFieldVisible"
      :fields="exportFields"
      :loading="exporting"
      @confirm="handleExportConfirm"
    />

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="formVisible"
      :title="formTitle"
      width="500px"
      append-to-body
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="包袋编号" required>
          <el-input v-model="formData.bagNo" placeholder="请输入包袋编号" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="formData.status">
            <el-radio :value="0">启用</el-radio>
            <el-radio :value="1">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="formSubmitting"
          @click="handleSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 生成包袋弹窗 -->
    <el-dialog
      v-model="generateVisible"
      title="生成包袋"
      width="400px"
      append-to-body
    >
      <el-form label-width="100px">
        <el-form-item label="生成数量">
          <el-input-number
            v-model="generateNum"
            :min="1"
            :max="100"
            style="width: 100%"
          />
          <div class="text-gray-400 text-sm mt-1">最多可生成100个包袋</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="generateVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="generateSubmitting"
          @click="handleGenerateSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 二维码预览弹窗 -->
    <el-dialog
      v-model="qrcodeVisible"
      title="包袋二维码"
      width="400px"
      append-to-body
      center
    >
      <div class="flex justify-center">
        <img
          v-if="qrcodeUrl"
          :src="qrcodeUrl"
          alt="二维码"
          style="width: 200px; height: 240px"
        />
        <el-empty v-else description="暂无二维码" />
      </div>
      <template #footer>
        <el-button @click="qrcodeVisible = false">关闭</el-button>
        <el-button type="primary" @click="downloadPreviewQrcode">
          下载
        </el-button>
      </template>
    </el-dialog>

    <!-- 绑定弹窗 -->
    <el-dialog
      v-model="bindVisible"
      title="绑定设备仓口"
      width="450px"
      append-to-body
    >
      <el-form :model="bindForm" label-width="80px">
        <el-form-item label="选择设备" required>
          <el-select
            v-model="bindForm.deviceId"
            placeholder="请选择设备"
            style="width: 100%"
            :loading="deviceLoading"
            @change="onDeviceChange"
          >
            <el-option
              v-for="item in deviceOptions"
              :key="item.deviceId"
              :label="item.deviceName"
              :value="item.deviceId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="选择仓口" required>
          <el-select
            v-model="bindForm.hatchId"
            placeholder="请先选择设备"
            style="width: 100%"
            :loading="hatchLoading"
            :disabled="!bindForm.deviceId"
          >
            <el-option
              v-for="item in hatchOptions"
              :key="item.deviceHatchId"
              :label="`${item.hatchNo}号仓 - ${item.hatchName}`"
              :value="item.deviceHatchId"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bindVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBindSubmit">确定绑定</el-button>
      </template>
    </el-dialog>
  </Page>
</template>
