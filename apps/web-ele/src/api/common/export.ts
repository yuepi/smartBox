// api/common/export.ts
import { requestClient } from '#/api/request';

// 导出任务类型
export interface ExportTask {
  exportId: number;
  exportNo: string;
  moduleCode: number;
  exportStatus: number;  // 0=待处理,1=导出中,2=已导出,3=导出失败,4=已取消
  fileName: string;
  fileAddr: string;
  exportCount: number;
  exportTime: string;
  finishTime: string;
  failReason: string;
}

// 模块编码枚举
export const ModuleCodeMap = {
  DEVICE: 1,        // 设备管理
  RECYCLE_ORDER: 2, // 回收订单
  MEMBER: 3,        // 会员管理
  USER: 4,          // 用户管理
  CLEAN_TASK: 5,    // 清运任务
  SORT_TASK: 6,     // 分拣任务
  FAULT: 7,         // 故障管理
};

// 导出状态枚举
export const ExportStatusMap = {
  0: { label: '待处理', type: 'info' },
  1: { label: '导出中', type: 'warning' },
  2: { label: '已导出', type: 'success' },
  3: { label: '导出失败', type: 'danger' },
  4: { label: '已取消', type: 'info' },
};

/**
 * 生成导出任务
 */
export function generateExcelApi(data: {
  exportCondition: string;
  merchantId?: number;
  moduleCode: number;
}) {
  return requestClient.post('/merchant/exportTask/generateExcel', data);
}

/**
 * 获取导出任务列表
 */
export function getExportTasksApi(params: {
  exportStatus?: number;
  moduleCode?: number;
  pageNo: number;
  pageSize: number;
}) {
  return requestClient.get('/merchant/exportTask/exportTasks', { params });
}

/**
 * 删除导出任务
 */
export function delExportTasksApi(exportId: number) {
  return requestClient.post('/merchant/exportTask/delExportTasks', { exportId });
}

/**
 * 重新导出（失败后重试）
 */
export function onceAgainExportExcelApi(exportId: number) {
  return requestClient.post('/merchant/exportTask/onceAgainExportExcel', { exportId });
}
