import { requestClient } from '#/api/request';

export interface OnsiteRecycleBookingRule {
  startTime: string;
  endTime: string;
  advanceMinutes: number;
  bookableDays: number;
  status: number;
  version: number;
}

export function getOnsiteRecycleBookingRuleApi() {
  return requestClient.get<OnsiteRecycleBookingRule>(
    '/restful/merchant/onsiteRecycleBookingRule/detail',
  );
}

export function saveOnsiteRecycleBookingRuleApi(
  data: Omit<OnsiteRecycleBookingRule, 'version'> & { expectedVersion: number },
) {
  return requestClient.post<boolean>(
    '/restful/merchant/onsiteRecycleBookingRule/save',
    data,
  );
}
