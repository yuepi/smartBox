<script lang="ts" setup>
import { ref } from "vue";
import { ElMessage } from "element-plus";
import { deviceUpgradeApi } from "#/api/device/device";

const emit = defineEmits(["success"]);

const visible = ref(false);
const submitting = ref(false);
const deviceId = ref<number>();
const currentVersion = ref("1.0.0");
const targetVersion = ref("");

function open(row: any) {
  visible.value = true;
  deviceId.value = row.deviceId;
  currentVersion.value = row.firmwareVersion || "1.0.0";
  targetVersion.value = "";
}

async function handleUpgrade() {
  if (!targetVersion.value) return ElMessage.warning("请输入或者选择升级的目标版本号");
  if (!deviceId.value) return;
  try {
    submitting.value = true;
    await deviceUpgradeApi({
      deviceId: deviceId.value,
      version: targetVersion.value
    });
    ElMessage.success("OTA升级指令发布成功，等待网关握手下载");
    visible.value = false;
    emit("success");
  } catch {
  } finally {
    submitting.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="空中下载技术 (OTA) 固件远程升级" width="400px" append-to-body class="!rounded-lg">
    <div class="p-2 flex flex-col gap-3">
      <div class="text-xs text-gray-500 bg-amber-50 border border-amber-100 p-2 rounded">
        警告：下发强制升级指令将触发终端芯片重启，请确保设备当时无高优运行中事务。
      </div>
      <div class="flex justify-between text-sm border-b border-gray-50 pb-2">
        <span class="text-gray-400">当前固件版本:</span>
        <span class="font-semibold text-gray-700">v{{ currentVersion }}</span>
      </div>
      <div class="flex flex-col gap-1 mt-1">
        <span class="text-xs font-medium text-gray-500">升级目标版本号:</span>
        <el-input v-model="targetVersion" size="small" placeholder="请输入完整版本号如: 1.0.8" />
      </div>
    </div>
    <template #footer>
      <el-button size="small" @click="visible = false">取消</el-button>
      <el-button size="small" type="primary" :loading="submitting" @click="handleUpgrade">即刻推送升级</el-button>
    </template>
  </el-dialog>
</template>
