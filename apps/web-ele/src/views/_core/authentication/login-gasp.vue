<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed, markRaw } from 'vue';

import { AuthenticationLogin, SliderCaptcha, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
    {
      component: markRaw(SliderCaptcha),
      fieldName: 'captcha',
      rules: z.boolean().refine((value) => value, {
        message: $t('authentication.verifyRequiredTip'),
      }),
    },
  ];
});
</script>

<template>
   <div class="login-page-wrapper">
    <!-- 动态背景层（GASP 驱动） -->
    <!-- <LoginBg /> -->

    <!-- 原登录卡片内容，加一个淡入上浮的入场动画类 -->
    <div class="login-card-container">
      <AuthenticationLogin
        :form-schema="formSchema"
        :loading="authStore.loginLoading"
        @submit="authStore.authLogin"
      />
    </div>
  </div>
</template>

<style scoped>
.login-page-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0a0e1a; /* 深色底色，衬托粒子效果 */
}

.login-card-container {
  position: relative;
  z-index: 10;
  opacity: 0;
  transform: translateY(30px);
}
</style>
