<script setup lang="ts">
import { computed } from 'vue';

interface DictOption {
  label: string;
  value: number | string;
  elTagType?: 'danger' | 'info' | 'primary' | 'success' | 'warning';
  elTagClass?: string; // 扩展：支持自定义类名
}

interface Props {
  options: DictOption[];
  value: (number | string)[] | null | number | string | undefined;
  showValue?: boolean;
  separator?: string;
  size?: 'default' | 'large' | 'small';
  effect?: 'dark' | 'light' | 'plain';
}

const props = withDefaults(defineProps<Props>(), {
  options: () => [],
  showValue: true,
  separator: ',',
  size: 'small',
  effect: 'light',
});

// 1. 优化查找性能：使用 Set 并预处理字符串转换
const valuesSet = computed(() => {
  if (props.value === null || props.value === undefined || props.value === '') return new Set();
  
  const rawValues = Array.isArray(props.value) 
    ? props.value 
    : String(props.value).split(props.separator);

  // 注意：不要使用 filter(Boolean)，改为处理空格和无效字符，保留数字 0
  return new Set(rawValues.map(v => String(v).trim()).filter(v => v !== ''));
});

// 2. 提取匹配到的选项
const matchedOptions = computed(() => {
  return props.options.filter(opt => valuesSet.value.has(String(opt.value)));
});

// 3. 提取未匹配的原始值
const unmatchValues = computed(() => {
  if (!props.showValue) return [];
  const matchedSet = new Set(props.options.map(opt => String(opt.value)));
  return [...valuesSet.value].filter(val => !matchedSet.has(val));
});
</script>

<template>
  <div class="dict-tag flex flex-wrap gap-1">
    <template v-for="item in matchedOptions" :key="item.value">
      <el-tag
        :type="item.elTagType || 'info'"
        :size="size"
        :effect="effect"
        :class="item.elTagClass"
        disable-transitions
      >
        {{ item.label }}
      </el-tag>
    </template>

    <template v-if="showValue && unmatchValues.length > 0">
      <el-tag 
        v-for="val in unmatchValues" 
        :key="val" 
        type="info" 
        :size="size" 
        effect="plain"
        class="opacity-70"
      >
        {{ val }}
      </el-tag>
    </template>
  </div>
</template>

<style scoped>
.dict-tag {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px; /* 确保标签之间有间距 */
  vertical-align: middle;
}
</style>
