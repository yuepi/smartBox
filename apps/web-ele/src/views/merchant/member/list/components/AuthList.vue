<script lang="ts" setup>
import { ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Delete, Edit, User, Phone, ChatDotRound } from '@element-plus/icons-vue';

import {
  getMemberAuthListApi,
  addMemberAuthApi,
  editMemberAuthApi,
  deleteMemberAuthApi,
  AuthTypeMap,
  type MemberAuth,
} from '#/api/member/memberAuth';

const props = defineProps<{
  memberId: number;
  memberName?: string;
}>();

const loading = ref(false);
const authList = ref<MemberAuth[]>([]);

// 表单弹窗
const formVisible = ref(false);
const formTitle = ref('');
const formData = ref<Partial<MemberAuth>>({});
const formSubmitting = ref(false);

// 认证类型选项
const authTypeOptions = [
  { label: '账号密码', value: 0 },
  { label: '手机号验证码', value: 1 },
  { label: '微信小程序', value: 2 },
];

// 状态选项
const statusOptions = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
];

// 获取认证类型图标
function getAuthTypeIcon(type: number) {
  const map: Record<number, any> = {
    0: User,
    1: Phone,
    2: ChatDotRound,
  };
  return map[type] || User;
}

function getAuthTypeLabel(type: number): string {
  return AuthTypeMap[type]?.label || '未知';
}

function getAuthTypeType(type: number): string {
  return AuthTypeMap[type]?.type || 'info';
}

// 加载认证列表
async function loadAuthList() {
  if (!props.memberId) return;

  loading.value = true;
  try {
    const res = await getMemberAuthListApi(props.memberId);
    authList.value = res || [];
  } catch (error) {
    console.error(error);
    ElMessage.error('加载认证信息失败');
  } finally {
    loading.value = false;
  }
}

// 新增
function handleAdd() {
  formTitle.value = '新增认证方式';
  formData.value = {
    memberId: props.memberId,
    authType: 0,
    status: 0,
  };
  formVisible.value = true;
}

// 编辑
function handleEdit(row: MemberAuth) {
  formTitle.value = '编辑认证方式';
  formData.value = { ...row };
  formVisible.value = true;
}

// 提交
async function handleSubmit() {
  if (!formData.value.authAccount?.trim()) {
    ElMessage.warning('请输入认证账号');
    return;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.memberAuthId ? editMemberAuthApi : addMemberAuthApi;
    await api(formData.value);
    ElMessage.success(formData.value.memberAuthId ? '修改成功' : '新增成功');
    formVisible.value = false;
    await loadAuthList();

  } catch {
    ElMessage.error('操作失败');
  } finally {
    formSubmitting.value = false;
  }
}

// 删除
async function handleDelete(row: MemberAuth) {
  try {
    await ElMessageBox.confirm('确定要删除该认证方式吗？', '提示', { type: 'warning' });
    const res = await deleteMemberAuthApi(row.memberAuthId);
    if (res.code === 200) {
      ElMessage.success('删除成功');
      await loadAuthList();
    } else {
      ElMessage.error(res.message || '删除失败');
    }
  } catch {
    // 取消删除
  }
}

watch(() => props.memberId, () => {
  if (props.memberId) {
    loadAuthList();
  }
}, { immediate: true });

defineExpose({ loadAuthList });
</script>

<template>
  <div class="auth-list">
    <div class="mb-3 flex justify-end">
      <el-button type="primary" size="small" :icon="Plus" @click="handleAdd">
        添加认证方式
      </el-button>
    </div>

    <el-table v-loading="loading" :data="authList" border stripe size="small">
      <el-table-column prop="memberAuthId" label="认证ID" width="80" align="center" />
      <el-table-column prop="authType" label="认证类型" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="getAuthTypeType(row.authType)" size="small">
            {{ getAuthTypeLabel(row.authType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="authAccount" label="认证账号" min-width="180" align="left" />
      <el-table-column prop="authSecret" label="认证密钥" width="150" align="center">
        <template #default="{ row }">
          <span class="text-gray-400">******</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 0 ? 'success' : 'danger'" size="small">
            {{ row.status === 0 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center">
        <template #default="{ row }">
          <el-button link type="primary" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && authList.length === 0" description="暂无认证方式" :image-size="60" />

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="formTitle" width="500px" append-to-body>
      <el-form :model="formData" label-width="90px">
        <el-form-item label="认证类型" required>
          <el-select v-model="formData.authType" placeholder="请选择" style="width: 100%">
            <el-option v-for="item in authTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="认证账号" required>
          <el-input v-model="formData.authAccount" placeholder="请输入认证账号" />
        </el-form-item>
        <el-form-item label="认证密钥">
          <el-input v-model="formData.authSecret" type="password" show-password placeholder="请输入认证密钥" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="formData.status">
            <el-radio v-for="item in statusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>