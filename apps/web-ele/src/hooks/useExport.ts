
import { ref } from 'vue';

import { useUserStore } from '@vben/stores';

import { ElMessage } from 'element-plus';

import { generateExcelApi } from '#/api/common/export';

export interface ExportParams {
  moduleCode: number;      // 功能模块编码
  findCond: Record<string, any>;  // 查询条件
  exportCond: Record<string, any>; // 导出配置（选中的字段等）
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
  PACKAGE:8         //计费标准     
};

// 导出状态枚举
export const ExportStatusMap: Record<number, { label: string; type: string }> = {
  0: { label: '待处理', type: 'info' },
  1: { label: '导出中', type: 'warning' },
  2: { label: '已导出', type: 'success' },
  3: { label: '导出失败', type: 'danger' },
  4: { label: '已取消', type: 'info' },
};


export function useExport(moduleCode: number) {
  const userStore = useUserStore();
  const exporting = ref(false);
  const exportTaskId = ref<null | number>(null);

  /**
   * 执行导出
   * @param findCond 查询条件
   * @param exportCond 导出配置
   */
  const exportData = async (findCond: Record<string, any>, exportCond?: Record<string, any>) => {
    if (exporting.value) {
      ElMessage.warning('已有导出任务进行中，请稍后再试');
      return;
    }

    exporting.value = true;
    try {
      const params = {
        moduleCode,
        merchantId: userStore.userInfo?.merchantId,
        exportCondition: {
          findCond,
          exportCond: exportCond || {},
        },
      };
      
      await generateExcelApi(params);
      ElMessage.success('导出任务已创建，请在通知中心查看进度');
      
      // 触发刷新通知列表
      window.dispatchEvent(new CustomEvent('refresh-export-tasks'));
    } catch (error) {
      console.error('导出失败', error);
      ElMessage.error('创建导出任务失败');
    } finally {
      exporting.value = false;
    }
  };
 

  return {
    exporting,
    exportTaskId,
    exportData,
  };
}
