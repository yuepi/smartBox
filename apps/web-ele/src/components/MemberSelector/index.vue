
<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";

import { CircleClose } from "@element-plus/icons-vue";
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

// 显示名称
const displayNames = computed(() => {
  if (!props.modelValue || props.modelValue.length === 0) return "";
  return props.modelValue.map((m) => m.userName || m.nickName).join("；");
});

// 行key
const rowKey = (row: User) => row.userId;

// 加载成员列表
async function loadMemberList() {
  try {
    loading.value = true;
    const res = await getPlatUserPageApi(queryParams);
    memberList.value = res.records || [];
    total.value = res.total || 0;

    // 回显已选中的成员
    await nextTick();
    if (tableRef.value && selectedMembers.value.length > 0) {
      selectedMembers.value.forEach((member: User) => {
        tableRef.value.toggleRowSelection(member, true);
      });
    }
  } catch (error) {
    console.error("加载成员列表失败：", error);
    ElMessage.error("加载成员列表失败");
  } finally {
    loading.value = false;
  }
}

// 打开弹窗
async function openDialog() {
  if (props.disabled) return;
  dialogVisible.value = true;
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

// 选择变化
function handleSelectionChange(selection: User[]) {
  selectedMembers.value = selection;
}

// 确认选择
function confirmSelect() {
  emit("update:modelValue", selectedMembers.value);
  emit("change", selectedMembers.value);
  dialogVisible.value = false;
}

// 清空已选中的成员
function clearMembers() {
  emit("update:modelValue", []);
  emit("change", []);
}

// 监听外部变化，同步选中状态
watch(
  () => props.modelValue,
  (newVal) => {
    selectedMembers.value = [...(newVal || [])];
  },
  { deep: true }
);
</script>


<template>
  <div>
    <!-- 显示已选中的成员 -->
    <el-input
      type="textarea"
      :rows="4"
      :model-value="displayNames"
      :placeholder="placeholder"
      readonly
      @click="openDialog"
      :disabled="disabled"
    >
      <template #suffix>
        <el-icon
          v-if="!disabled && modelValue?.length"
          class="cursor-pointer"
          @click.stop="clearMembers"
        >
          <CircleClose />
        </el-icon>
      </template>
    </el-input>

    <!-- 成员选择弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="选择成员"
      width="900px"
      append-to-body
    >
      <!-- 搜索栏 -->
      <div class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="用户名">
            <el-input
              v-model="queryParams.userName"
              placeholder="请输入用户名"
              clearable
              style="width: 180px"
            />
          </el-form-item>
          <el-form-item label="昵称">
            <el-input
              v-model="queryParams.nickName"
              placeholder="请输入昵称"
              clearable
              style="width: 180px"
            />
          </el-form-item>
          <el-form-item label="手机号">
            <el-input
              v-model="queryParams.phone"
              placeholder="请输入手机号"
              clearable
              style="width: 180px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 用户列表 -->
      <el-table
        ref="tableRef"
        :data="memberList"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        row-key="userId"
        :row-key="rowKey"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column
          prop="userId"
          label="用户ID"
          width="80"
          align="center"
        />
        <el-table-column prop="userName" label="用户名" min-width="120" />
        <el-table-column prop="nickName" label="昵称" min-width="120" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'success' : 'danger'">
              {{ row.status === 0 ? "启用" : "禁用" }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="queryParams.pageNo"
          v-model:page-size="queryParams.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadMemberList"
          @current-change="loadMemberList"
        />
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSelect">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
