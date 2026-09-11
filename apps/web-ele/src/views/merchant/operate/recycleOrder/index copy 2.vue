<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { Device } from '#/api/device/device';
import type {
  RecycleOrder,
  RecycleOrderPageParams,
} from '#/api/operation/recycleOrder';
import type { Dept } from '#/api/system/dept';

import { computed, h, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  ElCascader,
  ElDatePicker,
  ElMessage,
  ElMessageBox,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getDeviceListApi } from '#/api/device/device';
import {
  cancelOrderApi,
  deleteRecycleOrderApi,
  directCompleteOrderApi,
  getRecycleOrderPageApi,
} from '#/api/operation/recycleOrder';
import { getMerchantDeptListApi } from '#/api/system/dept';
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
const queryParams = ref({});

// --- 组件/弹窗引用 ---
const orderDetailRef = ref();
const orderWeightRef = ref();
const orderRemarkRef = ref();
const abnormalDialogRef = ref();
const handleRecordRef = ref();

// --- 状态变量 ---
const selectedIds = ref<number[]>([]);
const deviceOptions = ref<Device[]>([]);
const deptOptions = ref<Dept[]>([]);

// --- 组合 [小区 -> 设备] 级联树形选项 ---
const cascaderOptions = computed(() => {
  return deptOptions.value.map((dept) => {
    const childrenDevices = deviceOptions.value
      .filter((dev) => dev.deptId === dept.deptId)
      .map((dev) => ({
        label: dev.deviceName || dev.deviceNo || `设备(${dev.deviceId})`,
        value: `dev_${dev.deviceId}`,
      }));

    return {
      label: dept.deptName,
      value: `dept_${dept.deptId}`,
      children: childrenDevices.length > 0 ? childrenDevices : undefined,
    };
  });
});

// 订单状态固定选项
const orderStatusOptions = [
  { label: '审核中', value: 3 },
  { label: '已完成', value: 4 },
  { label: '异常', value: 6 },
  { label: '投递失败', value: 8 },
];

// --- 简单辅助格式化函数 ---
function formatAmount(amount: number): string {
  if (amount === undefined || amount === null) return '¥ 0.00';
  return `¥ ${amount.toFixed(2)}`;
}

// ==================== 1. Form 表单配置 ====================
const formOptions: VbenFormProps = {
  wrapperClass: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-6',
  collapsed: false,
  showCollapseButton: true,
  submitOnEnter: true,
  schema: [
    {
      component: 'Input',
      fieldName: 'memberPhone',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '手机号:'),
      }),
      componentProps: {
        placeholder: '请输入',
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'cascaderValue',
      labelWidth: 0,
      renderComponent: ({ modelValue, updateModelValue }) =>
        h(ElCascader, {
          modelValue,
          options: cascaderOptions.value,
          props: {
            checkStrictly: true,
            expandTrigger: 'hover',
            emitPath: true,
          },
          placeholder: '请选择小区/设备',
          filterable: true,
          clearable: true,
          class: 'w-full',
          'onUpdate:modelValue': (val) => updateModelValue(val),
        }),
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '小区/设备:'),
      }),
    },
    {
      component: 'Input',
      fieldName: 'deviceNo',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '设备编号:'),
      }),
      componentProps: {
        placeholder: '请输入',
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'deviceName',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '设备名称:'),
      }),
      componentProps: {
        placeholder: '请输入',
        clearable: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'orderStatus',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '订单状态:'),
      }),
      componentProps: {
        options: orderStatusOptions,
        placeholder: '请选择',
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'dateRange',
      labelWidth: 0,
      renderComponent: ({ modelValue, updateModelValue }) =>
        h(ElDatePicker, {
          modelValue,
          type: 'datetimerange',
          rangeSeparator: '至',
          startPlaceholder: '开始时间',
          endPlaceholder: '结束时间',
          valueFormat: 'YYYY-MM-DD HH:mm:ss',
          class: 'w-full',
          'onUpdate:modelValue': (val) => updateModelValue(val),
        }),
    },
  ],
};

