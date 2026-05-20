// constants/tableColumns/types.ts
export interface TableColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  fixed?: boolean;      // 是否固定显示（不可隐藏）
  width?: number | string;
  minWidth?: number;
  align?: 'center' | 'left' | 'right';
  sortable?: boolean;
  formatter?: (row: any) => string;
  showOverflowTooltip?: boolean;
}
