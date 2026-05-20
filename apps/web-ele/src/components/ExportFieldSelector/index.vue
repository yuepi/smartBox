<!-- components/ExportFieldSelector/index.vue -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { Download, InfoFilled } from '@element-plus/icons-vue';
import { ElMessage } from "element-plus";

interface FieldConfig {
  prop: string;
  label: string;
}

interface Props {
  visible: boolean;
  fields: FieldConfig[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  loading: false,
});

const emit = defineEmits<{
  confirm: [selectedFields: string[]];
  "update:visible": [value: boolean];
}>();

const dialogVisible = ref(false);
const selectedFields = ref<string[]>([]);

const isAllChecked = computed(() => {
  return (
    selectedFields.value.length === props.fields.length &&
    props.fields.length > 0
  );
});

const isIndeterminate = computed(() => {
  return (
    selectedFields.value.length > 0 &&
    selectedFields.value.length < props.fields.length
  );
});

function initSelectedFields() {
  selectedFields.value = props.fields.map((f) => f.prop);
}

function handleCheckAllChange(val: boolean) {
  selectedFields.value = val ? props.fields.map((f) => f.prop) : [];
}

function handleConfirm() {
  if (selectedFields.value.length === 0) {
    ElMessage.warning("请至少选择一个导出字段");
    return;
  }
  emit("confirm", selectedFields.value);
  emit("update:visible", false);
}

function handleClose() {
  emit("update:visible", false);
}

watch(
  () => props.visible,
  (newVal) => {
    dialogVisible.value = newVal;
    if (newVal) {
      initSelectedFields();
    }
  }
);

watch(dialogVisible, (newVal) => {
  if (!newVal) {
    emit("update:visible", false);
  }
});
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="导出数据配置"
    width="520px"
    append-to-body
    :show-close="true"
    draggable
    class="rounded-xl overflow-hidden"
    @close="handleClose"
  >
    <div class="px-2">
      <!-- 提示区域 -->
      <div
        class="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
      >
        <el-icon class="!text-blue-500"><InfoFilled /></el-icon>
        <span class="text-xs text-blue-700 dark:text-blue-300">
          请选择需要导出的字段，系统将按照勾选顺序生成 Excel 表格。
        </span>
      </div>

      <!-- 工具栏：全选 -->
      <div
        class="flex items-center justify-between px-2 py-2 mb-2 bg-gray-50 dark:bg-zinc-800/50 rounded-md"
      >
        <el-checkbox
          :model-value="isAllChecked"
          :indeterminate="isIndeterminate"
          @change="handleCheckAllChange"
          class="!h-auto"
        >
          <span class="text-sm font-bold text-gray-700 dark:text-gray-200">全选所有字段</span>
        </el-checkbox>
        <span class="text-xs text-gray-400">
          已选择 {{ selectedFields.length }} / {{ fields.length }}
        </span>
      </div>

      <!-- 字段列表 -->
      <el-scrollbar max-height="360px">
        <div class="grid grid-cols-2 gap-2 p-1">
          <div
            v-for="field in fields"
            :key="field.prop"
            class="flex items-center px-3 py-2 rounded-md border border-transparent transition-all"
            :class="[
              selectedFields.includes(field.prop)
                ? 'bg-primary/5 border-primary/20 shadow-sm'
                : 'bg-white dark:bg-zinc-900 hover:bg-gray-50 border-gray-100 dark:border-zinc-800',
            ]"
          >
            <el-checkbox
              v-model="selectedFields"
              :value="field.prop"
              class="w-full !mr-0"
            >
              <span
                class="text-sm transition-colors"
                :class="
                  selectedFields.includes(field.prop)
                    ? 'text-primary font-medium'
                    : 'text-gray-600'
                "
              >
                {{ field.label }}
              </span>
            </el-checkbox>
          </div>
        </div>
      </el-scrollbar>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="flex justify-end gap-3 pt-2">
        <el-button plain class="!rounded-md" @click="handleClose">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="loading"
          class="!rounded-md !px-6 shadow-lg shadow-primary/20"
          @click="handleConfirm"
        >
          <template #icon>
            <el-icon v-if="!loading"><Download /></el-icon>
          </template>
          开始导出
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
<style scoped lang="scss">
/* 适配选中状态的 Checkbox 动画 */
:deep(.el-checkbox__inner) {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.el-dialog__header) {
  padding-bottom: 16px;
  margin-right: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.el-dialog__body) {
  padding: 20px 24px 10px;
}

:deep(.el-checkbox) {
  height: auto;
  white-space: normal;
}

:deep(.el-checkbox__label) {
  padding-left: 10px;
  line-height: 1.4;
}
</style>
