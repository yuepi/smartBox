<script lang="ts" setup>
import type { Device } from '#/api/device/device';
import type {
  RecycleOrder,
  RecycleOrderPageParams,
} from '#/api/operation/recycleOrder';
import type { Dept } from '#/api/system/dept';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { ElMessage, ElMessageBox } from 'element-plus';

import { getDeviceListApi } from '#/api/device/device';
import {
  cancelOrderApi,
  deleteRecycleOrderApi,
  directCompleteOrderApi,
  getRecycleOrderPageApi,
} from '#/api/operation/recycleOrder';
import { getMerchantDeptListApi } from '#/api/system/dept';
import {
  defaultRecycleOrderColumns,
  RECYCLE_ORDER_STORAGE_KEY,
} from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';
import { getRecentDays } from '#/utils/date';

import AbnormalDialog from './AbnormalDialog.vue';
import HandleRecord from './HandleRecord.vue';
import OrderDetail from './OrderDetail.vue';
import OrderRemark from './OrderRemark.vue';
import OrderWeight from './OrderWeight.vue';

const route = useRoute();
const router = useRouter();

const { order_status } = useDicts(['order_status']);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultRecycleOrderColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const orderDetailRef = ref();
const orderWeightRef = ref();
const orderRemarkRef = ref();
const abnormalDialogRef = ref();
const handleRecordRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<RecycleOrder[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);
const dateRange = ref<string[]>([]);

// 下拉选项
const deviceOptions = ref<Device[]>([]);
const deptOptions = ref<Dept[]>([]);

// 级联选择器绑定值
const cascaderValue = ref<Array<number | string>>([]);

// 组合 [小区 -> 设备] 树形结构选项
const cascaderOptions = computed(() => {
  return deptOptions.value.map((dept) => {
    // 过滤出属于当前小区的设备列表
    const childrenDevices = deviceOptions.value
      .filter((dev) => dev.deptId === dept.deptId)
      .map((dev) => ({
        label: dev.deviceName || dev.deviceNo || `设备(${dev.deviceId})`,
        value: `dev_${dev.deviceId}`, // 加前缀避免小区与设备的 ID 冲突
        isDevice: true,
        deviceId: dev.deviceId,
      }));

    return {
      label: dept.deptName,
      value: `dept_${dept.deptId}`,
      isDevice: false,
      deptId: dept.deptId,
      // 无子设备时清空 children 属性，避免级联显示空箭头
      children: childrenDevices.length > 0 ? childrenDevices : undefined,
    };
  });
});

// 订单状态选项
const orderStatusOptions = [
  { label: '审核中', value: 3 },
  { label: '已完成', value: 4 },
  { label: '异常', value: 6 },
  { label: '投递失败', value: 8 },
];

// 查询参数
const queryParams = reactive<RecycleOrderPageParams>({
  pageNo: 1,
  pageSize: 10,
  orderNo: undefined,
  deptId: undefined,
  deptName: undefined,
  deviceId: undefined,
  orderStatus: undefined,
  payStatus: undefined,
  memberId: undefined,
  memberPhone: undefined,
  startTime: undefined,
  endTime: undefined,
  deviceNo: undefined,
  deviceName: undefined,
  cleanTaskId: undefined,
});

// --- 操作弹窗 ---
const actionDialogVisible = ref(false);
const actionDialogTitle = ref('');
const actionDialogLoading = ref(false);
const actionType = ref<'abnormal' | 'cancel' | 'directComplete'>('abnormal');
const currentRow = ref<null | RecycleOrder>(null);
const actionRemark = ref('');

// --- 初始化日期 ---
function initDateRange() {
  const { startTime, endTime } = getRecentDays(7);
  dateRange.value = [startTime, endTime];
  queryParams.startTime = startTime;
  queryParams.endTime = endTime;
}

watch(dateRange, (newVal) => {
  if (newVal?.length === 2) {
    queryParams.startTime = newVal[0];
    queryParams.endTime = newVal[1];
  } else {
    queryParams.startTime = undefined;
    queryParams.endTime = undefined;
  }
});