// ==================== 2. VXE Grid 表格配置 ====================
const defaultRecycleOrderColumns: VxeGridProps<RecycleOrder>['columns'] = [
  {
    type: 'checkbox',
    width: 50,
    align: 'center',
    fixed: 'left',
    field: 'checkbox',
  },
  {
    field: 'recycleOrderId',
    title: '订单ID',
    visible: false,
    width: 80,
    align: 'center',
  },
  {
    field: 'orderNo',
    title: '订单编号',
    visible: false,
    minWidth: 200,
    align: 'center',
    showOverflow: true,
  },
  {
    field: 'merchantId',
    title: '商户ID',
    visible: false,
    width: 80,
    align: 'center',
  },
  {
    field: 'memberId',
    title: '会员ID',
    visible: false,
    width: 80,
    align: 'center',
  },
  {
    field: 'memberName',
    title: '会员名称',
    visible: false,
    width: 120,
    align: 'center',
  },
  {
    field: 'memberPhone',
    title: '手机号',
    visible: true,
    width: 150,
    align: 'center',
    fixed: 'left',
    slots: { default: 'memberPhone' },
  },
  {
    field: 'deptId',
    title: '小区ID',
    visible: false,
    width: 80,
    align: 'center',
  },
  {
    field: 'deptName',
    title: '小区名称',
    visible: true,
    minWidth: 150,
    align: 'center',
    showOverflow: true,
    slots: { default: 'deptName' },
  },
  {
    field: 'deviceId',
    title: '设备ID',
    visible: false,
    width: 80,
    align: 'center',
  },
  {
    field: 'deviceNo',
    title: '设备编号',
    visible: true,
    width: 150,
    align: 'center',
    slots: { default: 'deviceNo' },
  },
  {
    field: 'deviceName',
    title: '设备名称',
    visible: true,
    minWidth: 180,
    align: 'center',
    showOverflow: true,
    slots: { default: 'deviceName' },
  },
  {
    field: 'hatchId',
    title: '仓口ID',
    visible: false,
    width: 80,
    align: 'center',
  },
  {
    field: 'hatchNo',
    title: '仓口号',
    visible: false,
    width: 180,
    align: 'center',
    showOverflow: true,
  },
  {
    field: 'imageUrls',
    title: '内外抓拍图片',
    visible: true,
    width: 240,
    align: 'center',
    slots: { default: 'imageUrls' },
  },
  {
    field: 'devicePackageId',
    title: '计费套餐ID',
    visible: false,
    width: 100,
    align: 'center',
  },
  {
    field: 'devicePackageName',
    title: '计费套餐名称',
    visible: false,
    width: 150,
    align: 'center',
  },
  {
    field: 'deviceBagId',
    title: '包袋ID',
    visible: false,
    width: 80,
    align: 'center',
  },
  {
    field: 'deviceBagNo',
    title: '包袋编号',
    visible: false,
    width: 150,
    align: 'center',
  },
  {
    field: 'beforeWeight',
    title: '投递前重量(kg)',
    visible: false,
    width: 120,
    align: 'center',
  },
  {
    field: 'afterWeight',
    title: '投递后重量(kg)',
    visible: false,
    width: 120,
    align: 'center',
  },
  {
    field: 'beforeAfterWeight',
    title: '投递重量变化(kg)',
    visible: true,
    width: 160,
    align: 'center',
    slots: { default: 'beforeAfterWeight' },
  },
  {
    field: 'weight',
    title: '投递重量(kg)',
    visible: true,
    width: 110,
    align: 'center',
    slots: { default: 'weight' },
  },
  {
    field: 'realWeight',
    title: '实际有效重量(kg)',
    visible: true,
    width: 140,
    align: 'center',
  },
  {
    field: 'unitPrice',
    title: '回收单价(元/kg)',
    visible: true,
    width: 140,
    align: 'center',
  },
  {
    field: 'estimateAmount',
    title: '预估金额(元)',
    visible: false,
    width: 110,
    align: 'center',
  },
  {
    field: 'realAmount',
    title: '实际金额(元)',
    visible: true,
    width: 110,
    align: 'center',
    slots: { default: 'realAmount' },
  },
  {
    field: 'orderStatus',
    title: '订单状态',
    visible: true,
    width: 120,
    align: 'center',
    slots: { default: 'orderStatus' },
  },
  {
    field: 'remark',
    title: '备注',
    visible: false,
    minWidth: 150,
    align: 'left',
    showOverflow: true,
  },
  {
    field: 'status',
    title: '状态',
    visible: false,
    width: 80,
    align: 'center',
  },
  {
    field: 'createdTime',
    title: '创建时间',
    visible: true,
    width: 160,
    align: 'center',
  },
  {
    title: '操作',
    field: 'action',
    width: 250,
    fixed: 'right',
    align: 'center',
    showOverflow: false,
    slots: { default: 'action' },
  },
];

