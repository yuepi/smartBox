import type { Recordable, UserInfo } from "@vben/types";

import { ref } from "vue";
import { useRouter } from "vue-router";

import { LOGIN_PATH } from "@vben/constants";
import { preferences } from "@vben/preferences";
import { resetAllStores, useAccessStore, useTabbarStore,useUserStore } from "@vben/stores";

import { ElMessage, ElNotification } from "element-plus";
import { defineStore } from "pinia";

import { type AuthApi, changeMerchantApi, getUserInfoApi, loginApi, logoutApi } from "#/api";
import { $t } from "#/locales";
import { useDictStore } from '#/store/modules/dict';

export const useAuthStore = defineStore("auth", () => {
   const tabbarStore = useTabbarStore();
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);

  /**
   * 从用户信息中提取权限码
   * 根据后端返回的 list 数组（包含 userId 和 code）提取权限标识
   */
  function extractAccessCodes(userInfo: AuthApi.UserInfoResult): string[] {
    // 超级管理员拥有所有权限
    // if (userInfo.merchantId === 1) {
    //   return [
    //     "system",
    //     "merchant:manage:device",
    //     "device",
    //     "operate",
    //     "member",
    //     "user",
    //   ];
    // }
    // 普通用户从 list 中提取 code
    return userInfo.list?.map((item) => item.code).filter(Boolean) || [];
  }

  /**
   * 转换用户信息为 UserInfo 格式
   */
  function transformUserInfo(userInfo: AuthApi.UserInfoResult): UserInfo {
    const permissions = extractAccessCodes(userInfo);

    return {
      userId: userInfo.personId ? String(userInfo.personId) : "",
      user:userInfo.user,
      realName: userInfo.personName||userInfo.user.nickName || "",
      avatar: userInfo.avatar || "", // 确保 avatar 是字符串
      roles: permissions,
      homePath: "/dashboard",
      merchantId: userInfo.merchantId || 0,
      superAdminFlag: userInfo.superAdminFlag || 0,
      userMerchant: userInfo.userMerchant || [],
    } as any;
  }

  /**
   * 检查用户信息是否有效
   */
  function isValidUserInfo(userInfo: AuthApi.UserInfoResult): boolean {
    return !!(userInfo.personId && userInfo.personId > 0);
    // return true;
  }

  /**
   * 异步处理登录操作
   */
  async function authLogin(params: Recordable<any>, onSuccess?: () => Promise<void> | void) {
    let userInfo: null | UserInfo = null;
    try {
      loginLoading.value = true;

      // 1. 调用登录接口
      const accessToken = await loginApi({
        authAccount: params.username,
        authSecret: params.password,
        authType: 0, // 账号密码登录
        userType: 0, // 后台用户
      });

      if (!accessToken) {
        throw new Error("登录失败");
      }

      // 2. 存储 token
      accessStore.setAccessToken(accessToken);

      // 3. 获取用户信息（包含权限码）
      const userInfoResult = await getUserInfoApi();
      // const userInfoResult = {
      //   personId: 1,
      //   personName: "测试管理员",
      //   avatar: "",
      //   superAdminFlag: 1,
      //   merchantId: 1,
      //   userMerchant: [],
      //   // 模拟权限列表
      //   list: [],
      // } as any;

      if (!isValidUserInfo(userInfoResult)) {
        console.error("用户信息无效:", userInfoResult);
        ElMessage.error("获取用户信息失败，请重新登录");
        accessStore.setAccessToken("");
        throw new Error("用户信息无效");
      }

      // 4. 提取权限码
      const accessCodes = extractAccessCodes(userInfoResult);

      // 5. 转换用户信息
      userInfo = transformUserInfo(userInfoResult);

      // 6. 存储用户信息和权限码
      userStore.setUserInfo(userInfo);
      accessStore.setAccessCodes(accessCodes);

      // 7. 处理登录成功后的跳转
      if (accessStore.loginExpired) {
        accessStore.setLoginExpired(false);
      } else {
        await (onSuccess ? onSuccess() : router.push(userInfo.homePath || preferences.app.defaultHomePath));
      }

      // 8. 显示欢迎通知
      if (userInfo?.realName) {
        ElNotification({
          message: `${$t("authentication.loginSuccessDesc")}: ${userInfo.realName}`,
          title: $t("authentication.loginSuccess"),
          type: "success",
        });
      }
    } finally {
      loginLoading.value = false;
    }

    return { userInfo };
  }

  /**
   * 切换商户
   */
  async function changeMerchant(merchantId: number) {
    try {
      await changeMerchantApi(merchantId);

      // 清空字典缓存
      useDictStore().clearDict();

              // 关闭所有标签页（传入 router 实例）
      await tabbarStore.closeAllTabs(router);

      // 切换成功后重新获取用户信息
      const userInfoResult = await getUserInfoApi();

      if (!isValidUserInfo(userInfoResult)) {
        ElMessage.error("获取商户信息失败");
        throw new Error("用户信息无效");
      }
      const accessCodes = extractAccessCodes(userInfoResult);
      const userInfo = transformUserInfo(userInfoResult);

      userStore.setUserInfo(userInfo);
      accessStore.setAccessCodes(accessCodes);

      window.location.reload();
      await router.push('/analytics');

    } catch (error) {
      console.error("切换商户失败", error);
      throw error;
    }
  }

  /**
   * 退出登录
   */
  async function logout(redirect: boolean = true) {
    try {
      await logoutApi();

       // 清空字典缓存
      useDictStore().clearDict();
    } catch {
      // 不做任何处理
    }
    resetAllStores();
    accessStore.setLoginExpired(false);

    await router.replace({
      path: LOGIN_PATH,
      query: redirect ? { redirect: encodeURIComponent(router.currentRoute.value.fullPath) } : {},
    });
  }

  /**
   * 获取/刷新用户信息（用于页面刷新后恢复状态）
   */
  async function fetchUserInfo() {
    try {
      const userInfoResult = await getUserInfoApi();

      if (!isValidUserInfo(userInfoResult)) {
        console.error("用户信息无效:", userInfoResult);
        accessStore.setAccessToken("");
        userStore.setUserInfo(null as any);
        throw new Error("用户信息无效");
      }
      const accessCodes = extractAccessCodes(userInfoResult);
      const userInfo = transformUserInfo(userInfoResult);

      userStore.setUserInfo(userInfo);
      accessStore.setAccessCodes(accessCodes);

      return userInfo;
    } catch (error) {
      console.error("获取用户信息失败", error);
      throw error;
    }
  }

  function $reset() {
    loginLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    changeMerchant,
    fetchUserInfo,
    loginLoading,
    logout,
  };
});
