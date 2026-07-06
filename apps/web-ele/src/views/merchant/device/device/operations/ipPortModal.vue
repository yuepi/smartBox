<script lang="ts" setup>
import { ref } from "vue";
import { ElMessage } from "element-plus";
import { changeDeviceServerIpPortApi } from "#/api/device/device";

const emit = defineEmits(["success"]);

const visible = ref(false);
const submitting = ref(false);
const formRef = ref();
const deviceId = ref<number>();

const formData = ref({
  serverIp: "",
  serverPort: undefined as number | undefined,
});

const rules = {
  serverIp: [{ required: true, message: "请输入目标定向服务器IP", trigger: "blur" }],
  serverPort: [{ required: true, message: "请输入目标协议开放端口", trigger: "blur" }],
};

function open(row: any) {
  visible.value = true;
  deviceId.value = row.deviceId;
  formData.value = {
    serverIp: row.serverIp || "",
    serverPort: row.serverPort || undefined,
  };
}

async function handleSubmit() {
  await formRef.value?.validate();
  if (!deviceId.value) return;
  try {
    submitting.value = true;
    await changeDeviceServerIpPortApi({
      deviceId: deviceId.value,
      ...formData.value
    });
    ElMessage.success("服务器网关切换指令发布成功");
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
  <el-dialog v-model="visible" title="重定向服务器中继设置" width="400px" append-to-body class="!rounded-lg">
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="90px" size="small" class="p-2">
      <el-form-item label="网关 IP" prop="serverIp">
        <el-input v-model="formData.serverIp" placeholder="例如: 192.168.1.100" />
      </el-form-item>
      <el-form-item label="服务端口" prop="serverPort">
        <el-input-number v-model="formData.serverPort" :min="1" :max="65535" controls-position="right" class="w-full" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button size="small" @click="visible = false">取消</el-button>
      <el-button size="small" type="primary" :loading="submitting" @click="handleSubmit">下发变更</el-button>
    </template>
  </el-dialog>
</template>