const gridOptions: VxeGridProps<RecycleOrder> = {
  id: 'recycle_order_table_columns',
  columns: defaultRecycleOrderColumns,
  height: 'auto',
  keepSource: true,
  checkboxConfig: {
    reserve: true,
    highlight: true,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        const { cascaderValue, dateRange, ...restValues } = formValues;

        let deptId: number | undefined;
        let deviceId: number | undefined;

        // 解析级联选择框结果
        if (Array.isArray(cascaderValue) && cascaderValue.length > 0) {
          const lastSelected = cascaderValue[cascaderValue.length - 1];
          if (
            typeof lastSelected === 'string' &&
            lastSelected.startsWith('dev_')
          ) {
            deviceId = Number(lastSelected.replace('dev_', ''));
            deptId = Number(cascaderValue[0].replace('dept_', ''));
          } else if (
            typeof lastSelected === 'string' &&
            lastSelected.startsWith('dept_')
          ) {
            deptId = Number(lastSelected.replace('dept_', ''));
          }
        }

        const params: RecycleOrderPageParams = {
          pageNo: page.currentPage,
          pageSize: page.pageSize,
          ...restValues,
          deptId,
          deviceId,
          startTime: dateRange?.[0],
          endTime: dateRange?.[1],
        };
        queryParams.value = params;

        return await getRecycleOrderPageApi(params);
      },
    },
  },
};

// ==================== 3. 统一挂载组件 Api ====================
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

// 初始化默认时间段与路由参数
function initFormValues() {
  const { cleanTaskId } = route.query;
  if (cleanTaskId) {
    gridApi.formApi.setValues({
      cleanTaskId: Number(cleanTaskId),
      dateRange: [],
    });
  } else {
    const { startTime, endTime } = getRecentDays(7);
    gridApi.formApi.setValues({
      dateRange: [startTime, endTime],
    });
  }
}

// 选项快速过滤
function setFormFieldAndQuery(field: string, value: any) {
  gridApi.formApi.setValues({ [field]: value });
  gridApi.query();
}

function handleDeptNameClick(row: RecycleOrder) {
  const dept = deptOptions.value.find((d) => d.deptName === row.deptName);
  if (dept) {
    gridApi.formApi.setValues({
      cascaderValue: [`dept_${dept.deptId}`],
    });
  } else {
    gridApi.formApi.setValues({
      deptName: row.deptName,
    });
  }
  gridApi.query();
}

// 基础下拉列表加载
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

// 多选数据监听
function handleCheckboxChange() {
  const records = gridApi.grid?.getCheckboxRecords() || [];
  selectedIds.value = records.map((item) => item.recycleOrderId);
}

// ==================== 4. 动作与弹窗逻辑 ====================
const actionDialogVisible = ref(false);
const actionDialogTitle = ref('');
const actionDialogLoading = ref(false);
const actionType = ref<'cancel' | 'directComplete'>('cancel');
const currentRow = ref<null | RecycleOrder>(null);
const actionRemark = ref('');

function handleView(row: RecycleOrder) {
  orderDetailRef.value?.open(row);
}

function handleAbnormal(row: RecycleOrder) {
  abnormalDialogRef.value?.open(row);
}

function handleCancelAbnormal(row: RecycleOrder) {
  currentRow.value = row;
  actionType.value = 'cancel';
  actionDialogTitle.value = '取消异常';
  actionRemark.value = '';
  actionDialogVisible.value = true;
}

function handleDirectComplete(row: RecycleOrder) {
  currentRow.value = row;
  actionType.value = 'directComplete';
  actionDialogTitle.value = '直接完成';
  actionRemark.value = '';
  actionDialogVisible.value = true;
}

async function handleActionSubmit() {
  if (!currentRow.value) return;

  actionDialogLoading.value = true;
  try {
    if (actionType.value === 'cancel') {
      await cancelOrderApi({
        recycleOrderId: currentRow.value.recycleOrderId,
        remark: actionRemark.value,
      });
      ElMessage.success('已取消异常');
    } else {
      await directCompleteOrderApi({
        recycleOrderId: currentRow.value.recycleOrderId,
        remark: actionRemark.value,
      });
      ElMessage.success('直接完成成功');
    }
    actionDialogVisible.value = false;
    gridApi.reload();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    actionDialogLoading.value = false;
  }
}

function handleWeight(row: RecycleOrder) {
  orderWeightRef.value?.open(row);
}

function handleRemark(row: RecycleOrder) {
  orderRemarkRef.value?.open(row);
}

function handleViewRecord(row: RecycleOrder) {
  handleRecordRef.value?.open({
    recycleOrderId: row.recycleOrderId,
    orderNo: row.orderNo,
  });
}

function handleViewMember(phone: string) {
  if (!phone) return;
  router.push({
    path: '/member',
    query: { mobile: phone },
  });
}

async function handleDelete(row?: RecycleOrder) {
  const ids = row ? [row.recycleOrderId] : selectedIds.value;
  if (ids.length === 0) {
    ElMessage.warning('请选择要删除的记录');
    return;
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
    gridApi.reload();
  } catch {
    // 取消删除
  }
}

onMounted(async () => {
  await loadOptions();
  initFormValues();
});
</script>

