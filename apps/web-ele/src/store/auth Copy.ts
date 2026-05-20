import type { Recordable, UserInfo } from '@vben/types';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { ElNotification } from 'element-plus';
import { defineStore } from 'pinia';

import { getAccessCodesApi, getUserInfoApi, loginApi, logoutApi } from '#/api';
import { $t } from '#/locales';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);

  /**
   * 异步处理登录操作
   * Asynchronously handle the login process
   * @param params 登录表单数据
   */
  async function authLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    // 异步处理用户登录操作并获取 accessToken
    let userInfo: null | UserInfo = null;
    try {
      loginLoading.value = true;

      const loginParams = {
        authAccount: params.username,
        authSecret: params.password,
        authType: 0,
        userType: 0  
      };

      const accessToken = await loginApi(loginParams);

      // 如果成功获取到 accessToken
      if (accessToken) {
        // 将 accessToken 存储到 accessStore 中
        accessStore.setAccessToken(accessToken);

        // 获取用户信息并存储到 accessStore 中
        // const [fetchUserInfoResult, accessCodes] = await Promise.all([
        //   fetchUserInfo(),
        //   // 使用模拟权限码数据（实际项目中应该从接口获取）
        //   getAccessCodesApi(),
        // ]);

        // userInfo = fetchUserInfoResult;

        // 3. 手动伪造用户信息和权限码
        userInfo = {
          realName: '管理员',
          userId: '1',
          avatar: '',
          roles: ['super'],
          homePath: '/dashboard', // 登录后跳转的页面
        } as any;
        const accessCodes = ['*']; // '*' 代表拥有所有权限码，直接跳过按钮权限检查

        userStore.setUserInfo(userInfo);
        accessStore.setAccessCodes(accessCodes);

        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
        } else {
          onSuccess
            ? await onSuccess?.()
            : await router.push(
              userInfo.homePath || preferences.app.defaultHomePath,
            );
        }

        if (userInfo?.realName) {
          ElNotification({
            message: `${$t('authentication.loginSuccessDesc')}:${userInfo?.realName}`,
            title: $t('authentication.loginSuccess'),
            type: 'success',
          });
        }
      }
    } finally {
      loginLoading.value = false;
    }

    return {
      userInfo,
    };
  }

  async function logout(redirect: boolean = true) {
    try {
      await logoutApi();
    } catch {
      // 不做任何处理
    }
    resetAllStores();
    accessStore.setLoginExpired(false);

    // 回登录页带上当前路由地址
    await router.replace({
      path: LOGIN_PATH,
      query: redirect
        ? {
          redirect: encodeURIComponent(router.currentRoute.value.fullPath),
        }
        : {},
    });
  }

  async function fetchUserInfo() {
    // const userInfo = await getUserInfoApi();
    // 直接返回一个假数据
    const userInfo = {
      realName: '管理员',
      roles: ['super'],
      homePath: '/dashboard', // 登录后跳转的页面
    } as any;
    userStore.setUserInfo(userInfo);
    return userInfo;
  }

  function $reset() {
    loginLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    fetchUserInfo,
    loginLoading,
    logout,
  };
});