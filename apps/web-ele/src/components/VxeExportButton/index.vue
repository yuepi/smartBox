<script setup lang="ts">
import { computed, ref } from 'vue';

import { ArrowDown, Download, InfoFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

import { useVxeExport } from '#/hooks/useVxeExport';

interface FieldConfig {
  key: string;
  label: string;
}

interface Props {
  moduleCode: number; // 模块编码
  findCond?: Record<string, any>; // 查询参数
  btnText?: string; // 按钮文案
  // eslint-disable-next-line vue/require-default-prop
  gridApi?: any; // VXE Grid 实例，用于读取当前表格实际列
  customFields?: FieldConfig[]; // 可选：手动传入的全量备选字段列表（若不传则自动提取表格所有列）
}

const props = withDefaults(defineProps<Props>(), {
  btnText: '导出',
  findCond: () => ({}),
  customFields: () => [],
});

const { exporting, exportData } = useVxeExport(props.moduleCode);

// ===== 忽略的内置功能列 =====
const IGNORE_FIELDS = new Set([
  'action',
  'checkbox',
  'seq',
]);

// ===== 弹窗及字段状态 =====
const dialogVisible = ref(false);
const selectedFields = ref<string[]>([]);
const availableFields = ref<FieldConfig[]>([]);

// 1. 提取当前表格所有有效数据列字段
function getTableDataColumns(): { field: string; title: string }[] {
  if (!props.gridApi?.grid) return [];
  const allColumns = props.gridApi.grid.getColumns() || [];
  return allColumns
    .filter((col: any) => col.field && !IGNORE_FIELDS.has(col.field))
    .map((col: any) => ({
      field: col.field as string,
      title: (col.title || col.field) as string,
    }));
}

// 2. 方式 A：默认直接导出（取当前显示且排序好的列）
async function handleDirectExport() {
  let exportFields: string[] = [];

  if (props.gridApi?.grid) {
    const visibleColumns = props.gridApi.grid.getColumns() || [];
    exportFields = visibleColumns
      .filter(
        (col: any) =>
          col.field && col.visible && !IGNORE_FIELDS.has(col.field),
      )
      .map((col: any) => col.field as string);
  }

  if (exportFields.length === 0) {
    ElMessage.warning('未获取到有效的导出列，请确认表格是否配置了 field');
    return;
  }

  await exportData(props.findCond, exportFields);
}

// 3. 方式 B：打开选择弹窗导出
function openCustomExportDialog() {
  // 优先取 props 传入的字段，没有则从表格实例自动读取全量列
  availableFields.value = props.customFields.length > 0 ? props.customFields : getTableDataColumns().map((col) => ({
      key: col.field,
      label: col.title,
    }));

  if (availableFields.value.length === 0) {
    ElMessage.warning('未能读取到可配置的导出字段');
    return;
  }

  // 默认勾选当前可用的所有字段
  selectedFields.value = availableFields.value.map((f) => f.key);
  dialogVisible.value = true;
}

// ===== 弹窗内部全选/半选逻辑 =====
const isAllChecked = computed(() => {
  return (
    selectedFields.value.length === availableFields.value.length &&
    availableFields.value.length > 0
  );
});

const isIndeterminate = computed(() => {
  return (
    selectedFields.value.length > 0 &&
    selectedFields.value.length < availableFields.value.length
  );
});

function handleCheckAllChange(val: boolean) {
  selectedFields.value = val ? availableFields.value.map((f) => f.key) : [];
}

// 确认弹窗自定义导出
async function handleConfirmCustomExport() {
  if (selectedFields.value.length === 0) {
    ElMessage.warning('请至少选择一个导出字段');
    return;
  }

  await exportData(props.findCond, [...selectedFields.value]);
  dialogVisible.value = false;
}

// 处理下拉菜单点击
function handleCommand(command: string) {
  if (command === 'custom') {
    openCustomExportDialog();
  }
}
</script>

<template>
  <div class="inline-flex items-center mx-2">
    <!-- 下拉组合按钮 -->
    <el-dropdown trigger="click" @command="handleCommand">
      <el-button-group>
        <!-- 主按钮：点击直接无弹窗导出 -->
        <el-button
          :loading="exporting"
          type="primary"
          plain
          @click.stop="handleDirectExport"
        >
          <template #icon>
            <el-icon v-if="!exporting">
              <Download />
            </el-icon>
          </template>
          {{ btnText }}
        </el-button>

        <!-- 触发下拉菜单的小箭头 -->
        <el-button type="primary" plain class="!px-2">
          <el-icon><ArrowDown /></el-icon>
        </el-button>
      </el-button-group>

      <!-- 下拉选项 -->
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="custom">
            <el-icon><InfoFilled /></el-icon>
            自定义勾选字段导出
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 自定义字段选择弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="自定义导出字段"
      width="520px"
      append-to-body
      draggable
      class="rounded-xl overflow-hidden"
    >
      <div class="px-2">
        <div
          class="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
        >
          <el-icon class="!text-blue-500">
            <InfoFilled />
          </el-icon>
          <span class="text-xs text-blue-700 dark:text-blue-300">
            勾选你本次需要导出的列字段，未勾选的字段将不会生成到 Excel 中。
          </span>
        </div>

        <div
          class="flex items-center justify-between px-2 py-2 mb-2 bg-gray-50 dark:bg-zinc-800/50 rounded-md"
        >
          <el-checkbox
            :model-value="isAllChecked"
            :indeterminate="isIndeterminate"
            class="!h-auto"
            @change="(val) => handleCheckAllChange(!!val)"
          >
            <span class="text-sm font-bold text-gray-700 dark:text-gray-200">
              全选所有字段
            </span>
          </el-checkbox>
          <span class="text-xs text-gray-400">
            已选择 {{ selectedFields.length }} / {{ availableFields.length }}
          </span>
        </div>

        <el-scrollbar max-height="320px">
          <div class="grid grid-cols-2 gap-2 p-1">
            <div
              v-for="field in availableFields"
              :key="field.key"
              class="flex items-center px-3 py-2 rounded-md border border-transparent transition-all cursor-pointer"
              :class="[
                selectedFields.includes(field.key)
                  ? 'bg-primary/5 border-primary/20 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 hover:bg-gray-50 border-gray-100 dark:border-zinc-800',
              ]"
            >
              <el-checkbox
                :model-value="selectedFields.includes(field.key)"
                :label="field.key"
                class="w-full !mr-0"
                @update:model-value="
                  (val: any) => {
                    if (val) {
                      selectedFields.push(field.key);
                    } else {
                      const index = selectedFields.indexOf(field.key);
                      if (index > -1) selectedFields.splice(index, 1);
                    }
                  }
                "
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
            @click="handleConfirmCustomExport"
          >
            <template #icon>
              <el-icon v-if="!exporting">
                <Download />
              </el-icon>
            </template>
            确认导出
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
