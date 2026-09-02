<script lang="ts" setup>
import type { Device } from '#/api/device/device';
import type {
  SortViolation,
  ViolationPageParams,
} from '#/api/operation/violation';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElMessage, ElMessageBox } from 'element-plus';

import { getDeviceListApi } from '#/api/device/device';
import {
  delSortViolationApi,
  getSortViolationPageApi,
} from '#/api/operation/violation';
import { getMerchantDeptListApi } from '#/api/system/dept';
import {
  defaultViolationColumns,
  VIOLATION_STORAGE_KEY,
} from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

import ViolationDetail from './ViolationDetail.vue';
import ViolationForm from './ViolationForm.vue';

// 字典与选项
// const { violation_type, violation_status } = useDicts([
//   'violation_type',
//   'violation_status',
// ]);
const deviceOptions = ref<Device[]>([]);
const deptOptions = ref<any[]>([]);

// 级联选择器绑定
const cascaderValue = ref<Array<number | string>>([]);

const cascaderOptions = computed(() => {
  return deptOptions.value.map((dept) => {
    const childrenDevices = deviceOptions.value
      .filter((dev) => dev.deptId === dept.deptId)
      .map((dev) => ({
        label: dev.deviceName || dev.deviceNo || `设备(${dev.deviceId})`,
        value: `dev_${dev.deviceId}`,
        isDevice: true,
        deviceId: dev.deviceId,
      }));

    return {
      label: dept.deptName,
      value: `dept_${dept.deptId}`,
      isDevice: false,
      deptId: dept.deptId,
      children: childrenDevices.length > 0 ? childrenDevices : undefined,
    };
  });
});

// --- 表格动态列 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultViolationColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用与状态 ---
const violationFormRef = ref();
const violationDetailRef = ref();

