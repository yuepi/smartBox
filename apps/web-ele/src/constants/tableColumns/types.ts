import type { Alignment } from 'element-plus';

// constants/tableColumns/types.ts
export interface TableColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  fixed?: 'left' | 'right' | false;
  width?: number;
  minWidth?: number;
  align?: Alignment;
  sortable?: boolean;
  formatter?: (row: any) => string;
  showOverflowTooltip?: boolean;
}
