import type { ModuleInfo } from './index.d'

// 星期
export const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 主题名称与副标题名称
export const title = '智能回收箱监控平台'
export const subtitle = ['设备总数: 524', '在线率: 94.2%', '智能回收系统 v1.0']

export const moduleInfo: ModuleInfo = [
  // 中间的几个模块
  {
    name: '回头垃圾分类',
    icon: 'icon-chart-bar',
  },
  {
    name: '区域回收数据',
    icon: 'icon-tongji4',
  },
  {
    name: '回收品类分析',
    icon: 'icon-align-left',
  },
  {
    name: '回收箱状态排行',
    icon: 'icon-zhibiao2',
  },
  // 底部两个模块
  {
    name: '日回收量趋势',
    icon: 'icon-vector',
  },
  {
    name: '设备故障与维修统计',
    icon: 'icon-fenxi7',
  },
]