const loading = ref(false);
const tableData = ref<SortViolation[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

// 查询参数
const queryParams = reactive<ViolationPageParams>({
  pageNo: 1,
  pageSize: 10,
  deptId: undefined,
  deviceId: undefined,
  violationType: undefined,
  status: undefined,
  bagQrCode: undefined,
});

// --- 级联联动 ---
function handleCascaderChange(val: any) {
  if (!val || val.length === 0) {
    queryParams.deptId = undefined;
    queryParams.deviceId = undefined;
  } else {
    const lastSelected = val[val.length - 1];
    if (typeof lastSelected === 'string' && lastSelected.startsWith('dev_')) {
      queryParams.deptId = Number(val[0].replace('dept_', ''));
      queryParams.deviceId = Number(lastSelected.replace('dev_', ''));
    } else if (
      typeof lastSelected === 'string' &&
      lastSelected.startsWith('dept_')
    ) {
      queryParams.deptId = Number(lastSelected.replace('dept_', ''));
      queryParams.deviceId = undefined;
    }
  }
  handleQuery();
}

// --- 数据交互 ---
async function loadOptions() {
  try {
    const [deptRes, deviceRes] = await Promise.all([
      getMerchantDeptListApi({ status: 0 }),
      getDeviceListApi({ status: 0 }),
    ]);
    deptOptions.value = deptRes || [];
    deviceOptions.value = deviceRes || [];
  } catch (error) {
    console.error(error);
  }
}

async function loadData() {
  try {
    loading.value = true;
    const res = await getSortViolationPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error('加载违规记录数据失败');
  } finally {
    loading.value = false;
  }
}

// --- 操作句柄 ---
function handleAdd() {
  violationFormRef.value?.open();
}

function handleEdit(row: ViolationRecord) {
  violationFormRef.value?.open(row);
}

function handleView(row: ViolationRecord) {
  violationDetailRef.value?.open(row);
}

async function handleDelete(row?: ViolationRecord) {
  let ids: number[] = [];
  if (row) {
    ids = [row.id];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条违规记录吗？`,
      '提示',
      { type: 'warning' },
    );
    for (const id of ids) {
      await delSortViolationApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条记录`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消
  }
}

function handleSelectionChange(selection: ViolationRecord[]) {
  selectedIds.value = selection.map((item) => item.id);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  cascaderValue.value = [];
  queryParams.deptId = undefined;
  queryParams.deviceId = undefined;
  queryParams.violationType = undefined;
  queryParams.status = undefined;
  queryParams.bagQrCode = undefined;
  queryParams.pageNo = 1;
  loadData();
}

onMounted(() => {
  loadOptions();
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
      <!-- 📥 基础筛选 -->
      <template #search-basic>
        <!-- <el-form-item>
          <el-input
            v-model="queryParams.bagQrCode"
            clearable
            style="width: 220px"
            placeholder="请输入包袋二维码"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">包袋二维码:</span>
            </template>
          </el-input>
        </el-form-item> -->

        <!-- <el-form-item>
          <el-cascader
            v-model="cascaderValue"
            :options="cascaderOptions"
            :props="{
              checkStrictly: true,
              expandTrigger: 'hover',
              emitPath: true,
            }"
            placeholder="请选择或搜索"
            filterable
            clearable
            style="width: 250px"
            @change="handleCascaderChange"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">小区/设备:</span>
            </template>
          </el-cascader>
        </el-form-item> -->

        <!-- <el-form-item>
          <el-select
            v-model="queryParams.violationType"
            clearable
            style="width: 200px"
            placeholder="请选择"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">违规类型:</span>
            </template>
            <el-option
              v-for="item in violation_type"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item> -->

        <!-- <el-form-item>
          <el-select
            v-model="queryParams.status"
            clearable
            style="width: 180px"
            placeholder="请选择"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">处理状态:</span>
            </template>
            <el-option
              v-for="item in violation_status"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item> -->
      </template>

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <el-button type="primary" plain icon="Plus" @click="handleAdd">
          登记违规
        </el-button>
        <ExportButton
          :module-code="ModuleCodeMap.VIOLATION_RECORD"
          :fields="visibleColumns"
          :find-cond="queryParams"
        />
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="selectedIds.length === 0"
          @click="handleDelete()"
        >
          批量删除
        </el-button>
        <transition name="el-fade-in">
          <span
            v-if="selectedIds.length > 0"
            class="selected-alert-badge ml-2 text-sm text-gray-400"
          >
            已选
            <span class="text-red-500 font-medium">{{
              selectedIds.length
            }}</span>
            项
          </span>
        </transition>
      </template>

      <!-- 📥 工具栏右侧 -->
      <template #toolbar-right>
        <ColumnSelector
          :storage-key="VIOLATION_STORAGE_KEY"
          :default-columns="defaultViolationColumns"
          @update:columns="handleColumnsUpdate"
        />
      </template>

      <!-- 📥 数据表格 -->
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
            :width="typeof col.width === 'number' ? col.width : undefined"
            :min-width="col.minWidth"
            :align="col.align"
            :show-overflow-tooltip="col.showOverflowTooltip || false"
          >
            <template #default="{ row }">
              <!-- 违规类型 -->
              <template v-if="col.key === 'violationType'">
                <DictTag :options="violation_type" :value="row.violationType" />
              </template>

              <!-- 处理状态 -->
              <template v-else-if="col.key === 'status'">
                <DictTag :options="violation_status" :value="row.status" />
              </template>

              <!-- 图片列表展示 -->
              <template v-else-if="col.key === 'images'">
                <div class="flex items-center gap-1 justify-center">
                  <template v-if="row.images && row.images.length > 0">
                    <el-image
                      v-for="(url, idx) in row.images.slice(0, 5)"
                      :key="idx"
                      :src="url"
                      :preview-src-list="row.images"
                      :initial-index="Number(idx)"
                      show-progress
                      fit="cover"
                      style="
                        width: 40px;
                        height: 40px;
                        cursor: pointer;
                        border: 1px solid #dcdfe6;
                        border-radius: 4px;
                      "
                      preview-teleported
                    />
                    <el-tag
                      v-if="row.images.length > 5"
                      size="small"
                      type="info"
                    >
                      +{{ row.images.length - 5 }}
                    </el-tag>
                  </template>
                  <span v-else class="text-gray-400">-</span>
                </div>
              </template>

              <!-- 默认属性 -->
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <!-- 操作栏 -->
          <el-table-column
            label="操作"
            width="220"
            fixed="right"
            align="center"
          >
            <template #default="{ row }">
              <div class="action-buttons flex justify-center gap-1">
                <el-button
                  size="small"
                  type="primary"
                  link
                  @click="handleView(row)"
                >
                  详情
                </el-button>
                <el-button
                  size="small"
                  type="primary"
                  link
                  @click="handleEdit(row)"
                >
                  编辑
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  link
                  @click="handleDelete(row)"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <!-- ===== 拆分弹窗 ===== -->
    <ViolationForm ref="violationFormRef" @success="loadData" />
    <ViolationDetail ref="violationDetailRef" />
  </Page>
</template>

<style scoped>
.selected-alert-badge {
  display: inline-block;
}
</style>
