<script lang="ts" setup>
import { ref } from "vue";
import { ElMessage } from "element-plus";
import { Cpu, Connection, Download, Key, SwitchButton, Aim } from "@element-plus/icons-vue";
import { operateDeviceApi } from '#/api/device/device';
import type { Device } from '#/api/device/device';

// 引入次级拆分的小型策略弹窗组件
import IpPortModal from "./ipPortModal.vue";
import UpgradeModal from "./upgradeModal.vue";

const emit = defineEmits(["success"]);

const visible = ref(false);
const currentDevice = ref<Partial<Device>>({});

const ipPortModalRef = ref();
const upgradeModalRef = ref();

function open(row: Device) {
  visible.value = true;
  currentDevice.value = { ...row };
}

// 通用远程控制发送指令
async function sendCommand(commandType: string, val?: number) {
  if (!currentDevice.value.deviceId) return;
  try {
    await operateDeviceApi({
      deviceId: currentDevice.value.deviceId,
      commandType,
      value: val
    });
    ElMessage.success("控制指令已成功下发至网关");
    emit("success");
  } catch {}
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="远程控制与下行调度指令" width="520px" append-to-body class="!rounded-lg">
    <div class="p-2 flex flex-col gap-4">
      <div class="border border-gray-100 rounded-md p-3 bg-slate-50/50">
        <h4 class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
          <el-icon><SwitchButton /></el-icon> 基础电源状态控制
        </h4>
        <div class="flex gap-2">
          <el-button type="success" size="small" @click="sendCommand('power_on')">指令开机</el-button>
          <el-button type="danger" size="small" @click="sendCommand('power_off')">物理关机</el-button>
        </div>
      </div>

      <div class="border border-gray-100 rounded-md p-3 bg-slate-50/50">
        <h4 class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
          <el-icon><Key /></el-icon> 机构阀锁联动
        </h4>
        <div class="flex flex-wrap gap-2">
          <el-button type="primary" plain size="small" @click="sendCommand('open_door', 1)">开启 1 号舱门</el-button>
          <el-button type="primary" plain size="small" @click="sendCommand('open_door', 2)">开启 2 号舱门</el-button>
        </div>
      </div>

      <div class="border border-gray-100 rounded-md p-3 bg-slate-50/50">
        <h4 class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
          <el-icon><Cpu /></el-icon> 核心配置与固件重改
        </h4>
        <div class="flex gap-2">
          <el-button type="warning" size="small" :icon="Connection" @click="ipPortModalRef.open(currentDevice)">切换网关IP/端口</el-button>
          <el-button type="purple" size="small" class="!bg-purple-600 !text-white !border-purple-600" :icon="Download" @click="upgradeModalRef.open(currentDevice)">发布固件升级</el-button>
        </div>
      </div>
    </div>
  </el-dialog>

  <IpPortModal ref="ipPortModalRef" @success="emit('success')" />
  <UpgradeModal ref="upgradeModalRef" @success="emit('success')" />
</template>
