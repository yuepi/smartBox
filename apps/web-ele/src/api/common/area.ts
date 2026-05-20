// api/common/area.ts
import { requestClient } from '#/api/request';

// 区域数据类型
export interface Area {
  areaId: number;
  parentId: number;
  areaType: string; // 0:国家,1:省,2:城市,3:区县,4=镇
  cityCode: string;
  cityName: string;
  longitude: number;
  latitude: number;
  sort: number;
  status: number;
  children?: Area[];
}

// 查询参数
export interface AreaParams {
  parentCityCode?: string;
}

/**
 * 获取区域列表（级联）
 * @param parentCityCode 父级区域编码，不传查国家列表
 */
export function getAreaListApi(params?: AreaParams) {
  return requestClient.get<Area[]>('/common/area/cache/list', { params });
}

/**
 * 获取中国的所有省（常用场景）
 */
export async function getProvincesApi() {
  // 先获取中国编码，通常中国编码是 '100000' 或类似，根据实际调整
  const chinaCode = '100000'; // 这里需要根据后端实际的中国编码调整
  return getAreaListApi({ parentCityCode: chinaCode });
}

/**
 * 获取中国的所有省、城市、区县（常用场景）
 */
export async function getProvinceCityDistrictApi() {
  return requestClient.get<Area[]>('/common/area/tree/provinceCityDistrict');
}


