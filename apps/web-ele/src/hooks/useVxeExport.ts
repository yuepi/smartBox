import { ref } from 'vue';

import { useUserStore } from '@vben/stores';

import { ElMessage } from 'element-plus';

import { generateExcelApi } from '#/api/common/export';


// 模块编码枚举
export const ModuleCodeMap = {
  DEVICE: 1, // 设备管理
  RECYCLE_ORDER: 2, // 回收订单
  MEMBER: 3, // 会员管理
  USER: 4, // 用户管理
  CLEAN_TASK: 5, // 清运任务
  SORT_TASK: 6, // 分拣任务
  FAULT: 7, // 故障管理
  PACKAGE: 8, // 计费套餐
  HATCH: 9, // 仓口管理
  BAG: 10, // 包袋管理
  CONFIG: 11, // 设备配置
  WITHDRAW: 12, // 提现审核
  ROLE: 13, // 角色管理
  MENU: 14, // 菜单管理
  DEPT: 15, // 部门管理
  MERCHANT_RECHARGE: 16, // 充值记录
  MERCHANT_FLOW: 17, // 流水记录
  MERCHANT: 18, // 商户管理
  LOGIN_LOG: 19, // 登录日志
  OPERATE_LOG: 20, // 操作日志
  WAREHOUSE: 21, // 仓库管理
  CUSTOMER: 22, // 客户管理
  STOCK_IN: 23, // 入库管理
  STOCK_OUT: 24, // 出库管理
  STOCK_CURRENT: 25, // 库存查询
  STOCK_CHECK: 26, // 库存盘点
};

export type ModuleCodeType = typeof ModuleCodeMap[keyof typeof ModuleCodeMap];

export function useVxeExport(moduleCode: ModuleCodeType) {
  const userStore = useUserStore();
  const exporting = ref(false);

  /**
   * 执行无弹窗直接导出
   * @param findCond 表单查询参数
   * @param exportFields 排序与勾选后的列名数组 ['field1', 'field2']
   */
  const exportData = async (
    findCond: Record<string, any>,
    exportFields: string[],
  ) => {
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
          exportCond: exportFields, // 传给后端的勾选/排序列名
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
    exportData,
  };
}
