<!-- src/views/merchant/device/hatch/LogDialog.vue -->
<script lang="ts" setup>
import { computed, reactive, ref,watch } from "vue";

import { Refresh, Search } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

import { getDeviceHatchWeightLogListApi } from "#/api/device/deviceHatch";
import { getRecentDays, getThisMonth } from "#/utils/date";

// Props
const props = defineProps<{
  deviceHatchId: number;
  deviceHatchName?: string;
  visible: boolean;
}>();

// Emits
const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

// 操作类型枚举
const operateTypeOptions = [
  { label: "全部", value: undefined },
  { label: "去皮", value: 0 },
  { label: "校准", value: 1 },
  { label: "人工修改", value: 2 },
  { label: "自动同步", value: 3 },
];

const dateShortcuts = [
  {
    text: "今天",
    value: () => {
      const { startTime, endTime } = getRecentDays(0);
      return [new Date(startTime), new Date(endTime)];
    },
  },
  {
    text: "最近7天",
    value: () => {
      const { startTime, endTime } = getRecentDays(7);
      return [new Date(startTime), new Date(endTime)];
    },
  },
  {
    text: "最近30天",
    value: () => {
      const { startTime, endTime } = getRecentDays(30);
      return [new Date(startTime), new Date(endTime)];
    },
  },
  {
    text: "本月",
    value: () => {
      const { startTime, endTime } = getThisMonth();
      return [new Date(startTime), new Date(endTime)];
    },
  },
];

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit("update:visible", val),
});

// 状态变量
const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const dateRange = ref<[string, string] | null>(null);
const detailVisible = ref(false);
const currentLog = ref<any>({});

// 查询参数
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  deviceHatchId: props.deviceHatchId,
  operateType: undefined as number | undefined,
  tareTimeStart: undefined as string | undefined,
  tareTimeEnd: undefined as string | undefined,
});

// 获取操作类型文本
function getOperateTypeText(type: number): string {
  const map: Record<number, string> = {
    0: "去皮",
    1: "校准",
    2: "人工修改",
    3: "自动同步",
  };
  return map[type] || "-";
}

// 获取操作类型标签样式
function getOperateTypeTag(type: number): string {
  const map: Record<number, string> = {
    0: "warning",
    1: "primary",
    2: "info",
    3: "success",
  };
  return map[type] || "info";
}

// 加载数据
async function loadData() {
  try {
    loading.value = true;

    // 处理时间范围参数
    if (dateRange.value) {
      queryParams.tareTimeStart = dateRange.value[0];
      queryParams.tareTimeEnd = dateRange.value[1];
    } else {
      queryParams.tareTimeStart = undefined;
      queryParams.tareTimeEnd = undefined;
    }

    const res = await getDeviceHatchWeightLogListApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error("加载日志失败");
  } finally {
    loading.value = false;
  }
}

// 查询
function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

// 重置
function resetQuery() {
  queryParams.operateType = undefined;
  dateRange.value = null;
  queryParams.tareTimeStart = undefined;
  queryParams.tareTimeEnd = undefined;
  handleQuery();
}

// 查看详情
function showDetail(row: any) {
  currentLog.value = row;
  detailVisible.value = true;
}

// 关闭弹窗
function handleClose() {
  dialogVisible.value = false;
  // 重置数据
  tableData.value = [];
  total.value = 0;
  queryParams.pageNo = 1;
  queryParams.operateType = undefined;
  dateRange.value = null;
}

