/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type { RequestClientOptions } from "@vben/request";

import { useAppConfig } from "@vben/hooks";
import { preferences } from "@vben/preferences";
import {
  authenticateResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from "@vben/request";
import { useAccessStore } from "@vben/stores";

import { ElMessage } from "element-plus";

import { useAuthStore } from "#/store";

import { refreshTokenApi } from "./core";

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

let isHandlingTokenExpired = false;

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    console.warn("Access token or refresh token is invalid or expired. ");
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    accessStore.setAccessToken(null);
    if (preferences.app.loginExpiredMode === "modal" && accessStore.isAccessChecked) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  /**
   * 刷新token逻辑
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const resp = await refreshTokenApi();
    const newToken = resp.data;
    accessStore.setAccessToken(newToken);
    return newToken;
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();

      config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers["Accept-Language"] = preferences.app.locale;
      return config;
    },
  });

  // 处理返回的响应数据格式
  // client.addResponseInterceptor(
  //   defaultResponseInterceptor({
  //     codeField: "code",
  //     dataField: "data",
  //     successCode: 200,
  //   }),
  // );
  client.addResponseInterceptor({
  fulfilled: (response) => {
    // 1. 关键判断：如果请求配置要求返回 blob，则不做任何 JSON 处理，直接返回 response 全体
    // 这样你在业务代码里才能拿到 response.data (即 Blob) 和 response.headers (即文件名)
    if (response.config.responseType === 'blob') {
      return response;
    }

    // 2. 对于普通请求，继续使用默认的解析逻辑
    const { data } = response;
    const { code, data: result, message } = data || {};
    
    // 根据你的 successCode 判断，通常是 200 或 0
    if (code === 200) {
      return result;
    }

    // 如果业务 code 不正确，可以在这里抛出错误进入 errorMessage 拦截器
    const error = new Error(message || 'Error');
    (error as any).response = response;
    throw error;
  },
});

  // token过期的处理
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
      isExpired: (response: any) => {
        // response 是 axios 响应对象
        const businessCode = response?.data?.code;
        // 返回 true 表示已过期
        return [10_000, 10_001, 40_101].includes(businessCode);
      },
    }),
  );

  // 通用的错误处理,如果没有进入上面的错误处理逻辑，就会进入这里
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      // 这里可以根据业务进行定制,你可以拿到 error 内的信息进行定制化处理，根据不同的 code 做不同的提示，而不是直接使用 message.error 提示 msg
      // 当前mock接口返回的错误字段是 error 或者 message
      // const responseData = error?.response?.data ?? {};
      // const errorMessage = responseData?.error ?? responseData?.message ?? '';
      const responseData = error?.response?.data ?? {};
      const code = responseData?.code;
      const errorMessage = responseData?.error ?? responseData?.message ?? "";

      if (code === 1000 && !isHandlingTokenExpired) {
        isHandlingTokenExpired = true;
        console.warn("Access token or refresh token is invalid or expired. ");
        const accessStore = useAccessStore();
        const authStore = useAuthStore();
        accessStore.setAccessToken(null);

        if (preferences.app.loginExpiredMode === "modal" && accessStore.isAccessChecked) {
          accessStore.setLoginExpired(true);
        } else {
          authStore.logout();
        }
        return;
      }
      // 如果没有错误信息，则会根据状态码进行提示
      ElMessage.error(errorMessage || msg);
    }),
  );

  return client;
}

export const globalHeaders = () => {
  const accessStore = useAccessStore();
  return {
    Authorization: `Bearer ${accessStore.accessToken}`,
  };
};

export const requestClient = createRequestClient(apiURL, {
  responseReturn: "data",
});

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
