<script lang="ts" setup>
import type { OnsiteOrder } from '#/api/system/onsiteRecycle';
import { ref } from 'vue';
import {
  ElAlert,
  ElButton,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
} from 'element-plus';
import {
  assignOnsiteWorker,
  getOnsiteDetail,
  getOnsiteWorkers,
  rescheduleOnsite,
} from '#/api/system/onsiteRecycle';

const emit = defineEmits<{ success: [] }>();
const visible = ref(false);
const busy = ref(false);
const mode = ref<'assign' | 'reschedule'>('assign');
const order = ref<OnsiteOrder>();
const workers = ref<Awaited<ReturnType<typeof getOnsiteWorkers>>>([]);
const workerId = ref<number>();
const reserveTime = ref('');
const reason = ref('');

/** 弹窗从接口读取最新原值，保存时校验，拒绝覆盖其他操作人的更改。 */
async function open(id: number, action: 'assign' | 'reschedule') {
  if (busy.value) return;
  busy.value = true;
  try {
    const result = await getOnsiteDetail(id);
    if (result.orderStatus !== 0) {
      ElMessage.warning('仅预约中订单可以派工和改约，请刷新');
      emit('success');
      return;
    }
    workers.value = action === 'assign' ? await getOnsiteWorkers() : [];
    order.value = result;
    mode.value = action;
    workerId.value = result.assignedUserId;
    reserveTime.value = result.reserveTime;
    reason.value = '';
    visible.value = true;
  } catch {
    /* 加载失败不使用列表中的过期数据打开编辑。 */
  } finally {
    busy.value = false;
  }
}

async function save() {
  if (busy.value || !order.value) return;
  if (
    !reason.value.trim() ||
    (mode.value === 'assign' ? !workerId.value : !reserveTime.value)
  ) {
    ElMessage.warning('请完整填写人员或时间以及原因');
    return;
  }
  busy.value = true;
  try {
    if (mode.value === 'assign') {
      await assignOnsiteWorker({
        onsiteOrderId: order.value.onsiteOrderId,
        expectedAssignedUserId: order.value.assignedUserId ?? null,
        assignedUserId: workerId.value!,
        reason: reason.value.trim(),
      });
    } else {
      await rescheduleOnsite({
        onsiteOrderId: order.value.onsiteOrderId,
        expectedReserveTime: order.value.reserveTime,
        reserveTime: reserveTime.value,
        reason: reason.value.trim(),
      });
    }
    visible.value = false;
    ElMessage.success('保存成功');
    emit('success');
  } catch {
    /* 失败保留输入，由统一拦截器说明冲突或校验原因。 */
  } finally {
    busy.value = false;
  }
}
defineExpose({ open });
</script>

<template>
  <ElDialog
    v-model="visible"
    :title="mode === 'assign' ? '指派回收人员' : '修改预约时间'"
    width="560px"
    :close-on-click-modal="false"
    :show-close="!busy"
    :close-on-press-escape="!busy"
  >
    <ElAlert
      type="info"
      :closable="false"
      class="mb-4"
      :title="
        mode === 'assign'
          ? '仅选择当前商户启用人员；拒单转给其他商户后原派工会清空。目前不自动发送通知。'
          : '请先与客户协商确认，北京时间，仅预约中可改约；不调整类目和报价，不自动通知客户。'
      "
    />
    <ElForm label-width="100px" :disabled="busy">
      <ElFormItem label="订单号">{{ order?.orderNo }}</ElFormItem>
      <template v-if="mode === 'assign'">
        <ElFormItem label="当前人员">{{
          order?.assignedUserName || '未指派'
        }}</ElFormItem>
        <ElFormItem label="回收人员" required>
          <ElSelect
            v-model="workerId"
            filterable
            class="w-full"
            placeholder="选择人员"
          >
            <ElOption
              v-for="worker in workers"
              :key="worker.userId"
              :value="worker.userId"
              :label="`${worker.name} ${worker.phone || ''}`"
            />
          </ElSelect>
          <span v-if="workers.length === 0"
            >暂无启用人员，请在现有人员管理中维护。</span
          >
        </ElFormItem>
      </template>
      <template v-else>
        <ElFormItem label="原预约时间">{{ order?.reserveTime }}</ElFormItem>
        <ElFormItem label="新预约时间" required
          ><ElDatePicker
            v-model="reserveTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
        /></ElFormItem>
      </template>
      <ElFormItem label="原因" required
        ><ElInput
          v-model="reason"
          type="textarea"
          :maxlength="100"
          show-word-limit
          :rows="3"
      /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton :disabled="busy" @click="visible = false">取消</ElButton>
      <ElButton type="primary" :loading="busy" @click="save">确认保存</ElButton>
    </template>
  </ElDialog>
</template>
