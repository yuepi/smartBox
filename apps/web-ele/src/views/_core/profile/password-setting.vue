<script setup lang="ts">
import type { VbenFormSchema } from '#/adapter/form';

import { computed } from 'vue';

import { ProfilePasswordSetting, z } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { ElMessage } from 'element-plus';

import { updateUserPasswordApi } from '#/api/system/user';

const userStore = useUserStore();

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'newPassword',
      label: '新密码',
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: '请输入新密码',
      },
      rules: z.string().min(6, { message: '密码长度至少为6位' }),
    },
    {
      fieldName: 'confirmPassword',
      label: '确认密码',
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: '请再次输入新密码',
      },
      dependencies: {
        rules(values) {
          const { newPassword } = values;
          return z
            .string({ required_error: '请再次输入新密码' })
            .min(1, { message: '请再次输入新密码' })
            .refine((value) => value === newPassword, {
              message: '两次输入的密码不一致',
            });
        },
        triggerFields: ['newPassword'],
      },
    },
  ];
});

async function handleSubmit(values: { newPassword: string }) {
  try {
    const userId = userStore.userInfo?.userId;
    if (!userId) {
      ElMessage.error('获取用户信息失败');
      return;
    }
    
    await updateUserPasswordApi({
      userId: Number(userId),
      password: values.newPassword,
    });
    ElMessage.success('密码修改成功');
  } catch {
    ElMessage.error('密码修改失败');
  }
}

</script>

<template>
  <ProfilePasswordSetting
    class="w-1/3"
    :form-schema="formSchema"
    @submit="handleSubmit"
  />
</template>
