import { requestClient } from '#/api/request';

/** 设备分组类型定义 */
export interface DeviceGroup {
  id: number;
  groupName: string;
  remark: string;
  deviceCount: number;
  status: boolean; // true 显示, false 隐藏
  operatorName: string;
  createdTime: string;
}

/** 设备分组分页查询参数 */
export interface DeviceGroupPageParams {
  pageNo?: number;
  pageSize?: number;
  groupName?: string;
  field?: string; // 排序字段：deviceCount | createdTime
  order?: 'asc' | 'desc'; // 排序方向
}

/** 修改状态参数 */
export interface ChangeStatusParams {
  id: number;
  status: boolean;
}

/** 绑定运营商参数 */
export interface BindOperatorParams {
  ids: number[];
  operatorName: string;
}

// 模拟内存数据
let MOCK_LIST: DeviceGroup[] = [
  {
    id: 1,
    groupName: '开发区',
    remark: '王绛龙组',
    deviceCount: 0,
    status: true,
    operatorName: '慧小分运营点1',
    createdTime: '2026-06-13 12:13:44',
  },
  {
    id: 2,
    groupName: '核心商业区',
    remark: '主要设备集散地',
    deviceCount: 12,
    status: true,
    operatorName: '慧小分运营点2',
    createdTime: '2026-06-14 09:30:00',
  },
  {
    id: 3,
    groupName: '高新区科技园',
    remark: '高新技术设备组',
    deviceCount: 5,
    status: false,
    operatorName: '慧小分运营点1',
    createdTime: '2026-05-20 15:20:10',
  },
];

/** 1. 分页查询设备分组列表（支持模拟排序与搜索） */
export async function getDeviceGroupPageApi(params: DeviceGroupPageParams) {
  try {
    return await requestClient.get('/merchant/deviceGroup/page', { params });
  } catch (error) {
    console.warn('后端接口未打通，降级使用 Mock 数据:', error);
    let list = [...MOCK_LIST];

    // 搜索过滤
    if (params?.groupName) {
      list = list.filter((item) => item.groupName.includes(params.groupName!));
    }

    // 模拟服务端排序逻辑
    if (params?.field && params?.order) {
      const { field, order } = params;
      list.sort((a, b) => {
        let valA = a[field as keyof DeviceGroup];
        let valB = b[field as keyof DeviceGroup];

        if (field === 'createdTime') {
          valA = new Date(valA as string).getTime();
          valB = new Date(valB as string).getTime();
        }

        if (order === 'asc') {
          return (valA as number) > (valB as number) ? 1 : -1;
        } else {
          return (valA as number) < (valB as number) ? 1 : -1;
        }
      });
    }

    return {
      records: list,
      total: list.length,
    };
  }
}

/** 2. 新增设备分组 */
export async function addDeviceGroupApi(data: Partial<DeviceGroup>) {
  try {
    return await requestClient.post('/merchant/deviceGroup/add', data);
  } catch {
    const newItem: DeviceGroup = {
      id: Date.now(),
      groupName: data.groupName || '',
      remark: data.remark || '',
      deviceCount: 0,
      status: true,
      operatorName: '未绑定',
      createdTime: new Date().toLocaleString(),
    };
    MOCK_LIST.unshift(newItem);
    return true;
  }
}

/** 3. 修改设备分组 */
export async function editDeviceGroupApi(data: Partial<DeviceGroup>) {
  try {
    return await requestClient.post('/merchant/deviceGroup/edit', data);
  } catch {
    const index = MOCK_LIST.findIndex((item) => item.id === data.id);
    if (index !== -1) {
      MOCK_LIST[index] = { ...MOCK_LIST[index], ...data };
    }
    return true;
  }
}

/** 4. 删除设备分组 */
export async function deleteDeviceGroupApi(id: number) {
  try {
    return await requestClient.post('/merchant/deviceGroup/delete', { id });
  } catch {
    MOCK_LIST = MOCK_LIST.filter((item) => item.id !== id);
    return true;
  }
}

/** 5. 修改分组显示/隐藏状态 */
export async function changeGroupStatusApi(data: ChangeStatusParams) {
  try {
    return await requestClient.post('/merchant/deviceGroup/changeStatus', data);
  } catch {
    const target = MOCK_LIST.find((item) => item.id === data.id);
    if (target) {
      target.status = data.status;
    }
    return true;
  }
}

/** 6. 批量绑定运营商 */
export async function bindOperatorApi(data: BindOperatorParams) {
  try {
    return await requestClient.post('/merchant/deviceGroup/bindOperator', data);
  } catch {
    MOCK_LIST.forEach((item) => {
      if (data.ids.includes(item.id)) {
        item.operatorName = data.operatorName;
      }
    });
    return true;
  }
}
