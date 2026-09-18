import { requestClient } from '#/api/request';

export interface HomeBookingRule {
  startTime: string;
  endTime: string;
  advanceMinutes: number;
  bookableDays: number;
  status: number;
  version: number;
}

export function getHomeBookingRuleApi() {
  return requestClient.get<HomeBookingRule>(
    '/restful/merchant/homeBookingRule/detail',
  );
}

export function saveHomeBookingRuleApi(
  data: Omit<HomeBookingRule, 'version'> & { expectedVersion: number },
) {
  return requestClient.post<boolean>(
    '/restful/merchant/homeBookingRule/save',
    data,
  );
}
