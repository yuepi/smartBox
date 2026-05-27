// constants/tableColumns/system.ts

// ========== 登录日志 ==========
export const LOGIN_LOG_STORAGE_KEY = 'login_log_table_columns';

export const defaultLoginLogColumns: TableColumnConfig[] = [
  { key: 'loginLogId', label: '日志ID', visible: true, width: 80, align: 'center' },
  { key: 'accountName', label: '账号', visible: true, minWidth: 120, align: 'center', showOverflowTooltip: true },
  { key: 'ipAddr', label: '登录IP', visible: true, width: 140, align: 'center' },
  { key: 'loginLocation', label: '地点', visible: true, width: 150, align: 'center', showOverflowTooltip: true },
  { key: 'status', label: '状态', visible: true, width: 100, align: 'center' },
  { key: 'loginTime', label: '登录时间', visible: true, width: 180, align: 'center' },
  { key: 'browser', label: '浏览器', visible: true, width: 120, align: 'center', showOverflowTooltip: true },
  { key: 'os', label: '操作系统', visible: true, width: 120, align: 'center', showOverflowTooltip: true },
  { key: 'msg', label: '操作信息', visible: true, minWidth: 200, align: 'left', showOverflowTooltip: true },
];


// ========== 操作日志 ==========
export const OPER_LOG_STORAGE_KEY = 'oper_log_table_columns';

export const defaultOperLogColumns: TableColumnConfig[] = [
  { key: 'operLogId', label: '操作ID', visible: true, width: 80, align: 'center' },
  { key: 'title', label: '模块标题', visible: true, minWidth: 150, align: 'center', showOverflowTooltip: true },
  { key: 'businessType', label: '业务类型', visible: true, width: 100, align: 'center' },
  { key: 'operAccountName', label: '操作人', visible: true, width: 120, align: 'center' },
  { key: 'operAccountType', label: '操作人类型', visible: true, width: 100, align: 'center' },
  { key: 'operIp', label: '操作IP', visible: true, width: 140, align: 'center' },
  { key: 'operLocation', label: '操作地点', visible: true, width: 150, align: 'center', showOverflowTooltip: true },
  { key: 'operRequestMethod', label: '请求方式', visible: true, width: 100, align: 'center' },
  { key: 'status', label: '状态', visible: true, width: 80, align: 'center' },
  { key: 'costTime', label: '耗时', visible: true, width: 80, align: 'center' },
  { key: 'operUrl', label: '请求URL', visible: false, minWidth: 200, align: 'left', showOverflowTooltip: true },
  { key: 'operParam', label: '请求参数', visible: false, minWidth: 200, align: 'left', showOverflowTooltip: true },
  { key: 'operResultData', label: '返回结果', visible: false, minWidth: 200, align: 'left', showOverflowTooltip: true },
  { key: 'errorMsg', label: '异常信息', visible: false, minWidth: 200, align: 'left', showOverflowTooltip: true },
  { key: 'createTime', label: '操作时间', visible: false, width: 160, align: 'center' },
];