// 监听 visible 变化，重新加载
watch(
  () => props.visible,
  (newVal) => {
    if (newVal && props.deviceHatchId) {
      queryParams.deviceHatchId = props.deviceHatchId;
      handleQuery();
    }
  },
  { immediate: true }
);
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="仓口称重日志"
    width="1200px"
    append-to-body
    @close="handleClose"
  >
    <!-- 查询表单 -->
    <el-form
      :inline="true"
      :model="queryParams"
      class="mb-4"
      @keyup.enter="handleQuery"
    >
      <el-form-item label="操作类型">
        <el-select
          v-model="queryParams.operateType"
          clearable
          placeholder="请选择"
          style="width: 120px"
        >
          <el-option
            v-for="item in operateTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="时间范围">
        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="YYYY-MM-DD HH:mm:ss"
          :shortcuts="dateShortcuts"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :icon="Search" @click="handleQuery">
          查询
        </el-button>
        <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 表格 -->
    <el-table
      v-loading="loading"
      :data="tableData"
      border
      stripe
      height="500px"
    >
      <el-table-column
        prop="deviceHatchWeightLogId"
        label="日志ID"
        width="100"
        align="center"
      />

      <el-table-column
        prop="operateType"
        label="操作类型"
        width="100"
        align="center"
      >
        <template #default="{ row }">
          <el-tag :type="getOperateTypeTag(row.operateType)" size="small" round>
            {{ getOperateTypeText(row.operateType) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column
        prop="currentWeight"
        label="当前重量(kg)"
        width="120"
        align="center"
      >
        <template #default="{ row }">
          <span class="font-medium">{{ (row.currentWeight || 0).toFixed(2) }}</span>
        </template>
      </el-table-column>

      <el-table-column
        prop="weightThreshold"
        label="满仓阈值(kg)"
        width="120"
        align="center"
      >
        <template #default="{ row }">
          {{ (row.weightThreshold || 0).toFixed(2) }}
        </template>
      </el-table-column>

      <el-table-column
        prop="weightRatio"
        label="称重系数"
        width="100"
        align="center"
      >
        <template #default="{ row }">
          {{ row.weightRatio || '-' }}
        </template>
      </el-table-column>

      <el-table-column
        prop="tareRawWeight"
        label="去皮原始值"
        width="120"
        align="center"
      >
        <template #default="{ row }">
          {{ row.tareRawWeight || '-' }}
        </template>
      </el-table-column>

      <el-table-column
        prop="tareTime"
        label="去皮时间"
        width="160"
        align="center"
      >
        <template #default="{ row }">
          {{ row.tareTime || '-' }}
        </template>
      </el-table-column>

      <el-table-column
        prop="weightRatioTime"
        label="校准时间"
        width="160"
        align="center"
      >
        <template #default="{ row }">
          {{ row.weightRatioTime || '-' }}
        </template>
      </el-table-column>

      <el-table-column
        prop="rawWeightBefore"
        label="操作前原始值"
        width="120"
        align="center"
      >
        <template #default="{ row }">
          {{ row.rawWeightBefore || '-' }}
        </template>
      </el-table-column>

      <el-table-column
        prop="rawWeightAfter"
        label="操作后原始值"
        width="120"
        align="center"
      >
        <template #default="{ row }">
          {{ row.rawWeightAfter || '-' }}
        </template>
      </el-table-column>

      <el-table-column
        prop="standardWeight"
        label="校准砝码(kg)"
        width="120"
        align="center"
      >
        <template #default="{ row }">
          {{ row.standardWeight || '-' }}
        </template>
      </el-table-column>

      <el-table-column
        label="详情"
        width="80"
        fixed="right"
        align="center"
      >
        <template #default="{ row }">
          <el-button link type="primary" @click="showDetail(row)">
            查看
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

    <!-- 日志详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="日志详情"
      width="600px"
      append-to-body
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="日志ID">
          {{ currentLog.deviceHatchWeightLogId }}
        </el-descriptions-item>
        <el-descriptions-item label="操作类型">
          <el-tag :type="getOperateTypeTag(currentLog.operateType)" size="small" round>
            {{ getOperateTypeText(currentLog.operateType) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前重量">
          {{ (currentLog.currentWeight || 0).toFixed(2) }} kg
        </el-descriptions-item>
        <el-descriptions-item label="满仓阈值">
          {{ (currentLog.weightThreshold || 0).toFixed(2) }} kg
        </el-descriptions-item>
        <el-descriptions-item v-if="currentLog.operateType === 0" label="去皮原始值">
          {{ currentLog.tareRawWeight || '-' }}
        </el-descriptions-item>
        <el-descriptions-item v-if="currentLog.operateType === 0" label="去皮时间">
          {{ currentLog.tareTime || '-' }}
        </el-descriptions-item>
        <el-descriptions-item v-if="currentLog.operateType === 1" label="称重系数">
          {{ currentLog.weightRatio || '-' }}
        </el-descriptions-item>
        <el-descriptions-item v-if="currentLog.operateType === 1" label="校准时间">
          {{ currentLog.weightRatioTime || '-' }}
        </el-descriptions-item>
        <el-descriptions-item v-if="currentLog.operateType === 1" label="校准砝码重量">
          {{ currentLog.standardWeight || '-' }} kg
        </el-descriptions-item>
        <el-descriptions-item label="操作前原始值">
          {{ currentLog.rawWeightBefore || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="操作后原始值">
          {{ currentLog.rawWeightAfter || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ currentLog.createTime || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentLog.status === 0 ? 'success' : 'danger'" size="small" round>
            {{ currentLog.status === 0 ? '启用' : '禁用' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </el-dialog>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 1rem;
}
</style>
