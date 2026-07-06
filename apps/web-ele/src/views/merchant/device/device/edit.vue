<script lang="ts" setup>
import { ref } from "vue";
import { ElMessage } from "element-plus";
import { addDeviceApi, editDeviceApi } from '#/api/device/device';
import type { Device } from '#/api/device/device';
import { getDeviceConfigListApi } from '#/api/device/deviceConfig';
import type { DeviceConfig } from '#/api/device/deviceConfig';
import { getDeviceHatchListApi } from '#/api/device/deviceHatch';
import type { DeviceHatch } from '#/api/device/deviceHatch';
import { getDevicePackageListApi } from '#/api/device/devicePackage';
import type { DevicePackage } from '#/api/device/devicePackage';

const emit = defineEmits(["success"]);

const visible = ref(false);
const title = ref("新增设备");
const submitting = ref(false);
const formRef = ref();

const formData = ref<Partial<Device>>({
  status: 0,
});

// 各类下拉选项源
const configOptions = ref<DeviceConfig[]>([]);
const hatchOptions = ref<DeviceHatch[]>([]);
const packageOptions = ref<DevicePackage[]>([]);

const rules = {
  deviceName: [{ required: true, message: "请输入设备名称", trigger: "blur" }],
  deviceMac: [{ required: true, message: "请输入MAC地址", trigger: "blur" }],
};

// 异步拉取表单所需的字典和配置源
async function loadDictOptions() {
  try {
    const [cfg, htc, pkg] = await Promise.all([
      getDeviceConfigListApi(),
      getDeviceHatchListApi(),
      getDevicePackageListApi(),
    ]);
    configOptions.value = cfg || [];
    hatchOptions.value = htc || [];
    packageOptions.value = pkg || [];
  } catch {
    ElMessage.error("获取辅助配置列表失败");
  }
}

function open(row?: Device) {
  visible.value = true;
  loadDictOptions();
  if (row) {
    title.value = "编辑设备";
    formData.value = { ...row };
  } else {
    title.value = "新增设备";
    formData.value = { status: 0 };
  }
}

async function handleSubmit() {
  await formRef.value?.validate();
  try {
    submitting.value = true;
    if (formData.value.deviceId) {
      await editDeviceApi(formData.value as Device);
      ElMessage.success("保存成功");
    } else {
      await addDeviceApi(formData.value as Device);
      ElMessage.success("新增成功");
    }
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
  <el-dialog v-model="visible" :title="title" width="580px" append-to-body destroy-on-close class="!rounded-lg">
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px" size="small" class="p-2">
      <el-form-item label="设备名称" prop="deviceName">
        <el-input v-model="formData.deviceName" placeholder="请输入设备名称" />
      </el-form-item>
      <el-form-item label="MAC地址" prop="deviceMac">
        <el-input v-model="formData.deviceMac" placeholder="请输入MAC地址" :disabled="!!formData.deviceId" />
      </el-form-item>
      <el-form-item label="设备SN">
        <el-input v-model="formData.deviceSn" placeholder="请输入设备SN" />
      </el-form-item>
      <el-form-item label="设备类型">
        <el-select v-model="formData.configId" placeholder="请选择设备配置" class="w-full">
          <el-option v-for="item in configOptions" :key="item.configId" :label="item.configName" :value="item.configId" />
        </el-select>
      </el-form-item>
      <el-form-item label="孵化套餐">
        <el-select v-model="formData.hatchId" placeholder="请选择孵化配置" class="w-full">
          <el-option v-for="item in hatchOptions" :key="item.hatchId" :label="item.hatchName" :value="item.hatchId" />
        </el-select>
      </el-form-item>
      <el-form-item label="收费套餐">
        <el-select v-model="formData.packageId" placeholder="请选择服务套餐" class="w-full">
          <el-option v-for="item in packageOptions" :key="item.packageId" :label="item.packageName" :value="item.packageId" />
        </el-select>
      </el-form-item>
      <el-form-item label="启用状态">
        <el-radio-group v-model="formData.status">
          <el-radio :value="0">正常</el-radio>
          <el-radio :value="1">禁用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button size="small" @click="visible = false">取消</el-button>
      <el-button size="small" type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
