<script setup lang="ts">
import { computed, nextTick, reactive, ref,watch } from "vue";

import {
  CircleClose,
  Refresh,
  Search,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

import {
  getPlatUserPageApi,
  type User,
  type UserPageParams,
} from "#/api/system/user";

interface Props {
  modelValue?: User[]; // 已选中的用户列表
  placeholder?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  placeholder: "点击选择成员",
  disabled: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: User[]): void;
  (e: "change", value: User[]): void;
}>();

const dialogVisible = ref(false);
const loading = ref(false);
const memberList = ref<User[]>([]);
const total = ref(0);
const selectedMembers = ref<User[]>([]);
const tableRef = ref();

// 查询参数
const queryParams = reactive<UserPageParams>({
  pageNo: 1,
  pageSize: 10,
  userName: undefined,
  nickName: undefined,
  phone: undefined,
  status: undefined,
});

// 行 key 确保唯一
const rowKey = (row: User) => row.userId;

const displayNames = computed(() => {
  if (!props.modelValue || props.modelValue.length === 0) return "";
  return props.modelValue.map((m) => m.userName || m.nickName).join("，");
});

// 加载成员列表
async function loadMemberList() {
  try {
    loading.value = true;
    const res = await getPlatUserPageApi(queryParams);
    memberList.value = res.records || [];
    total.value = res.total || 0;

    // 🔥 核心 Bug 修复：解决跨页切换和引用不同造成的回显失效
    await nextTick();
    if (tableRef.value && selectedMembers.value.length > 0) {
      // 找出当前页中，userId 存在于已选列表中的行，强行打勾
      memberList.value.forEach((row) => {
        const isSelected = selectedMembers.value.some(
          (m) => m.userId === row.userId
        );
        if (isSelected) {
          // 这里通过第二个参数确保是勾选状态，且不会触发重复累加
          tableRef.value.toggleRowSelection(row, true);
        }
      });
    }
  } catch (error) {
    console.error("加载成员列表失败：", error);
    ElMessage.error("加载成员列表失败");
  } finally {
    loading.value = false;
  }
}

// 在弹窗关闭时，强行重置左侧表格的勾选状态，恢复到外部传入的真实状态
function resetTableSelection() {
  if (tableRef.value) {
    // 1. 先把当前表格里的所有勾选清空
    tableRef.value.clearSelection();
    
    // 2. 如果外部原本就有选中的人，重新恢复它们的勾选
    const currentModelValue = props.modelValue || [];
    if (currentModelValue.length > 0 && memberList.value.length > 0) {
      memberList.value.forEach((row) => {
        const isSelected = currentModelValue.some((m) => m.userId === row.userId);
        if (isSelected) {
          tableRef.value.toggleRowSelection(row, true);
        }
      });
    }
  }
}

// 打开弹窗
async function openDialog() {
  if (props.disabled) return;
  dialogVisible.value = true;
  // 深拷贝外部传入的值，防止未点确定就污染外部数据
  selectedMembers.value = [...(props.modelValue || [])];
  await loadMemberList();
}

// 搜索
function handleSearch() {
  queryParams.pageNo = 1;
  loadMemberList();
}

// 重置搜索
function resetSearch() {
  queryParams.userName = undefined;
  queryParams.nickName = undefined;
  queryParams.phone = undefined;
  queryParams.status = undefined;
  queryParams.pageNo = 1;
  loadMemberList();
}

// 表格勾选变动事件
function handleSelectionChange(selection: User[]) {
  // 因为开启了 reserve-selection，这里的 selection 会自动包含跨页勾选的所有完整对象
  selectedMembers.value = selection;
}

// 移除右侧已选面板中的某个人（联动取消表格勾选）
function handleRemoveSelected(user: User) {
  selectedMembers.value = selectedMembers.value.filter(
    (m) => m.userId !== user.userId
  );
  // 同步取消左侧表格对应的勾选状态
  const targetRow = memberList.value.find((row) => row.userId === user.userId);
  if (targetRow && tableRef.value) {
    tableRef.value.toggleRowSelection(targetRow, false);
  }
}

// 确认选择
function confirmSelect() {
  emit("update:modelValue", selectedMembers.value);
  emit("change", selectedMembers.value);
  dialogVisible.value = false;
}

// 清空所有成员
function clearMembers() {
  selectedMembers.value = [];
  if (tableRef.value) {
    tableRef.value.clearSelection();
  }

  emit("update:modelValue", []);
  emit("change", []);
}

// 监听外部变化
watch(
  () => props.modelValue,
  (newVal) => {
    selectedMembers.value = [...(newVal || [])];
  },
  { deep: true }
);
</script>

<template>
  <div class="w-full">
    <el-input
      type="textarea"
      :rows="4"
      :model-value="displayNames"
      :placeholder="placeholder"
      readonly
      @click="openDialog"
      :disabled="disabled"
    />

    <el-dialog
      v-model="dialogVisible"
      title="选择组织成员"
      width="1000px"
      append-to-body
      class="rounded-xl overflow-hidden shadow-2xl"
      @close="resetTableSelection"
    >
      <div class="flex gap-4 min-h-[500px]">
        <div class="flex-1 flex flex-col min-w-0">
          <el-form
            :inline="true"
            :model="queryParams"
            class="flex flex-wrap gap-2 items-center mb-3"
          >
            <el-form-item class="!mb-0 !mr-0">
              <el-input
                v-model="queryParams.userName"
                placeholder="用户名"
                clearable
                style="width: 180px"
                @keyup.enter="handleSearch"
              >
                <template #prefix>
