<script lang="ts" setup>
import type { CascaderProps } from 'element-plus'

import { computed } from 'vue';

import { getAreaListApi, getProvinceCityDistrictApi } from '#/api/common/area';

const props = defineProps({
  modelValue: String,
  // 建议改名为 level，匹配你调用时的传参
  level: {
    type: Number,
    default: 3,  // 0=国家,1=省,2=城市,3=区县
  },
  disabled: Boolean,
  placeholder: {
    type: String,
    default: '请选择区域',
  },
});

const emit = defineEmits(['update:modelValue', 'change']);

// 懒加载配置
const lazyProps: CascaderProps = {
  lazy: true,
  lazyLoad: loadNode,
  value: 'cityCode',
  label: 'cityName',
};

// 选中值处理
const selectedOptions = computed({
  get: () => {
    if (!props.modelValue) return [];
    // 过滤掉空字符串
    return props.modelValue.split(',').filter(Boolean);
  },
  set: (val) => {
    emit('update:modelValue', val?.join(',') || '');
  },
});

// 懒加载节点函数
async function loadNode(node: any, resolve: (nodes: any[]) => void) {
  const { level, value } = node;

  console.log('当前层级:', level, '当前值:', value);

  // 1. 如果已经达到了目标层级，直接返回空，防止组件尝试继续请求
  if (level >= props.level) {
    return resolve([]);
  }
  // 1. 确定 parentCityCode
  // 如果是第一层(level 0)，根据你接口逻辑，传 100000 查中国
  let parentCode = value;
  if (level === 0 && !value) {
    parentCode = '100000'; 
  }

  try {
    const res = await getAreaListApi({ parentCityCode: parentCode });
    const nodes = (res || []).map((item: any) => ({
      cityCode: item.cityCode,
      cityName: item.cityName,
      // 判断下一层是否超过了目标层级
      leaf: level >= (props.level - 1), 
    }));
    
    resolve(nodes);
  } catch (error) {
    console.error('加载区域失败', error);
    resolve([]);
  }
}

const handleChange = (value: any) => {
  emit('change', value?.join(',') || '');
};
</script>

<template>
  <el-cascader
    :key="props.level"
    v-model="selectedOptions"
    :props="lazyProps"
    :disabled="disabled"
    clearable
    :placeholder="placeholder"
    @change="handleChange"
  />
</template>
