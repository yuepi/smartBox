<script setup lang="ts">
import type {
  RecycleOrder,
  RecycleOrderPageParams,
} from '#/api/operation/recycleOrder';
import type { SortViolation } from '#/api/operation/violation';

import { reactive, ref } from 'vue';

import { ElMessage } from 'element-plus';

import {
  cancelOrderApi,
  getRecycleOrderPageApi,
} from '#/api/operation/recycleOrder';
import { getCleanTaskViolationListApi } from '#/api/operation/violation';

import AbnormalDialog from '../recycleOrder/AbnormalDialog.vue';

const { order_status } = useDicts(['order_status']);

const visible = ref(false);
const currentCleanTaskId = ref<number>(0);
const loadingViolation = ref(false);
const loadingOrders = ref(false);

const violationList = ref<SortViolation[]>([]);
const orderList = ref<RecycleOrder[]>([]);
const totalOrders = ref(0);

const abnormalDialogRef = ref();
const isFullscreen = ref(false);

/** 切换全屏状态 */
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
}

// 状态 Tab 选项卡（全部及核心状态）
const activeTab = ref<string>('all');
const statusTabs = [
  { label: '全部', value: 'all' },
  { label: '审核中', value: '3' },
  { label: '已完成', value: '4' },
  { label: '异常', value: '6' },
  { label: '投递失败', value: '8' },
];

// 分页与筛选参数
const orderQuery = reactive<RecycleOrderPageParams>({
  pageNo: 1,
  pageSize: 10,
  cleanTaskId: undefined,
  orderNo: undefined,
  orderStatus: undefined,
});

/** 打开弹窗外部入口 */
async function open(cleanTaskId: number) {
  currentCleanTaskId.value = cleanTaskId;
  orderQuery.cleanTaskId = cleanTaskId;
  orderQuery.pageNo = 1;
  activeTab.value = 'all';
  orderQuery.orderStatus = undefined;

  visible.value = true;
  fetchViolations();
  fetchOrders();
}

/** 查左侧违规记录 */
async function fetchViolations() {
  loadingViolation.value = true;
  try {
    const res = await getCleanTaskViolationListApi(currentCleanTaskId.value);
    violationList.value = res || [];
  } catch (error) {
    console.error(error);
  } finally {
    loadingViolation.value = false;
  }
}

/** 查右侧订单列表 */
async function fetchOrders() {
  loadingOrders.value = true;
  try {
    const res = await getRecycleOrderPageApi(orderQuery);
    orderList.value = res.records || [];
    totalOrders.value = res.total || 0;
  } catch (error) {
    console.error(error);
  } finally {
    loadingOrders.value = false;
  }
}

// --- 辅助函数 ---
function formatAmount(amount: number): string {
  if (amount === undefined || amount === null) return '¥ 0.00';
  return `¥ ${amount.toFixed(2)}`;
}

/** 切换 Tab 状态 */
function handleTabChange(tabValue: number | string) {
  orderQuery.pageNo = 1;
  orderQuery.orderStatus = tabValue === 'all' ? undefined : Number(tabValue);
  fetchOrders();
}

/** 分页页码切换 */
function handlePageChange(page: number) {
  orderQuery.pageNo = page;
  fetchOrders();
}

/** 分页条数切换 */
function handleSizeChange(size: number) {
  orderQuery.pageSize = size;
  orderQuery.pageNo = 1;
  fetchOrders();
}

/** 标记异常 */
function handleMarkAbnormal(row: RecycleOrder) {
  abnormalDialogRef.value?.open(row);
}

