<script lang="ts" setup>
import type { Dept } from '#/api/system/dept';
import type { User } from '#/api/system/user';

import { ref } from 'vue';

import { ElMessage } from 'element-plus';

import { getPlatDeptListApi } from '#/api/system/dept';
import { getPlatRoleListApi } from '#/api/system/role';
import { addPlatUserApi, editPlatUserApi, getPlatUserDetailApi } from '#/api/system/user';
import { useDicts } from '#/hooks/useDict';

const emit = defineEmits(['success']);

// 独立拉取弹窗内部需要的字典数据
const { member_sex, member_status } = useDicts(['member_sex', 'member_status']);

const visible = ref(false);
const title = ref('');
const submitting = ref(false);
const formData = ref<Partial<User>>({});

// 弹窗私有的下拉选项状态
const deptTreeData = ref<Dept[]>([]);
const roleOptions = ref<any[]>([]);

// ✨ 核心提升：内部消化下拉数据加载
async function loadModalOptions() {
  try {
    // 并发请求部门和角色，不阻碍彼此
    const [deptRes, roleRes] = await Promise.all([
      getPlatDeptListApi({ status: 0 }),
      getPlatRoleListApi({ status: 0, pageSize: 100 })
    ]);
    deptTreeData.value = deptRes || [];
    roleOptions.value = (roleRes.records || roleRes || []).map((item: any) => ({
      roleId: item.roleId,
      roleName: item.roleName,
    }));
  } catch (error) {
    console.error('弹窗下拉数据加载失败:', error);
  }
}

// 暴露给父组件调用的打开方法
const open = async (row?: User, defaultDeptId?: number) => {
  // 打开时才去按需加载下拉选项
  loadModalOptions();

  if (row) {
    title.value = '编辑用户';
    try {
      const res = await getPlatUserDetailApi(row.userId);
      formData.value = res || {};
      formData.value.userroles = res.userroles || [];
      formData.value.deptIds = res.deptIds || [];
    } catch {
      ElMessage.error('获取用户信息失败');
      return;
    }
  } else {
    title.value = '新增用户';
    formData.value = {
      userName: '',
      nickName: '',
      password: '123456',
      sex: undefined,
      status: 0,
      superAdminFlag: 0,
      userroles: [],
      deptIds: defaultDeptId ? [defaultDeptId] : [], // 如果左侧树选了部门，新增时自动带入
    };
  }
  visible.value = true;
};

// 统一表单提交
async function handleSubmit() {
  if (!formData.value.userName?.trim()) return ElMessage.warning('请输入用户名');
  if (!formData.value.nickName?.trim()) return ElMessage.warning('请输入昵称');
  
  submitting.value = true;
  try {
    const api = formData.value.userId ? editPlatUserApi : addPlatUserApi;
    await api(formData.value);
    ElMessage.success(formData.value.userId ? '修改成功' : '新增成功');
    visible.value = false;
    emit('success'); // 触发成功事件，通知父组件刷新列表
  } catch {
    ElMessage.error('操作失败');
  } finally {
    submitting.value = false;
  }
}

// 暴露 open 方法给父组件
defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="800px" append-to-body destroy-on-close>
    <el-form :model="formData" label-width="100px">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="用户名" required>
            <el-input v-model="formData.userName" placeholder="请输入用户名" :disabled="!!formData.userId" />
          </el-form-item>
          <el-form-item label="昵称" required>
            <el-input v-model="formData.nickName" placeholder="请输入昵称" />
          </el-form-item>
          <el-form-item label="密码" v-if="!formData.userId">
            <el-input v-model="formData.password" type="password" placeholder="不填则默认为123456" show-password />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="formData.email" placeholder="请输入邮箱" />
          </el-form-item>
          <el-form-item label="头像">
            <el-input v-model="formData.avatar" placeholder="请输入头像URL" />
          </el-form-item>
          <el-form-item label="性别">
            <el-radio-group v-model="formData.sex">
              <el-radio v-for="item in member_sex" :key="item.value" :value="item.value">
                {{ item.label }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="角色">
            <el-select v-model="formData.userroles" multiple filterable placeholder="请选择角色" style="width: 100%">
              <el-option v-for="item in roleOptions" :key="item.roleId" :label="item.roleName" :value="item.roleId" />
            </el-select>
          </el-form-item>
          <el-form-item label="所属部门">
            <el-tree-select
              v-model="formData.deptIds"
              :data="deptTreeData"
              multiple
              clearable
              filterable
              check-strictly
              :props="{ value: 'deptId', label: 'deptName', children: 'children' }"
              :default-expand-level="1"
              placeholder="请选择部门"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="超管标识">
            <el-radio-group v-model="formData.superAdminFlag">
              <el-radio :value="0">否</el-radio>
              <el-radio :value="1">是</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="状态">
            <el-radio-group v-model="formData.status">
              <el-radio v-for="item in member_status" :key="item.value" :value="item.value">
                {{ item.label }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