<span class="text-xs text-gray-400">用户:</span>
</template>
              </el-input>
            </el-form-item>

            <el-form-item class="!mb-0 !mr-0">
              <el-input
                v-model="queryParams.nickName"
                placeholder="昵称"
                clearable
                style="width: 180px"
                @keyup.enter="handleSearch"
              >
                <template #prefix>
<span class="text-xs text-gray-400">昵称:</span>
</template>
              </el-input>
            </el-form-item>

            <el-form-item class="!mb-0 !mr-0">
              <el-input
                v-model="queryParams.phone"
                placeholder="手机号"
                clearable
                style="width: 180px"
                @keyup.enter="handleSearch"
              >
                <template #prefix>
<span class="text-xs text-gray-400">手机:</span>
</template>
              </el-input>
            </el-form-item>

            <el-form-item class="!mb-0 !mr-0 flex items-center gap-1">
              <el-button
                type="primary"
                :icon="Search"
                circle
                @click="handleSearch"
              />
              <el-button :icon="Refresh" circle @click="resetSearch" />
            </el-form-item>
          </el-form>

          <div
            class="flex-1 border border-slate-100 dark:border-zinc-800 rounded-xl overflow-hidden"
          >
            <el-table
              ref="tableRef"
              :data="memberList"
              v-loading="loading"
              @selection-change="handleSelectionChange"
              :row-key="rowKey"
              height="400"
              stripe
            >
              <el-table-column
                type="selection"
                width="50"
                align="center"
                :reserve-selection="true"
              />
              <el-table-column
                prop="userId"
                label="ID"
                width="70"
                align="center"
                class-name="font-mono text-gray-400 text-xs"
              />
              <el-table-column
                prop="userName"
                label="用户名"
                min-width="110"
                show-overflow-tooltip
              />
              <el-table-column
                prop="nickName"
                label="昵称"
                min-width="110"
                show-overflow-tooltip
              />
              <el-table-column
                prop="phone"
                label="手机号"
                width="125"
                align="center"
              />
              <el-table-column
                prop="status"
                label="状态"
                width="80"
                align="center"
              >
                <template #default="{ row }">
                  <el-tag
                    :type="row.status === 0 ? 'success' : 'danger'"
                    size="small"
                    round
                    effect="light"
                  >
                    {{ row.status === 0 ? "启用" : "禁用" }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="flex justify-end mt-3">
            <el-pagination
              v-model:current-page="queryParams.pageNo"
              v-model:page-size="queryParams.pageSize"
              :total="total"
              size="small"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @size-change="loadMemberList"
              @current-change="loadMemberList"
            />
          </div>
        </div>

        <div
          class="w-60 border-l border-slate-100 dark:border-zinc-800 pl-4 flex flex-col"
        >
          <div
            class="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-zinc-800"
          >
            <span
              class="text-xs font-semibold text-gray-700 dark:text-gray-300"
            >
              已选择成员 (<span class="text-blue-500 font-bold font-mono">{{
                selectedMembers.length
              }}</span>)
            </span>
            <button
              v-if="selectedMembers.length > 0"
              @click="clearMembers"
              class="text-[11px] text-red-500 hover:text-red-600 font-medium bg-transparent border-none cursor-pointer"
            >
              清空全部
            </button>
          </div>

          <div
            class="flex-1 overflow-y-auto max-h-[440px] pr-1 flex flex-col gap-1.5"
          >
            <div
              v-for="user in selectedMembers"
              :key="user.userId"
              class="flex items-center justify-between px-2 py-1.5 bg-slate-50 hover:bg-slate-100/80 dark:bg-zinc-900 rounded-lg text-xs group transition-colors"
            >
              <div class="flex items-center gap-2 min-w-0">
                <div
                  class="w-5 h-5 rounded-md bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0"
                >
                  {{ (user.nickName || user.userName || "员").slice(-1) }}
                </div>
                <span
                  class="truncate font-medium text-gray-700 dark:text-gray-300"
                  >{{ user.nickName || user.userName }}</span>
              </div>
              <el-icon
                class="text-gray-400 hover:text-red-500 cursor-pointer text-sm shrink-0"
                @click="handleRemoveSelected(user)"
              >
                <CircleClose />
              </el-icon>
            </div>

            <el-empty
              v-if="selectedMembers.length === 0"
              description="请从左侧勾选"
              :image-size="60"
              class="!pt-12"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <div
          class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800"
        >
          <el-button class="rounded-lg px-4" @click="dialogVisible = false">
取消
</el-button>
          <el-button
            type="primary"
            class="rounded-lg px-5 shadow-sm"
            @click="confirmSelect"
            >
确定
</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
