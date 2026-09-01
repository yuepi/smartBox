<script lang="ts" setup>
import type { Device } from '#/api/device/device';
import type { CleanTask, CleanTaskPageParams } from '#/api/operation/cleanTask';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { getDeviceListApi } from '#/api/device/device';
import {
  deleteCleanTaskApi,
  getCleanTaskPageApi,
} from '#/api/operation/cleanTask';
import { getMerchantDeptListApi } from '#/api/system/dept';
import {
  CLEAN_TASK_STORAGE_KEY,
  defaultCleanTaskColumns,
} from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

import TaskDetail from './TaskDetail.vue';
import TaskForm from './TaskForm.vue';

const router = useRouter();

const { task_status } = useDicts(['task_status']);
const deviceOptions = ref<Device[]>([]);

// 级联选择器绑定值
const cascaderValue = ref<Array<number | string>>([]);

// 组合 [小区 -> 设备] 树形结构选项
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

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultCleanTaskColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const taskFormRef = ref();
const taskDetailRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<CleanTask[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

// 下拉选项
const deptOptions = ref<any[]>([]);

// 查询参数
const queryParams = reactive<CleanTaskPageParams>({
  pageNo: 1,
  pageSize: 10,
  taskNo: undefined,
  deptId: undefined,
  deviceId: undefined,
  taskStatus: undefined,
  bagQrCode: undefined,
});

// --- 级联选择切换回调 ---
function handleCascaderChange(val: any) {
  if (!val || val.length === 0) {
    queryParams.deptId = undefined;
    queryParams.deviceId = undefined;
  } else {
    const lastSelected = val[val.length - 1];

    if (typeof lastSelected === 'string' && lastSelected.startsWith('dev_')) {
      const devId = Number(lastSelected.replace('dev_', ''));
      const parentDeptId = Number(val[0].replace('dept_', ''));
      queryParams.deptId = parentDeptId;
      queryParams.deviceId = devId;
    } else if (
      typeof lastSelected === 'string' &&
      lastSelected.startsWith('dept_')
    ) {
      const deptId = Number(lastSelected.replace('dept_', ''));
      queryParams.deptId = deptId;
      queryParams.deviceId = undefined;
    }
  }
  handleQuery();
}

function handleViewOrders(row: CleanTask) {
  router.push({
    path: '/recycleOrder', // 回收订单的路由地址
    query: {
      cleanTaskId: row.cleanTaskId,
      taskNo: row.taskNo, // 可选：用于页面顶部提示或展示
    },
  });
}

// --- 加载选项 ---
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

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getCleanTaskPageApi(queryParams);
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
  taskFormRef.value?.open();
}

// --- 编辑 ---
function handleEdit(row: CleanTask) {
  taskFormRef.value?.open(row);
}

// --- 详情 ---
function handleView(row: CleanTask) {
  taskDetailRef.value?.open(row);
}

// --- 删除 ---
async function handleDelete(row?: CleanTask) {
  // eslint-disable-next-line no-useless-assignment
  let ids: number[] = [];
  if (row) {
    ids = [row.cleanTaskId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条任务吗？`,
      '提示',
      { type: 'warning' },
    );
    for (const id of ids) {
      await deleteCleanTaskApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条任务`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: CleanTask[]) {
  selectedIds.value = selection.map((item) => item.cleanTaskId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.taskNo = undefined;
  queryParams.deptId = undefined;
  queryParams.deviceId = undefined;
  queryParams.taskStatus = undefined;
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
      <!-- 📥 基础筛选项 -->
      <template #search-basic>
        <!-- <el-form-item>
          <el-input
v-model="queryParams.taskNo" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">任务单号:</span>
            </template>
</el-input>
</el-form-item> -->
        <el-form-item>
          <el-input
            v-model="queryParams.bagQrCode"
            clearable
            style="width: 220px"
            placeholder="请输入后四位"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">包袋二维码:</span>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
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
        </el-form-item>

        <el-form-item>
          <el-select
            v-model="queryParams.taskStatus"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">任务状态:</span>
            </template>
            <el-option
              v-for="item in task_status"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <!-- <template #search-advanced>
      </template> -->

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <el-button type="primary" plain icon="Plus" @click="handleAdd">
          新增任务
        </el-button>
        <ExportButton
          :module-code="ModuleCodeMap.CLEAN_TASK"
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
          :storage-key="CLEAN_TASK_STORAGE_KEY"
          :default-columns="defaultCleanTaskColumns"
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
            :width="typeof col.width === 'number' ? col.width : undefined"
            :min-width="col.minWidth"
            :align="col.align"
            :show-overflow-tooltip="col.showOverflowTooltip || false"
          >
            <template #default="{ row }">
              <template v-if="col.key === 'taskStatus'">
                <DictTag :options="task_status" :value="row.taskStatus" />
              </template>
              <template v-else-if="col.key === 'fullWeight'">
                {{ row.fullWeight?.toFixed(2) || 0 }} kg
              </template>
              <template v-else-if="col.key === 'images'">
                <div class="flex items-center gap-1 justify-center">
                  <template v-if="row.images && row.images.length > 0">
                    <el-image
                      v-for="(url, idx) in row.images.slice(0, 5)"
                      :key="idx"
                      :src="url.url"
                      :preview-src-list="row.images.map((item) => item.url)"
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
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column
            label="操作"
            width="200"
            fixed="right"
            align="center"
          >
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="handleView(row)">
                  详情
                </el-button>
                <el-button size="small" type="primary" @click="handleEdit(row)">
                  编辑
                </el-button>
                <el-button
                  size="small"
                  type="primary"
                  @click="handleViewOrders(row)"
                >
                  查看订单
                </el-button>
                <!-- <el-button size="small" type="danger" @click="handleDelete(row)">
                  删除
                </el-button> -->
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <!-- ===== 弹窗们 ===== -->
    <TaskForm ref="taskFormRef" @success="loadData" />
    <TaskDetail ref="taskDetailRef" />
  </Page>
</template>

<style scoped>
.selected-alert-badge {
  display: inline-block;
}
</style>
