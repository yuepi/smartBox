import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    authAccount: string;   // 账号
    authType: number;      // 认证类型: 0=账号密码,1=手机验证码,2=微信小程序
    authSecret: string;    // 密码/密钥
    userType: number;      // 用户类型: 0=后台用户,1=会员
  }

  /** 登录接口返回值 */
  export type LoginResult = string;

  /** 用户信息响应 */
  export interface UserInfoResult {
    userType: number;
    personId: number;
    personName: string;
    merchantId: number;
    openId: string;
    superAdminFlag: number;  // 商户唯一超管标识: 0=否,1=是
    loginType: string;
    sessionKey: string;
    list: Array<{ code: string; userId: number; }>;  // 用户权限列表
    userMerchant: Array<{
      merchantId: number;
      userId: number;
      userMerchantId: number;
    }>;
  }

  /** 切换商户参数 */
  export interface ChangeMerchantParams {
    merchantId: number;
  }
}

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/login/login', data);
}

/**
 * 获取用户信息（含权限码）
 */
export async function getUserInfoApi() {
  return requestClient.get<AuthApi.UserInfoResult>('/login/getUserInfo');
}

/**
 * 修改用户信息
 */
export async function updateUserInfoApi(data: Partial<User>) {
  return requestClient.post('/login/upInfo', data);
}

/**
 * 切换商户
 */
export async function changeMerchantApi(merchantId: number) {
  return requestClient.get('/login/change/changeMerchant', { params: { merchantId } });
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return requestClient.post('/login/logout');
}

/**
 * 刷新token
 */
export async function refreshTokenApi() {
  return baseRequestClient.post('/login/upToken', { withCredentials: true });
}
