<script lang="ts" setup>
import type { MerchantHomeBindRelation } from '#/api/system/homeMerchant';

import { ref } from 'vue';

import { ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  bindHomeMerchantSelfApi,
  getMyHomeMerchantRelationListApi,
  unbindHomeMerchantSelfApi,
} from '#/api/system/homeMerchant';

defineProps<{
  merchantId?: number;
}>();

// 绑定弹窗状态
const dialogVisible = ref(false);
const submitLoading = ref(false);
const formModel = ref({
  housekeepingMerchantId: undefined as number | undefined,
  relationType: 0,
});

const [Grid, gridApi] = useVbenVxeGrid<MerchantHomeBindRelation>({
  gridOptions: {
    keepSource: true,
    height: 'auto',
    id: 'merchant_home_bind_grid',
    columns: [
      { field: 'relationId', title: '关联ID', width: 100 },
      { field: 'housekeepingMerchantId', title: '家政商户ID', width: 130 },
      {
        field: 'housekeepingMerchantName',
        title: '家政商户名称',
        minWidth: 180,
      },
      {
        field: 'relationType',
        title: '关联类型',
        width: 120,
        formatter: ({ cellValue }) => (cellValue === 0 ? '直连关联' : '合作关联'),
      },
      { field: 'createTime', title: '绑定时间', width: 170 },
      {
        field: 'action',
        title: '操作',
        width: 120,
        fixed: 'right',
        slots: { default: 'action' },
      },
    ],
    proxyConfig: {
      ajax: {
        query: async ({ page }) => {
          return await getMyHomeMerchantRelationListApi({
            pageNo: page.currentPage,
            pageSize: page.pageSize,
          });
        },
      },
    },
  },
});

// 打开新增绑定弹窗
function handleOpenBind() {
  formModel.value.housekeepingMerchantId = undefined;
  formModel.value.relationType = 0;
  dialogVisible.value = true;
}

// 提交绑定
async function handleSubmitBind() {
  if (!formModel.value.housekeepingMerchantId) {
    ElMessage.warning('请输入要绑定的家政商户ID');
    return;
  }
  submitLoading.value = true;
  try {
    await bindHomeMerchantSelfApi({
      housekeepingMerchantId: formModel.value.housekeepingMerchantId,
      relationType: formModel.value.relationType,
    });
    ElMessage.success('绑定成功');
    dialogVisible.value = false;
    gridApi.query();
  } finally {
    submitLoading.value = false;
  }
}

// 解绑操作
async function handleUnbind(row: MerchantHomeBindRelation) {
  try {
    await ElMessageBox.confirm(
      `确定要解绑家政商户 (ID: ${row.housekeepingMerchantId}) 吗？`,
      '解绑确认',
      { type: 'warning' },
    );
    await unbindHomeMerchantSelfApi(row.relationId);
    ElMessage.success('解绑成功');
    gridApi.query();
  } catch {
    // 取消解绑
  }
}
</script>

<template>
  <div class="pt-2">
    <Grid>
      <template #toolbar-actions>
        <el-button type="primary" icon="Plus" @click="handleOpenBind">
          绑定家政商户
        </el-button>
      </template>

      <template #action="{ row }">
        <el-button size="small" type="danger" plain @click="handleUnbind(row)">
          解绑
        </el-button>
      </template>
    </Grid>

    <!-- 自助绑定弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="绑定家政商户"
      width="480px"
      append-to-body
    >
      <el-form label-width="110px" class="py-2">
        <el-form-item label="家政商户ID" required>
          <el-input-number
            v-model="formModel.housekeepingMerchantId"
            :min="1"
            class="w-full"
            placeholder="请输入对应家政商户ID"
            controls-position="right"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="handleSubmitBind"
        >
          确认绑定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
