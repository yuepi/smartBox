<script setup lang="ts">
import { computed, ref } from "vue";

import { Download, InfoFilled } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

import { useExport } from "#/hooks/useExport";

// 统一对齐系统的表格列配置结构
interface FieldConfig {
  key: string; // 对应系统里的 col.key
  label: string; // 对应系统里的 col.label
}

interface Props {
  moduleCode: number; // 模块编码
  fields: FieldConfig[]; // 可导出的字段列表
  findCond: Record<string, any>; // 查询参数
  btnText?: string; // 按钮文字
}

const props = withDefaults(defineProps<Props>(), {
  btnText: "导出",
});

const dialogVisible = ref(false);
// 核心修复：存储选中的 key 数组
const selectedFields = ref<string[]>([]);

// 全选状态计算
const isAllChecked = computed(() => {
  return (
    selectedFields.value.length === props.fields.length &&
    props.fields.length > 0
  );
});

// 半选状态计算
const isIndeterminate = computed(() => {
  return (
    selectedFields.value.length > 0 &&
    selectedFields.value.length < props.fields.length
  );
});

// 初始化选择：只提取真正可用的有效字段
function initSelectedFields() {
  selectedFields.value = props.fields
    .filter((f) => f.key) // 过滤掉类似操作列、勾选列等没有 key 的项
    .map((f) => f.key);
}

// 全选/全不选切换
function handleCheckAllChange(val: boolean) {
  selectedFields.value = val
    ? props.fields.filter((f) => f.key).map((f) => f.key)
    : [];
}

// 唤起弹窗
function openExportConfig() {
  initSelectedFields();
  dialogVisible.value = true;
}

// 引入通用导出 Hook
const { exporting, exportData } = useExport(props.moduleCode);

// 开始导出
async function handleStartExport() {
  if (selectedFields.value.length === 0) {
    ElMessage.warning("请至少选择一个导出字段");
    return;
  }

  // 核心对齐：把选中的 key 数组封装进 exportCond 发送
  const exportCond = [...selectedFields.value];

  await exportData(props.findCond, exportCond);
  dialogVisible.value = false;
}
</script>

<template>
  <div class="inline-block">
    <el-button :loading="exporting" @click="openExportConfig">
      <template #icon>
            <el-icon v-if="!exporting"><Download /></el-icon>
        </template>
      {{ btnText }}
    </el-button>

    <el-dialog
      v-model="dialogVisible"
      title="导出数据配置"
      width="520px"
      append-to-body
      draggable
      class="rounded-xl overflow-hidden"
    >
      <div class="px-2">
        <div
          class="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
        >
          <el-icon class="!text-blue-500"><InfoFilled /></el-icon>
          <span class="text-xs text-blue-700 dark:text-blue-300">
            请选择需要导出的字段，系统将按照勾选顺序生成 Excel 表格。
          </span>
        </div>

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

        <el-scrollbar max-height="360px">
          <div class="grid grid-cols-2 gap-2 p-1">
            <div
              v-for="field in fields"
              :key="field.key"
              class="flex items-center px-3 py-2 rounded-md border border-transparent transition-all cursor-pointer"
              :class="[
                selectedFields.includes(field.key)
                  ? 'bg-primary/5 border-primary/20 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 hover:bg-gray-50 border-gray-100 dark:border-zinc-800',
              ]"
            >
              <el-checkbox
                v-model="selectedFields"
                :label="field.key"
                class="w-full !mr-0"
              >
                <span
                  class="text-sm transition-colors"
                  :class="
                    selectedFields.includes(field.key)
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

      <template #footer>
        <div class="flex justify-end gap-3 pt-2">
          <el-button plain class="!rounded-md" @click="dialogVisible = false">
取消
</el-button>
          <el-button
            type="primary"
            :loading="exporting"
            class="!rounded-md !px-6 shadow-lg shadow-primary/20"
            @click="handleStartExport"
          >
            <template #icon>
<el-icon v-if="!exporting"><Download /></el-icon>
</template>
            开始导出
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
