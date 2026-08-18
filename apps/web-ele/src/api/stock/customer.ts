import { requestClient } from '#/api/request';

// ===== 类型定义 =====
export interface Customer {
  customerId: number;
  merchantId: number;
  customerName: string;
  contact: string;
  phone: string;
  address: string;
  status: number; // 0=启用,1=禁用
}

export interface CustomerPageParams {
  pageNo: number;
  pageSize: number;
  customerId?: number;
  merchantId?: number;
  customerName?: string;
  contact?: string;
  phone?: string;
  address?: string;
  status?: number;
}

// ===== API =====

/** 分页查询回收商列表 */
export function getCustomerPageApi(params: CustomerPageParams) {
  return requestClient.get<{ records: Customer[]; total: number }>(
    '/merchant/customer/page',
    { params }
  );
}

/** 列表查询回收商（不分页） */
export function getCustomerListApi(params?: Partial<CustomerPageParams>) {
  return requestClient.get<Customer[]>('/merchant/customer/list', { params });
}

/** 新增回收商 */
export function addCustomerApi(data: Partial<Customer>) {
  return requestClient.post<boolean>('/merchant/customer/add', data);
}

/** 修改回收商 */
export function editCustomerApi(data: Partial<Customer>) {
  return requestClient.post<boolean>('/merchant/customer/edit', data);
}

/** 回收商详情 */
export function getCustomerDetailApi(customerId: number) {
  return requestClient.get<Customer>('/merchant/customer/detail', {
    params: { customerId },
  });
}

/** 删除回收商 */
export function deleteCustomerApi(customerId: number) {
  return requestClient.post<boolean>('/merchant/customer/delete', { customerId });
}
