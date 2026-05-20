<!-- components/AreaCascader/index.vue -->
<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";

import { getProvinceCityDistrictApi } from "#/api/common/area";

const props = defineProps({
  modelValue: String,
  disabled: Boolean,
  placeholder: {
    type: String,
    default: "请选择区域",
  },
});

const emit = defineEmits(["update:modelValue", "change"]);

const areaData = ref<any[]>([]);
const loading = ref(false);

// 将带补0的编码转换为后端格式（去掉末尾的0）
function formatToBackend(code: string): string {
  if (!code) return code;
  // 将 110000 转换为 11，将 110100 转换为 1101
  return String(Number.parseInt(code, 10));
}

// 将后端格式转换为组件格式（补齐到6位）
function formatToComponent(code: string): string {
  if (!code) return code;
  // 将 11 转换为 110000，将 1101 转换为 110100
  return String(code).padEnd(6, "0");
}

// 选中的值（转换后用于组件）
const selectedOptions = computed({
  get: () => {
    if (!props.modelValue) return [];
    // 后端格式 -> 组件格式
    return props.modelValue.split(",").filter(Boolean).map(formatToComponent);
  },
  set: (val) => {
    if (!val || val.length === 0) {
      emit("update:modelValue", "");
      emit("change", "");
      return;
    }
    // 组件格式 -> 后端格式
    const backendValue = val.map(formatToBackend).join(",");
    emit("update:modelValue", backendValue);
    emit("change", backendValue);
  },
});

// 加载区域数据
async function loadAreaData() {
  try {
    loading.value = true;
    const res = await getProvinceCityDistrictApi();
    areaData.value = res || [];

    areaData.value = convertToComponentFormat(areaData.value);
  } catch (error) {
    console.error("加载区域数据失败:", error);
  } finally {
    loading.value = false;
  }
}

// 如果返回的是后端格式，转换为组件格式显示
// 将 cityCode 从 11 转换为 110000
function convertToComponentFormat(nodes: any[]): any[] {
  return nodes.map((node: any) => ({
    ...node,
    cityCode: formatToComponent(node.cityCode),
    children: node.children ? convertToComponentFormat(node.children) : [],
  }));
}

// 级联选择器配置
const cascaderProps = {
  value: "cityCode",
  label: "cityName",
  children: "children",
  checkStrictly: true,
};

const handleChange = (value: any) => {
  // 已经在 computed setter 中处理了
  console.log("选中值:", value);
};

onMounted(() => {
  loadAreaData();
});
</script>

<template>
  <el-cascader
    v-model="selectedOptions"
    :options="areaData"
    :props="cascaderProps"
    :disabled="disabled"
    :loading="loading"
    clearable
    :placeholder="placeholder"
    @change="handleChange"
  />
</template>
