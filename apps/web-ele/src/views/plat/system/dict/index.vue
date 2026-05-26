<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import { Page } from "@vben/common-ui";

import { Delete, Edit, Plus, Refresh, Search } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import {
  addDictApi,
  deleteDictApi,
  type Dict,
  type DictPageParams,
  editDictApi,
  getDictDetailApi,
  getDictPageApi,
} from "#/api/system/dict/dict";
import {
  addDictDataApi,
  deleteDictDataApi,
  type DictData,
  type DictDataPageParams,
  editDictDataApi,
  getDictDataDetailApi,
  getDictDataPageApi,
} from "#/api/system/dict/dictData";

// ==================== 字典主表 ====================
const loading = ref(false);
const tableData = ref<Dict[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const currentDict = ref<Dict | null>(null);

// 主表表单弹窗
const dictFormVisible = ref(false);
const dictFormTitle = ref("");
const dictFormData = ref<Partial<Dict>>({});
const dictFormSubmitting = ref(false);

// 主表查询参数
const queryParams = reactive<DictPageParams>({
  pageNo: 1,
  pageSize: 10,
  dictName: undefined,
  dictCode: undefined,
  status: undefined,
});

// ==================== 字典明细表 ====================
const dataLoading = ref(false);
const dataTableData = ref<DictData[]>([]);
const dataTotal = ref(0);
const dataSelectedIds = ref<number[]>([]);

// 明细表表单弹窗
const dataFormVisible = ref(false);
const dataFormTitle = ref("");
const dataFormData = ref<Partial<DictData>>({});
const dataFormSubmitting = ref(false);

// 明细表查询参数
const dataQueryParams = reactive<DictDataPageParams>({
  pageNo: 1,
  pageSize: 10,
  itemLabel: undefined,
  status: undefined,
});

// ==================== 通用选项 ====================
const statusOptions = [
  { label: "启用", value: 0 },
  { label: "禁用", value: 1 },
];

const defaultFlagOptions = [
  { label: "否", value: 0 },
  { label: "是", value: 1 },
];

// 样式选项
const listClassOptions = [
  { label: "默认", value: "" },
  { label: "主要", value: "primary" },
  { label: "成功", value: "success" },
  { label: "信息", value: "info" },
  { label: "警告", value: "warning" },
  { label: "危险", value: "danger" },
];

// ==================== 辅助函数 ====================
function getStatusText(status: number): string {
  return status === 0 ? "启用" : "禁用";
}

function getDefaultFlagText(flag: number): string {
  return flag === 1 ? "是" : "否";
}

// ==================== 字典主表操作 ====================
async function loadData() {
  try {
    loading.value = true;
    const res = await getDictPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error("加载数据失败");
  } finally {
    loading.value = false;
  }
}

function handleDictAdd() {
  dictFormTitle.value = "新增字典";
  dictFormData.value = {
    status: 0,
  };
  dictFormVisible.value = true;
}

async function handleDictEdit(row: Dict) {
  try {
    dictFormTitle.value = "编辑字典";
    const res = await getDictDetailApi(row.dictId);
    dictFormData.value = res || {};
    dictFormVisible.value = true;
  } catch {
    ElMessage.error("获取字典信息失败");
  }
}

async function handleDictSubmit() {
  if (!dictFormData.value.dictName?.trim()) {
    ElMessage.warning("请输入字典名称");
    return;
  }
  if (!dictFormData.value.dictCode?.trim()) {
    ElMessage.warning("请输入字典编码");
    return;
  }

  dictFormSubmitting.value = true;
  try {
    const api = dictFormData.value.dictId ? editDictApi : addDictApi;
    await api(dictFormData.value);
    ElMessage.success(dictFormData.value.dictId ? "修改成功" : "新增成功");
    dictFormVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    dictFormSubmitting.value = false;
  }
}

async function handleDictDelete(row?: Dict) {
  let ids: number[] = [];

  if (row) {
    ids = [row.dictId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条字典吗？删除字典会同时删除其下的所有字典项。`,
      "提示",
      { type: "warning" }
    );

    for (const id of ids) {
      await deleteDictApi(id);
    }

    ElMessage.success(`成功删除 ${ids.length} 条字典`);
    selectedIds.value = [];
    // 如果当前选中的字典被删除，清空明细表
    if (currentDict.value && ids.includes(currentDict.value.dictId)) {
      currentDict.value = null;
      dataTableData.value = [];
      dataTotal.value = 0;
    }
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleDictSelectionChange(selection: Dict[]) {
  selectedIds.value = selection.map((item) => item.dictId);
}

function handleDictRowClick(row: Dict) {
  currentDict.value = row;
  dataQueryParams.dictId = row.dictId;
  dataQueryParams.pageNo = 1;
  loadDataData();
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.dictName = undefined;
  queryParams.dictCode = undefined;
  queryParams.status = undefined;
  queryParams.pageNo = 1;
  loadData();
}

// ==================== 字典明细表操作 ====================
async function loadDataData() {
  if (!dataQueryParams.dictId) {
    dataTableData.value = [];
    dataTotal.value = 0;
    return;
  }

  try {
    dataLoading.value = true;
    const res = await getDictDataPageApi(dataQueryParams);
    dataTableData.value = res.records || [];
    dataTotal.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error("加载字典项失败");
  } finally {
    dataLoading.value = false;
  }
}

function handleDataAdd() {
  if (!currentDict.value) {
    ElMessage.warning("请先选择一个字典");
    return;
  }
  dataFormTitle.value = "新增字典项";
  dataFormData.value = {
    dictId: currentDict.value.dictId,
    status: 0,
    defaultFlag: 0,
    sort: 0,
  };
  dataFormVisible.value = true;
}

async function handleDataEdit(row: DictData) {
  try {
    dataFormTitle.value = "编辑字典项";
    const res = await getDictDataDetailApi(row.dictDataId);
    dataFormData.value = res || {};
    dataFormVisible.value = true;
  } catch {
    ElMessage.error("获取字典项信息失败");
  }
}

async function handleDataSubmit() {
  if (!dataFormData.value.itemLabel?.trim()) {
    ElMessage.warning("请输入显示标签");
    return;
  }
  if (dataFormData.value.itemValue === undefined) {
    ElMessage.warning("请输入字典值");
    return;
  }

  dataFormSubmitting.value = true;
  try {
    const api = dataFormData.value.dictDataId
      ? editDictDataApi
      : addDictDataApi;
    await api(dataFormData.value);
    ElMessage.success(dataFormData.value.dictDataId ? "修改成功" : "新增成功");
    dataFormVisible.value = false;
    loadDataData();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    dataFormSubmitting.value = false;
  }
}

async function handleDataDelete(row?: DictData) {
  let ids: number[] = [];

  if (row) {
    ids = [row.dictDataId];
  } else {
    if (dataSelectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = dataSelectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条字典项吗？`,
      "提示",
      {
        type: "warning",
      }
    );

    for (const id of ids) {
      await deleteDictDataApi(id);
    }

    ElMessage.success(`成功删除 ${ids.length} 条字典项`);
    dataSelectedIds.value = [];
    loadDataData();
  } catch {
    // 取消删除
  }
}

function handleDataSelectionChange(selection: DictData[]) {
  dataSelectedIds.value = selection.map((item) => item.dictDataId);
}

function handleDataQuery() {
  dataQueryParams.pageNo = 1;
  loadDataData();
}

function resetDataQuery() {
  dataQueryParams.itemLabel = undefined;
  dataQueryParams.status = undefined;
  dataQueryParams.pageNo = 1;
  loadDataData();
}

// ==================== 生命周期 ====================
onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <el-row :gutter="16">
      <!-- 左侧：字典列表 -->
      <el-col :span="10">
        <el-card shadow="never" class="h-full">
          <template #header>
            <div class="flex justify-between items-center">
              <span>字典列表</span>
              <div>
                <el-button
                  type="primary"
                  size="small"
                  :icon="Plus"
                  @click="handleDictAdd"
                >
                  新增
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  plain
                  :icon="Delete"
                  :disabled="selectedIds.length === 0"
                  @click="handleDictDelete()"
                >
                  批量删除
                </el-button>
              </div>
            </div>
          </template>

          <!-- 查询表单 -->
          <el-form
            :inline="true"
            :model="queryParams"
            class="flex flex-wrap gap-x-2 gap-y-2 items-center mb-4"
          >
            <el-form-item class="!mb-0 !mr-2">
              <el-input
                v-model="queryParams.dictName"
                placeholder="请输入"
                clearable
                style="width: 200px"
                @keyup.enter="handleQuery"
              >
                <template #prefix>
                  <span class="text-xs text-gray-400 mr-0.5">字典名称:</span>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item class="!mb-0 !mr-2">
              <el-input
                v-model="queryParams.dictCode"
                placeholder="请输入"
                clearable
                style="width: 200px"
                @keyup.enter="handleQuery"
              >
                <template #prefix>
                  <span class="text-xs text-gray-400 mr-0.5">字典编码:</span>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item
              class="!mb-0 !mr-0 md:ml-auto flex items-center gap-1"
            >
              <el-tooltip content="查询" placement="top">
                <el-button
                  type="primary"
                  :icon="Search"
                  circle
                  @click="handleQuery"
                />
              </el-tooltip>
              <el-tooltip content="重置" placement="top">
                <el-button :icon="Refresh" circle @click="resetQuery" />
              </el-tooltip>
            </el-form-item>
          </el-form>

          <el-table
            v-loading="loading"
            :data="tableData"
            border
            size="small"
            height="calc(100vh - 340px)"
            highlight-current-row
            @selection-change="handleDictSelectionChange"
            @row-click="handleDictRowClick"
          >
            <el-table-column type="selection" width="40" align="center" />
            <el-table-column
              prop="dictName"
              label="字典名称"
              min-width="120"
              show-overflow-tooltip
            />
            <el-table-column
              prop="dictCode"
              label="字典编码"
              min-width="120"
              show-overflow-tooltip
            />
            <el-table-column
              prop="status"
              label="状态"
              width="80"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.status === 0 ? 'success' : 'danger'"
                  size="small"
                >
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="150"
              align="center"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  :icon="Edit"
                  @click.stop="handleDictEdit(row)"
                >
                  编辑
                </el-button>
                <el-button
                  link
                  type="danger"
                  :icon="Delete"
                  @click.stop="handleDictDelete(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 字典分页 -->
          <div class="flex justify-end mt-4">
            <el-pagination
              v-model:current-page="queryParams.pageNo"
              v-model:page-size="queryParams.pageSize"
              :total="total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              size="small"
              @size-change="loadData"
              @current-change="loadData"
            />
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：字典项列表 -->
      <el-col :span="14">
        <el-card shadow="never" class="h-full">
          <template #header>
            <div class="flex justify-between items-center">
              <div>
                <span>字典项列表</span>
                <span v-if="currentDict" class="text-gray-400 ml-2">
                  （{{ currentDict.dictName }}）
                </span>
              </div>
              <div>
                <el-button
                  type="primary"
                  size="small"
                  :icon="Plus"
                  :disabled="!currentDict"
                  @click="handleDataAdd"
                >
                  新增
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  plain
                  :icon="Delete"
                  :disabled="dataSelectedIds.length === 0"
                  @click="handleDataDelete()"
                >
                  批量删除
                </el-button>
              </div>
            </div>
          </template>

          <!-- 字典项查询表单 -->
          <el-form
            :inline="true"
            :model="dataQueryParams"
            class="flex flex-wrap gap-x-2 gap-y-2 items-center mb-4"
          >
            <el-form-item class="!mb-0 !mr-2">
              <el-input
                v-model="dataQueryParams.itemLabel"
                placeholder="请输入"
                clearable
                style="width: 200px"
                @keyup.enter="handleDataQuery"
              >
                <template #prefix>
                  <span class="text-xs text-gray-400 mr-0.5">标签:</span>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item class="!mb-0 !mr-2">
              <el-select
                v-model="dataQueryParams.status"
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

            <el-form-item
              class="!mb-0 !mr-0 md:ml-auto flex items-center gap-1"
            >
              <el-tooltip content="查询" placement="top">
                <el-button
                  type="primary"
                  :icon="Search"
                  circle
                  @click="handleDataQuery"
                />
              </el-tooltip>
              <el-tooltip content="重置" placement="top">
                <el-button :icon="Refresh" circle @click="resetDataQuery" />
              </el-tooltip>
            </el-form-item>
          </el-form>
          <el-table
            v-loading="dataLoading"
            :data="dataTableData"
            border
            size="small"
            height="calc(100vh - 340px)"
            @selection-change="handleDataSelectionChange"
          >
            <el-table-column type="selection" width="40" align="center" />
            <el-table-column
              prop="itemLabel"
              label="显示标签"
              min-width="120"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <el-tag :type="row.listClass" size="small" effect="light" round>
                  {{ row.itemLabel }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="itemValue"
              label="字典值"
              min-width="100"
              align="center"
            />
            <el-table-column
              prop="sort"
              label="排序"
              width="70"
              align="center"
            />
            <el-table-column
              prop="defaultFlag"
              label="默认"
              width="70"
              align="center"
            >
              <template #default="{ row }">
                {{ getDefaultFlagText(row.defaultFlag) }}
              </template>
            </el-table-column>
            <el-table-column
              prop="status"
              label="状态"
              width="70"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.status === 0 ? 'success' : 'danger'"
                  size="small"
                >
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="150"
              align="center"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  :icon="Edit"
                  @click="handleDataEdit(row)"
                >
                  编辑
                </el-button>
                <el-button
                  link
                  type="danger"
                  :icon="Delete"
                  @click="handleDataDelete(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 字典项分页 -->
          <div class="flex justify-end mt-4">
            <el-pagination
              v-model:current-page="dataQueryParams.pageNo"
              v-model:page-size="dataQueryParams.pageSize"
              :total="dataTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              size="small"
              @size-change="loadDataData"
              @current-change="loadDataData"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 字典主表新增/编辑弹窗 -->
    <el-dialog
      v-model="dictFormVisible"
      :title="dictFormTitle"
      width="500px"
      append-to-body
    >
      <el-form :model="dictFormData" label-width="80px">
        <el-form-item label="字典名称" required>
          <el-input
            v-model="dictFormData.dictName"
            placeholder="请输入字典名称"
          />
        </el-form-item>
        <el-form-item label="字典编码" required>
          <el-input
            v-model="dictFormData.dictCode"
            placeholder="请输入字典编码，如: sys_user_sex"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="dictFormData.status">
            <el-radio :value="0">启用</el-radio>
            <el-radio :value="1">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="dictFormData.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dictFormVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="dictFormSubmitting"
          @click="handleDictSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 字典明细表新增/编辑弹窗 -->
    <el-dialog
      v-model="dataFormVisible"
      :title="dataFormTitle"
      width="500px"
      append-to-body
    >
      <el-form :model="dataFormData" label-width="80px">
        <el-form-item label="显示标签" required>
          <el-input
            v-model="dataFormData.itemLabel"
            placeholder="请输入显示标签"
          />
        </el-form-item>
        <el-form-item label="字典值" required>
          <el-input-number
            v-model="dataFormData.itemValue"
            :min="0"
            placeholder="请输入字典值"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="dataFormData.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="样式">
          <el-select
            v-model="dataFormData.listClass"
            placeholder="请选择"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="item in listClassOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="默认">
          <el-radio-group v-model="dataFormData.defaultFlag">
            <el-radio
              v-for="item in defaultFlagOptions"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="dataFormData.status">
            <el-radio :value="0">启用</el-radio>
            <el-radio :value="1">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="dataFormData.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dataFormVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="dataFormSubmitting"
          @click="handleDataSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped>
.h-full {
  height: 100%;
}
</style>
