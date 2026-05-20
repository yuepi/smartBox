<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';

import { computed, onMounted, ref } from 'vue';

import { ProfileBaseSetting } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { ElMessage } from 'element-plus';

import { updateUserInfoApi } from '#/api/core/auth';

const profileBaseSettingRef = ref();
const userStore = useUserStore();
const userInfo = userStore.userInfo;

// 表单 Schema
const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'nickName',
      component: 'Input',
      label: '昵称',
      componentProps: {
        placeholder: '请输入昵称',
      },
    },
    {
      fieldName: 'email',
      component: 'Input',
      label: '邮箱',
      componentProps: {
        placeholder: '请输入邮箱',
      },
    },
    {
      fieldName: 'sex',
      component: 'Select',
      label: '性别',
      componentProps: {
        placeholder: '请选择性别',
        options: [
          { label: '未知', value: 0 },
          { label: '男', value: 1 },
          { label: '女', value: 2 },
        ],
      },
    },
    {
      fieldName: 'phone',
      component: 'Input',
      label: '联系电话',
      componentProps: {
        placeholder: '请输入联系电话',
      },
    },
    {
      fieldName: 'avatar',
      component: 'Input',
      label: '头像',
      componentProps: {
        placeholder: '请输入头像URL',
      },
    },
  ];
});

// 保存回调
async function handleSubmit(values: Record<string, any>) {
  try {
    const submitData = {
      userId: userInfo.userId,
      ...values,
    };
    const res = await updateUserInfoApi(submitData);
    if (res.code === 200) {
      // 更新 store 中的用户信息
      userStore.setUserInfo({
        ...userInfo,
        ...values,
      });
      ElMessage.success('保存成功');
      return true;
    } else {
      ElMessage.error(res.message || '保存失败');
      return false;
    }
  } catch {
    ElMessage.error('保存失败');
    return false;
  }
}

onMounted(() => {
  // 直接从 store 中获取用户信息并填充表单
  if (userInfo.user) {
    profileBaseSettingRef.value?.getFormApi()?.setValues({
      nickName: userInfo.user.nickName,
      email: userInfo.user.email,
      sex: userInfo.user.sex,
      phone: userInfo.user.phone,
      avatar: userInfo.user.avatar,
    });
  }
});

</script>

<template>
  <ProfileBaseSetting
    ref="profileBaseSettingRef"
    :form-schema="formSchema"
    :submit-function="handleSubmit"
    title="账号信息"
    description="管理您的个人账号信息"
  />
</template>