// --- 级联选择切换回调 ---
function handleCascaderChange(val: any) {
  if (!val || val.length === 0) {
    queryParams.deptId = undefined;
    queryParams.deviceId = undefined;
  } else {
    const lastSelected = val[val.length - 1];

    // 如果选中的是【设备】
    if (typeof lastSelected === 'string' && lastSelected.startsWith('dev_')) {
      const devId = Number(lastSelected.replace('dev_', ''));
      const parentDeptId = Number(val[0].replace('dept_', ''));
      queryParams.deptId = parentDeptId;
      queryParams.deviceId = devId;
    }
    // 如果只选了【小区】
    else if (
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

// 初始化时检查 Query 参数
function initQueryParamsFromRoute() {
  const { cleanTaskId } = route.query;
  if (cleanTaskId) {
    // 将清运任务ID带入查询参数
    queryParams.cleanTaskId = Number(cleanTaskId);
    // 可选：如果是通过任务跳转过来的，将默认的7天时间范围清空，避免因为时间不匹配查不到订单
    dateRange.value = [];
    queryParams.startTime = undefined;
    queryParams.endTime = undefined;
  }
}

// --- 辅助函数 ---
function formatAmount(amount: number): string {
  if (amount === undefined || amount === null) return '¥ 0.00';
  return `¥ ${amount.toFixed(2)}`;
}

// --- 快速筛选（保持同步更新级联框显隐） ---
function handleDeviceNameClick(deviceName: string) {
  queryParams.deviceName = deviceName;
  handleQuery();
}

function handleDeviceNoClick(deviceNo: string) {
  queryParams.deviceNo = deviceNo;
  handleQuery();
}

function handleMemberPhoneClick(phone: string) {
  queryParams.memberPhone = phone;
  handleQuery();
}

function handleDeptNameClick(row: RecycleOrder) {
  const dept = deptOptions.value.find((d) => d.deptName === row.deptName);
  if (dept) {
    queryParams.deptId = dept.deptId;
    queryParams.deviceId = undefined;
    cascaderValue.value = [`dept_${dept.deptId}`];
  } else {
    queryParams.deptName = row.deptName;
  }
  handleQuery();
}

// --- 加载选项 ---
async function loadOptions() {
  try {
    const [deviceRes, deptRes] = await Promise.all([
      getDeviceListApi({ status: 0 }),
      getMerchantDeptListApi({ status: 0 }),
    ]);
    deviceOptions.value = deviceRes || [];
    deptOptions.value = deptRes || [];
  } catch (error) {
    console.error(error);
  }
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getRecycleOrderPageApi(queryParams);
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
function handleView(row: RecycleOrder) {
  orderDetailRef.value?.open(row);
}

// --- 异常弹窗 ---
function handleAbnormal(row: RecycleOrder) {
  abnormalDialogRef.value?.open(row);
}

// --- 取消异常 ---
function handleCancelAbnormal(row: RecycleOrder) {
  currentRow.value = row;
  actionType.value = 'cancel';
  actionDialogTitle.value = '取消异常';
  actionRemark.value = '';
  actionDialogVisible.value = true;
}

// --- 直接完成 ---
function handleDirectComplete(row: RecycleOrder) {
  currentRow.value = row;
  actionType.value = 'directComplete';
  actionDialogTitle.value = '直接完成';
  actionRemark.value = '';
  actionDialogVisible.value = true;
}

// --- 提交操作弹窗 ---
async function handleActionSubmit() {
  if (!currentRow.value) return;

  actionDialogLoading.value = true;
  try {
    switch (actionType.value) {
      case 'cancel': {
        await cancelOrderApi({
          recycleOrderId: currentRow.value.recycleOrderId,
          remark: actionRemark.value,
        });
        ElMessage.success('已取消异常');
        break;
      }
      case 'directComplete': {
        await directCompleteOrderApi({
          recycleOrderId: currentRow.value.recycleOrderId,
          remark: actionRemark.value,
        });
        ElMessage.success('直接完成成功');
        break;
      }
    }
    actionDialogVisible.value = false;
    loadData();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    actionDialogLoading.value = false;
  }
}

// --- 补重/扣重 ---
function handleWeight(row: RecycleOrder) {
  orderWeightRef.value?.open(row);
}

// --- 备注 ---
function handleRemark(row: RecycleOrder) {
  orderRemarkRef.value?.open(row);
}

// 查看操作记录
function handleViewRecord(row: RecycleOrder) {
  handleRecordRef.value?.open({
    recycleOrderId: row.recycleOrderId,
    orderNo: row.orderNo,
  });
}

// --- 跳转到会员详情 ---
function handleViewMember(phone: string) {
  if (!phone) return;
  // 跳转到会员列表页，携带手机号参数
  router.push({
    path: '/member',
    query: { mobile: phone },
  });
}

// --- 删除 ---
async function handleDelete(row?: RecycleOrder) {
  // eslint-disable-next-line no-useless-assignment
  let ids: number[] = [];
  if (row) {
    ids = [row.recycleOrderId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条订单吗？`,
      '提示',
      { type: 'warning' },
    );
    for (const id of ids) {
      await deleteRecycleOrderApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条订单`);
    selectedIds.value = [];
    loadData();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: RecycleOrder[]) {
  selectedIds.value = selection.map((item) => item.recycleOrderId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  cascaderValue.value = [];
  queryParams.orderNo = undefined;
  queryParams.memberId = undefined;
  queryParams.deptId = undefined;
  queryParams.deptName = undefined;
  queryParams.deviceId = undefined;
  queryParams.orderStatus = undefined;
  queryParams.payStatus = undefined;
  queryParams.memberPhone = undefined;
  queryParams.startTime = undefined;
  queryParams.endTime = undefined;
  queryParams.deviceNo = undefined;
  queryParams.deviceName = undefined;
  queryParams.cleanTaskId = undefined;
  queryParams.pageNo = 1;
  loadData();
}

onMounted(() => {
  initDateRange();
  initQueryParamsFromRoute();
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
        <!-- 手机号 -->
        <el-form-item>
          <el-input
            v-model="queryParams.memberPhone"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">手机号:</span>
            </template>
          </el-input>
        </el-form-item>

        <!-- 🌟 组合级联筛选（小区 / 设备） -->
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

        <!-- 设备编号 -->
        <el-form-item>
          <el-input
            v-model="queryParams.deviceNo"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">设备编号:</span>
            </template>
          </el-input>
        </el-form-item>

        <!-- 设备名称 -->
        <el-form-item>
          <el-input
            v-model="queryParams.deviceName"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">设备名称:</span>
            </template>
          </el-input>
        </el-form-item>

        <!-- 订单状态 -->
        <el-form-item>
          <el-select
            v-model="queryParams.orderStatus"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">订单状态:</span>
            </template>
            <el-option
              v-for="item in orderStatusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <!-- 日期范围 -->
        <el-form-item>
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 360px"
          />
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <template #search-advanced>
        <el-form-item>
          <el-input
            v-model="queryParams.orderNo"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">订单编号:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="queryParams.memberId"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">会员ID:</span>
            </template>
          </el-input>
        </el-form-item>
      </template>

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <ExportButton
          :module-code="ModuleCodeMap.RECYCLE_ORDER"
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
          :storage-key="RECYCLE_ORDER_STORAGE_KEY"
          :default-columns="defaultRecycleOrderColumns"
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
            :key="`${col.key}_${col.fixed || 'none'}`"
            :prop="col.key"
            :label="col.label"
            :width="typeof col.width === 'number' ? col.width : undefined"
            :min-width="col.minWidth"
            :align="col.align"
            :show-overflow-tooltip="col.showOverflowTooltip || false"
            :fixed="col.fixed"
          >
            <template #default="{ row }">
              <!-- 订单状态 -->
              <template v-if="col.key === 'orderStatus'">
                <DictTag :options="order_status" :value="row.orderStatus" />
              </template>
              <!-- 投递重量 -->
              <template v-else-if="col.key === 'weight'">
                {{ row.weight?.toFixed(2) || 0 }} kg
              </template>
              <!-- 实际金额 -->
              <template v-else-if="col.key === 'realAmount'">
                <div class="flex items-center justify-center gap-1">
                  <span class="font-medium text-primary">{{
                    formatAmount(row.realAmount)
                  }}</span>
                  <el-tooltip placement="top" :show-after="300">
                    <template #content>
                      <div class="text-xs leading-relaxed">
                        <div class="flex justify-between gap-4">
                          <span class="text-white">原订单重量</span>
                          <span class="text-white font-medium">{{ (row.weight || 0).toFixed(2) }} kg</span>
                        </div>
                        <div class="flex justify-between gap-4">
                          <span class="text-white">原订单金额</span>
                          <span class="text-white font-medium">{{
                            formatAmount(row.estimateAmount)
                          }}</span>
                        </div>
                        <div class="flex justify-between gap-4">
                          <span class="text-white">违规重量</span>
                          <span class="text-white font-medium">{{ (row.deductWeight || 0).toFixed(2) }} kg</span>
                        </div>
                        <div class="flex justify-between gap-4">
                          <span class="text-white">因违规已扣除</span>
                          <span class="text-white font-medium">{{
                            formatAmount(row.deductAmount)
                          }}</span>
                        </div>
                        <div class="border-t border-gray-600 my-1"></div>
                        <div class="flex justify-between gap-4">
                          <span class="text-white">实际结算</span>
                          <span class="text-primary font-bold">{{
                            formatAmount(row.realAmount)
                          }}</span>
                        </div>
                      </div>
                    </template>
                    <el-icon
                      class="text-gray-400 hover:text-primary cursor-pointer text-sm"
                    >
                      <QuestionFilled />
                    </el-icon>
                  </el-tooltip>
                </div>
              </template>
              <!-- 投递前后重量 -->
              <template v-else-if="col.key === 'beforeAfterWeight'">
                <span>{{ (row.beforeWeight || 0).toFixed(2) }} →
                  {{ (row.afterWeight || 0).toFixed(2) }} kg</span>
              </template>
              <!-- 内网抓拍图片 -->
              <template v-else-if="col.key === 'imageUrls'">
                <div class="flex items-center gap-1 justify-center">
                  <template v-if="row.imageUrls && row.imageUrls.length > 0">
                    <el-image
                      v-for="(url, idx) in row.imageUrls.slice(0, 5)"
                      :key="idx"
                      :src="url"
                      :preview-src-list="row.imageUrls"
                      :initial-index="Number(idx)"
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
                      v-if="row.imageUrls.length > 5"
                      size="small"
                      type="info"
                    >
                      +{{ row.imageUrls.length - 5 }}
                    </el-tag>
                  </template>
                  <span v-else class="text-gray-400">-</span>
                </div>
              </template>
              <!-- 小区名称 - 点击快速筛选 -->
              <template v-else-if="col.key === 'deptName'">
                <span
                  v-if="row.deptName"
                  class="table-link-text"
                  :title="row.deptName"
                  @click="handleDeptNameClick(row)"
                >
                  {{ row.deptName }}
                </span>
                <span v-else>-</span>
              </template>
              <!-- 设备名称 - 点击快速筛选 -->
              <template v-else-if="col.key === 'deviceName'">
                <span
                  v-if="row.deviceName"
                  class="table-link-text"
                  @click="handleDeviceNameClick(row.deviceName)"
                >
                  {{ row.deviceName }}
                </span>
                <span v-else>-</span>
              </template>

              <!-- 设备编号 - 点击快速筛选 -->
              <template v-else-if="col.key === 'deviceNo'">
                <span
                  v-if="row.deviceNo"
                  class="table-link-text"
                  @click="handleDeviceNoClick(row.deviceNo)"
                >
                  {{ row.deviceNo }}
                </span>
                <span v-else>-</span>
              </template>

              <!-- 手机号 - 点击快速筛选 -->
              <template v-else-if="col.key === 'memberPhone'">
                <div class="flex items-center justify-center gap-1">
                  <span
                    v-if="row.memberPhone"
                    class="table-link-text"
                    @click="handleMemberPhoneClick(row.memberPhone)"
                  >
                    {{ row.memberPhone }}
                  </span>
                  <span v-else>-</span>
                  <el-button
                    v-if="row.memberPhone"
                    link
                    type="primary"
                    size="small"
                    class="!p-0 !h-auto text-xs"
                    @click="handleViewMember(row.memberPhone)"
                  >
                    查看
                  </el-button>
                </div>
              </template>

              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <!-- 操作列 -->
          <el-table-column
            label="操作"
            width="250"
            fixed="right"
            align="center"
          >
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="handleView(row)">
                  详情
                </el-button>
                <el-button
                  size="small"
                  type="info"
                  @click="handleViewRecord(row)"
                  >
操作记录
</el-button>
                <el-button
                  v-if="[0, 1, 2, 3, 4, 7].includes(row.orderStatus)"
                  size="small"
                  type="danger"
                  @click="handleAbnormal(row)"
                >
                  标记异常
                </el-button>
                <el-button
                  v-if="row.orderStatus === 6"
                  size="small"
                  type="success"
                  @click="handleCancelAbnormal(row)"
                >
                  取消异常
                </el-button>
                <el-button
                  v-if="[0, 1, 2, 3].includes(row.orderStatus)"
                  size="small"
                  type="primary"
                  @click="handleDirectComplete(row)"
                >
                  直接完成
                </el-button>
                <el-button
                  size="small"
                  type="warning"
                  @click="handleWeight(row)"
                >
                  补重/扣重
                </el-button>
                <el-button size="small" type="info" @click="handleRemark(row)">
                  添加备注
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <!-- ===== 弹窗 ===== -->
    <OrderDetail ref="orderDetailRef" />
    <OrderWeight ref="orderWeightRef" @success="loadData" />
    <OrderRemark ref="orderRemarkRef" @success="loadData" />
    <AbnormalDialog ref="abnormalDialogRef" @success="loadData" />
    <HandleRecord ref="handleRecordRef" />

    <!-- 操作弹窗（异常/取消异常/直接完成） -->
    <el-dialog
      v-model="actionDialogVisible"
      :title="actionDialogTitle"
      width="450px"
      append-to-body
    >
      <el-form label-width="80px">
        <el-form-item label="备注">
          <el-input
            v-model="actionRemark"
            type="textarea"
            :rows="4"
            placeholder="请输入备注（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="actionDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="actionDialogLoading"
          @click="handleActionSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped lang="scss">
.selected-alert-badge {
  display: inline-block;
}
</style>
