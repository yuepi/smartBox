import { requestClient } from '#/api/request';

/** 实时概况 */
export interface OverviewData {
  todayDeliveryWeight: number;
  yesterdayDeliveryWeight: number;
  todayDeliveryCount: number;
  yesterdayDeliveryCount: number;
  todayEarnings: number;
  yesterdayEarnings: number;
  todayCleanBagCount: number;
  yesterdayCleanBagCount: number;
  todayWithdrawAmount: number;
  yesterdayWithdrawAmount: number;
  todayMemberCount: number;
  yesterdayMemberCount: number;
  todayNewMemberCount: number;
  yesterdayNewMemberCount: number;
  todayCleanWeight: number;
  yesterdayCleanWeight: number;
  totalMemberCount: number;
  deviceTotal: number;
}

export function getOverviewApi(params?: {
  endTime?: string;
  startTime?: string;
}) {
  return requestClient.get<OverviewData>('/plat/statistics/overview', {
    params,
  });
}

/** 数据趋势 */
export interface TrendData {
  type: string;
  rangeDays: number;
  total: number;
  trendList: Array<{ date: string; value: number }>;
}

export function getDataTrendApi(params?: {
  rangeDays?: number;
  type?: string;
}) {
  return requestClient.get<TrendData>('/plat/statistics/dataTrend', { params });
}

/** 设备状态 */
export interface DeviceStatusData {
  deviceTotal: number;
  onlineCount: number;
  offlineCount: number;
}

export function getDeviceStatusApi() {
  return requestClient.get<DeviceStatusData>('/plat/statistics/deviceStatus');
}

/** 排行榜 */
export interface RankingItem {
  rank: number;
  name: string;
  phone: string;
  value: number;
}

export interface RankingData {
  type: string;
  rankingList: RankingItem[];
}

export function getRankingApi(params?: {
  endTime?: string;
  limit?: number;
  startTime?: string;
  type?: string;
}) {
  return requestClient.get<RankingData>('/plat/statistics/ranking', { params });
}
