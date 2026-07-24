// constants/tableColumns/types.ts
export interface TableColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  fixed?: boolean;
  width?: number | string;
  minWidth?: number;
  align?: 'center' | 'left' | 'right';
  sortable?: boolean;
  formatter?: (row: any) => string;
  showOverflowTooltip?: boolean;
}
