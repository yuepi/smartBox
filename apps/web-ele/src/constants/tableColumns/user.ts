// constants/tableColumns/operate.ts

import type { TableColumnConfig } from './types';

// ========== 用户管理 ==========
export const USER_STORAGE_KEY = 'user_table_columns';

export const defaultUserColumns: TableColumnConfig[] = [
  { key: 'userId', label: '用户ID', visible: true, width: 80, align: 'center' },
  { key: 'userName', label: '用户名', visible: true, minWidth: 120, align: 'center', showOverflowTooltip: true },
  { key: 'nickName', label: '昵称', visible: true, minWidth: 120, align: 'center', showOverflowTooltip: true },
  { key: 'email', label: '邮箱', visible: true, minWidth: 180, align: 'center', showOverflowTooltip: true },
  { key: 'sex', label: '性别', visible: true, width: 80, align: 'center' },
  { key: 'superAdminFlag', label: '超管标识', visible: true, width: 100, align: 'center' },
  { key: 'status', label: '状态', visible: true, width: 80, align: 'center' },
  { key: 'createTime', label: '创建时间', visible: false, width: 160, align: 'center' },
];


// ========== 角色管理 ==========
export const ROLE_STORAGE_KEY = 'role_table_columns';

export const defaultRoleColumns: TableColumnConfig[] = [
  { key: 'roleId', label: '角色ID', visible: true, width: 80, align: 'center' },
  { key: 'roleName', label: '角色名称', visible: true, minWidth: 150, align: 'center', showOverflowTooltip: true },
  { key: 'roleCode', label: '角色编码', visible: true, minWidth: 150, align: 'center', showOverflowTooltip: true },
  { key: 'sort', label: '排序', visible: true, width: 80, align: 'center' },
  { key: 'status', label: '状态', visible: true, width: 100, align: 'center' },
  { key: 'createTime', label: '创建时间', visible: false, width: 160, align: 'center' },
  { key: 'remark', label: '备注', visible: false, minWidth: 150, align: 'left', showOverflowTooltip: true },
];

// ========== 菜单管理 ==========
export const MENU_STORAGE_KEY = 'menu_table_columns';

export const defaultMenuColumns: TableColumnConfig[] = [
  { key: 'menuName', label: '菜单名称', visible: true, width: 500, align: 'left', fixed: true, showOverflowTooltip: true },
  { key: 'menuType', label: '类型', visible: true, width: 100, align: 'center' },
  { key: 'platformType', label: '归属', visible: true, width: 200, align: 'center' },
  { key: 'path', label: '路由地址', visible: true, width: 250, align: 'left', showOverflowTooltip: true },
  { key: 'component', label: '组件路径', visible: false, width: 300, align: 'left', showOverflowTooltip: true },
  { key: 'code', label: '权限标识', visible: true, width: 300, align: 'left', showOverflowTooltip: true },
  { key: 'sort', label: '排序', visible: true, width: 100, align: 'center' },
  { key: 'status', label: '状态', visible: true, width: 100, align: 'center' },
];

// ========== 部门管理 ==========
export const DEPT_STORAGE_KEY = 'dept_table_columns';

export const defaultDeptColumns: TableColumnConfig[] = [
  { key: 'deptId', label: '部门ID', visible: true, width: 150, align: 'center' },
  { key: 'deptName', label: '部门名称', visible: true, width: 600, align: 'left', fixed: true },
  { key: 'deptType', label: '部门类型', visible: true, width: 150, align: 'center' },
  { key: 'sort', label: '排序', visible: true, width: 200, align: 'center' },
  { key: 'status', label: '状态', visible: true, width: 200, align: 'center' },
  { key: 'createTime', label: '创建时间', visible: true, width: 300, align: 'center' },
];
