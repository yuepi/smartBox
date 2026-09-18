<script lang="ts" setup>
import type { HomeOrder, HomeWorker } from '#/api/system/housekeeping';
import { ref } from 'vue';
import {
  ElAlert,
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
} from 'element-plus';
import {
  assignHomeOrderApi,
  completeHomeOrderApi,
  getHomeOrderDetailApi,
  getHomeWorkersApi,
} from '#/api/system/housekeeping';
import UploadImage from '#/components/UploadImage/index.vue';

const emit = defineEmits<{ success: [] }>();
const visible = ref(false);
const busy = ref(false);
const mode = ref<'assign' | 'complete'>('assign');
const order = ref<HomeOrder>();
const workers = ref<HomeWorker[]>([]);
const workerId = ref<number>();
const note = ref('');
const images = ref<string[]>([]);

/** 打开时读取最新订单和本商户人员，不从列表复制可能过期的指派信息。 */
async function open(id: number, action: 'assign' | 'complete') {
  if (busy.value) return;
  busy.value = true;
  try {
    const detail = await getHomeOrderDetailApi(id);
    if (detail.order.status !== (action === 'assign' ? 2 : 3)) {
      ElMessage.warning('订单状态已变化，请刷新列表');
      emit('success');
      return;
    }
    workers.value = action === 'assign' ? await getHomeWorkersApi() : [];
    order.value = detail.order;
    mode.value = action;
    workerId.value = detail.order.assignedUserId;
    note.value = '';
    images.value = [];
    visible.value = true;
  } catch {
    /* 接口失败不打开不完整的编辑表单。 */
  } finally {
    busy.value = false;
  }
}

async function save() {
  if (busy.value || !order.value) return;
  if (
    !note.value.trim() ||
    (mode.value === 'assign' ? !workerId.value : images.value.length === 0)
  ) {
    ElMessage.warning(
      mode.value === 'assign'
        ? '请选择人员并填写派工说明'
        : '请上传完工照片并填写说明',
    );
    return;
  }
  busy.value = true;
  try {
    if (mode.value === 'assign') {
      await assignHomeOrderApi({
        homeOrderId: order.value.homeOrderId,
        expectedAssignedUserId: order.value.assignedUserId ?? null,
        assignedUserId: workerId.value!,
        reason: note.value.trim(),
      });
    } else {
      await ElMessageBox.confirm(
        '确认凭证真实且服务完成？提交后按订单金额结算，不能直接撤销。',
        '完工结算确认',
        { type: 'warning' },
      );
      await completeHomeOrderApi({
        homeOrderId: order.value.homeOrderId,
        note: note.value.trim(),
        imageUrls: images.value,
      });
    }
    ElMessage.success(
      mode.value === 'assign' ? '派工已保存' : '凭证已保存，服务已完成结算',
    );
    visible.value = false;
    emit('success');
  } catch {
    /* 取消或保存失败不清空凭证，避免用户重复上传。 */
  } finally {
    busy.value = false;
  }
}
defineExpose({ open });
</script>

<template>
  <ElDialog
    v-model="visible"
    :title="mode === 'assign' ? '指派服务人员' : '完工凭证与结算'"
    width="620px"
    :close-on-click-modal="false"
    :show-close="!busy"
    :close-on-press-escape="!busy"
  >
    <ElAlert
      class="mb-4"
      type="info"
      :closable="false"
      :title="
        mode === 'assign'
          ? '仅选择本商户现有启用人员；服务开始前可改派，当前不会自动发送派工通知。'
          : '上传实际服务后的现场照片。已开始服务的历史订单无需补派工，也可补凭证完工。'
      "
    />
    <ElForm label-width="100px" :disabled="busy">
      <ElFormItem label="订单号">{{ order?.orderNo }}</ElFormItem>
      <ElFormItem label="当前人员"
        >{{ order?.assignedUserName || '未指派' }}
        {{ order?.assignedUserPhone }}</ElFormItem
      >
      <ElFormItem v-if="mode === 'assign'" label="服务人员" required>
        <ElSelect
          v-model="workerId"
          filterable
          placeholder="请选择已有人员"
          class="w-full"
        >
          <ElOption
            v-for="worker in workers"
            :key="worker.userId"
            :value="worker.userId"
            :label="`${worker.name} ${worker.phone || ''}`"
          />
        </ElSelect>
        <span v-if="workers.length === 0" class="text-gray-500"
          >暂无启用人员，请先在现有人员管理中维护。</span
        >
      </ElFormItem>
      <ElFormItem v-else label="完工照片" required>
        <div :style="busy ? { pointerEvents: 'none' } : undefined">
          <UploadImage v-model="images" :limit="9" :file-size="5" />
        </div>
      </ElFormItem>
      <ElFormItem :label="mode === 'assign' ? '派工说明' : '完工说明'" required>
        <ElInput
          v-model="note"
          type="textarea"
          :maxlength="100"
          show-word-limit
          :rows="3"
        />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton :disabled="busy" @click="visible = false">取消</ElButton>
      <ElButton type="primary" :loading="busy" @click="save">{{
        mode === 'assign' ? '保存派工' : '提交凭证并结算'
      }}</ElButton>
    </template>
  </ElDialog>
</template>