/** 取消异常 */
async function handleCancelAbnormal(row: RecycleOrder) {
  try {
    await ElMessageBox.confirm('确定要取消该订单的异常状态吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await cancelOrderApi({
      recycleOrderId: row.recycleOrderId,
      remark: '违规排查弹窗取消异常',
    });
    ElMessage.success('已取消异常');
    fetchOrders();
  } catch (error) {
    console.error(error);
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    width="1400px"
    destroy-on-close
    :fullscreen="isFullscreen"
    :show-close="false"
  >
    <template #header="{ close }">
      <div class="flex items-center justify-between w-full pr-2">
        <span class="el-dialog__title">清运任务 #{{ currentCleanTaskId }} - 违规排查与关联订单</span>

        <!-- 右上角按钮组 -->
        <div class="flex items-center gap-3">
          <!-- 全屏 / 还原按钮 -->
          <el-icon
            class="cursor-pointer text-gray-500 hover:text-primary transition-colors text-base"
            :title="isFullscreen ? '还原' : '全屏'"
            @click="toggleFullscreen"
          >
            <CopyDocument v-if="isFullscreen" />
            <FullScreen v-else />
          </el-icon>

          <!-- 关闭按钮 -->
          <el-icon
            class="cursor-pointer text-gray-500 hover:text-red-500 transition-colors text-base"
            title="关闭"
            @click="close"
          >
            <Close />
          </el-icon>
        </div>
      </div>
    </template>
    <!-- 双栏布局：左侧违规记录，右侧关联订单 -->
    <div
      class="grid grid-cols-12 gap-4 transition-all duration-200"
      :class="isFullscreen ? 'h-[calc(100vh-110px)]' : 'h-[600px]'"
    >
      <!-- ===== 左栏：违规记录 ===== -->
      <div
        class="col-span-4 flex flex-col border-r pr-4 h-full overflow-hidden"
      >
        <div
          class="font-bold text-base mb-2 flex items-center justify-between flex-shrink-0"
        >
          <div class="flex items-center gap-2">
            <span>违规记录</span>
            <el-tag size="small" type="danger">
              {{ violationList.length }} 条
            </el-tag>
          </div>
        </div>

        <div v-loading="loadingViolation" class="flex-1 overflow-y-auto pr-1">
          <el-empty
            v-if="violationList.length === 0"
            description="暂无违规记录"
          />

          <div
            v-for="item in violationList"
            :key="item.sortViolationId"
            class="mb-3 p-3 border rounded-lg bg-red-50/30 border-red-100"
          >
            <div class="flex justify-between items-center mb-1">
              <el-tag size="small" type="danger">
                {{ item.violationType || '违规' }}
              </el-tag>
              <span class="text-xs text-gray-400">{{ item.createdTime }}</span>
            </div>

            <p class="text-sm text-gray-700 my-1 font-medium">
              {{ item.violationDesc || item.remark || '无详细描述' }}
            </p>

            <!-- 违规图片缩略图 -->
            <div
              v-if="item.violationImages?.length"
              class="flex flex-wrap gap-1.5 mt-2"
            >
              <el-image
                v-for="(img, i) in item.violationImages"
                :key="i"
                :src="img"
                :preview-src-list="item.violationImages"
                :initial-index="i"
                preview-teleported
                fit="cover"
                class="w-14 h-14 rounded border border-gray-200 cursor-pointer"
              />
            </div>
            <div class="mt-2 text-xs text-gray-400 text-right">
              操作员：{{ item.createdName || '未知' }}
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 右栏：关联订单列表 ===== -->
      <div class="col-span-8 flex flex-col h-full overflow-hidden">
        <!-- 头部 Tabs 状态切换 -->
        <div class="flex-shrink-0 mb-2">
          <el-tabs
            v-model="activeTab"
            type="card"
            class="order-tabs"
            @tab-change="handleTabChange"
          >
            <el-tab-pane
              v-for="tab in statusTabs"
              :key="tab.value"
              :label="tab.label"
              :name="tab.value"
            />
          </el-tabs>
        </div>

        <div v-loading="loadingOrders" class="flex-1 min-h-0">
          <el-table
            :data="orderList"
            border
            size="small"
            height="100%"
            style="width: 100%"
          >
            <el-table-column
              prop="memberPhone"
              label="手机号"
              width="130"
              align="center"
            />

            <el-table-column
              prop="weight"
              label="重量(kg)"
              width="90"
              align="center"
            >
              <template #default="{ row }">
                {{ (row.weight || 0).toFixed(2) }}
              </template>
            </el-table-column>

            <el-table-column
              prop="imageUrls"
              label="抓拍图片"
              min-width="140"
              align="center"
            >
              <template #default="{ row }">
                <div class="flex items-center gap-1 justify-center">
                  <template v-if="row.imageUrls && row.imageUrls.length > 0">
                    <el-image
                      v-for="(url, idx) in row.imageUrls.slice(0, 8)"
                      :key="idx"
                      :src="url"
                      :preview-src-list="row.imageUrls"
                      :initial-index="Number(idx)"
                      fit="cover"
                      show-progress
                      style="
                        width: 36px;
                        height: 36px;
                        cursor: pointer;
                        border: 1px solid #dcdfe6;
                        border-radius: 4px;
                      "
                      preview-teleported
                    />
                    <el-tag
                      v-if="row.imageUrls.length > 8"
                      size="small"
                      type="info"
                    >
                      +{{ row.imageUrls.length - 8 }}
                    </el-tag>
                  </template>
                  <span v-else class="text-gray-400">-</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column
              prop="realAmount"
              label="实际结算"
              width="120"
              align="center"
            >
              <template #default="{ row }">
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
              </el-table-column>

            <el-table-column
              prop="orderStatus"
              label="状态"
              width="90"
              align="center"
            >
              <template #default="{ row }">
                <DictTag :options="order_status" :value="row.orderStatus" />
              </template>
            </el-table-column>

            <el-table-column
              label="操作"
              width="100"
              align="center"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  v-if="row.orderStatus === 6"
                  type="success"
                  size="small"
                  @click="handleCancelAbnormal(row)"
                >
                  取消异常
                </el-button>
                <el-button
                  v-else-if="[0, 1, 2, 3, 4, 7].includes(row.orderStatus)"
                  type="danger"
                  size="small"
                  @click="handleMarkAbnormal(row)"
                >
                  标记异常
                </el-button>
                <span v-else class="text-gray-400 text-xs">-</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 底部固定分页组件 -->
        <div class="flex-shrink-0 pt-3 flex justify-end">
          <el-pagination
            v-model:current-page="orderQuery.pageNo"
            v-model:page-size="orderQuery.pageSize"
            :total="totalOrders"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            size="small"
            background
            @current-change="handlePageChange"
            @size-change="handleSizeChange"
          />
        </div>
      </div>
    </div>

    <!-- 挂载订单异常处理弹窗 -->
    <AbnormalDialog ref="abnormalDialogRef" @success="fetchOrders" />
  </el-dialog>
</template>

<style lang="scss" scoped>
.order-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }

  :deep(.el-tabs__item) {
    height: 34px;
    font-size: 13px;
    line-height: 34px;
  }
}
</style>
