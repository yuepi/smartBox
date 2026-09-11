import { requestClient } from '#/api/request';

/**
 * 回收物品项数据结构
 */
export interface RecycleItem {
  /** 主键 ID (新增时不传，编辑/详情/删除必传) */
  recycleItemId?: number;
  /** 品类（例如：电视/冰箱/洗衣机/空调） */
  category?: string;
  /** 品牌 */
  brand?: string;
  /** 物品名称 */
  name?: string;
  /** 图片 URL（单图） */
  imageUrl?: string;
  /** 价格（仅记录） */
  price?: number;
  /** 规格 */
  spec?: string;
  /** 状态：0=启用，1=禁用 */
  status?: number;
  /** 备注 */
  remark?: string;
  /** 使用情况（全新/九成新/有破损等） */
  useCondition?: string;
}

/**
 * 分页与列表查询参数
 */
export interface RecycleItemQueryParams {
  pageNo?: number;
  pageSize?: number;
  category?: string;
  brand?: string;
  name?: string;
  status?: number;
}

/**
 * 分页响应结构
 */
export interface RecycleItemPageResult {
  records: RecycleItem[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

// 基础接口路径前缀
const BASE_URL = '/external/merchant/recycleItem';

/**
 * 1. 分页查询回收物品种类列表
 */
export function getRecycleItemPageApi(params?: RecycleItemQueryParams) {
  return requestClient.get<RecycleItemPageResult>(`${BASE_URL}/page`, { params });
}

/**
 * 2. 不分页获取回收物品种类列表
 */
export function getRecycleItemListApi(params?: RecycleItemQueryParams) {
  return requestClient.get<RecycleItem[]>(`${BASE_URL}/list`, { params });
}

/**
 * 3. 获取回收物品详情
 */
export function getRecycleItemDetailApi(recycleItemId: number) {
  return requestClient.get<RecycleItem>(`${BASE_URL}/detail`, {
    params: { recycleItemId },
  });
}

/**
 * 4. 新增回收物品种类
 */
export function addRecycleItemApi(data: Omit<RecycleItem, 'recycleItemId'>) {
  return requestClient.post<boolean>(`${BASE_URL}/add`, data);
}

/**
 * 5. 编辑回收物品种类
 */
export function editRecycleItemApi(data: RecycleItem) {
  return requestClient.post<boolean>(`${BASE_URL}/edit`, data);
}

/**
 * 6. 删除回收物品种类（逻辑删除）
 */
export function deleteRecycleItemApi(recycleItemId: number) {
  return requestClient.post<boolean>(`${BASE_URL}/delete`, { recycleItemId });
}