<template>
  <Page auto-content-height>
    <!-- Grid 内置了封装好的 Form 区域 -->
    <Grid
      @checkbox-change="handleCheckboxChange"
      @checkbox-all="handleCheckboxChange"
    >
      <!-- 顶部工具栏按钮插槽 -->
      <template #toolbar-actions>
        <div class="flex items-center gap-2">
          <el-button
            type="danger"
            plain
            icon="Delete"
            :disabled="selectedIds.length === 0"
            @click="handleDelete()"
          >
            批量删除
          </el-button>
          <VxeExportButton
            :module-code="ModuleCodeMap.RECYCLE_ORDER"
            :find-cond="queryParams"
            :grid-api="gridApi"
          />
        </div>
      </template>

      <!-- 列插槽自定义渲染 -->

      <!-- 手机号插槽 -->
      <template #memberPhone="{ row }">
        <div class="flex items-center justify-center gap-1">
          <span
            v-if="row.memberPhone"
            class="table-link-text cursor-pointer text-primary hover:underline"
            @click="setFormFieldAndQuery('memberPhone', row.memberPhone)"
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

      <!-- 小区名称插槽 -->
      <template #deptName="{ row }">
        <span
          v-if="row.deptName"
          class="table-link-text cursor-pointer text-primary hover:underline"
          :title="row.deptName"
          @click="handleDeptNameClick(row)"
        >
          {{ row.deptName }}
        </span>
        <span v-else>-</span>
      </template>

      <!-- 设备编号插槽 -->
      <template #deviceNo="{ row }">
        <span
          v-if="row.deviceNo"
          class="table-link-text cursor-pointer text-primary hover:underline"
          @click="setFormFieldAndQuery('deviceNo', row.deviceNo)"
        >
          {{ row.deviceNo }}
        </span>
        <span v-else>-</span>
      </template>

      <!-- 设备名称插槽 -->
      <template #deviceName="{ row }">
        <span
          v-if="row.deviceName"
          class="table-link-text cursor-pointer text-primary hover:underline"
          @click="setFormFieldAndQuery('deviceName', row.deviceName)"
        >
          {{ row.deviceName }}
        </span>
        <span v-else>-</span>
      </template>

      <!-- 抓拍图片插槽 -->
      <template #imageUrls="{ row }">
        <div class="flex items-center gap-1 justify-center">
          <template v-if="row.imageUrls && row.imageUrls.length > 0">
            <el-image
              v-for="(url, idx) in row.imageUrls.slice(0, 5)"
              :key="idx"
              :src="url"
              :preview-src-list="row.imageUrls"
              :initial-index="Number(idx)"
              fit="cover"
              show-progress
              style="
                width: 40px;
                height: 40px;
                cursor: pointer;
                border: 1px solid #dcdfe6;
                border-radius: 4px;
              "
              preview-teleported
            />
            <el-tag v-if="row.imageUrls.length > 5" size="small" type="info">
              +{{ row.imageUrls.length - 5 }}
            </el-tag>
          </template>
          <span v-else class="text-gray-400">-</span>
        </div>
      </template>

      <!-- 投递重量变化插槽 -->
      <template #beforeAfterWeight="{ row }">
        <span>{{ (row.beforeWeight || 0).toFixed(2) }} →
          {{ (row.afterWeight || 0).toFixed(2) }} kg</span>
      </template>

      <!-- 投递重量插槽 -->
      <template #weight="{ row }">
        {{ row.weight?.toFixed(2) || 0 }} kg
      </template>

      <!-- 实际金额插槽 -->
      <template #realAmount="{ row }">
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

      <!-- 订单状态插槽 -->
      <template #orderStatus="{ row }">
        <DictTag :options="order_status" :value="row.orderStatus" />
      </template>

      <!-- 操作列插槽 -->
      <template #action="{ row }">
        <div class="action-buttons">
          <el-button size="small" type="primary" @click="handleView(row)">
            详情
          </el-button>
          <el-button size="small" type="info" @click="handleViewRecord(row)">
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
          <el-button size="small" type="warning" @click="handleWeight(row)">
            补重/扣重
          </el-button>
          <el-button size="small" type="info" @click="handleRemark(row)">
            添加备注
          </el-button>
        </div>
      </template>
    </Grid>

    <!-- ===== 子组件弹窗 ===== -->
    <OrderDetail ref="orderDetailRef" />
    <OrderWeight ref="orderWeightRef" @success="gridApi.reload()" />
    <OrderRemark ref="orderRemarkRef" @success="gridApi.reload()" />
    <AbnormalDialog ref="abnormalDialogRef" @success="gridApi.reload()" />
    <HandleRecord ref="handleRecordRef" />

    <!-- 内置操作弹窗（取消异常/直接完成） -->
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
