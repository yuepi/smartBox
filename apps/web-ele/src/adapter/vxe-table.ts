import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { ComponentPropsMap, ComponentType } from './component';

import { h } from 'vue';

import {
  setupVbenVxeTable,
  useVbenVxeGrid as useGrid,
} from '@vben/plugins/vxe-table';

import VxeUIPluginExportXLSX from '@vxe-ui/plugin-export-xlsx';
import { ElButton, ElImage } from 'element-plus';
import ExcelJS from 'exceljs';

import { copyToClipboard, formatRowJson } from '#/utils/copy';

import { useVbenForm } from './form';

setupVbenVxeTable({
  configVxeTable: (vxeUI) => {
    // 注册本地 XLSX 导出插件
    vxeUI.use(VxeUIPluginExportXLSX, {
      ExcelJS,
    });
    vxeUI.setConfig({
      grid: {
        align: 'center',
        border: true,
        columnConfig: {
          maxFixedSize: 8,
          resizable: true,
        },
        minHeight: 180,
        formConfig: {
          // 全局禁用vxe-table的表单配置，使用formOptions
          enabled: false,
        },
        pagerConfig: {
          pageSize: 20,
          pageSizes: [10, 20, 50, 100, 200, 500],
        },
        proxyConfig: {
          autoLoad: true,
          response: {
            result: 'records',
            total: 'total',
            list: 'records',
          },
          showActionMsg: true,
          showResponseMsg: false,
        },
        rowConfig: {},
        checkboxConfig: {
          highlight: true,
          range: true,
        },
        customConfig: {
          mode: 'drawer',
          storage: true,
          showSortMoveButton: true,
          showSortPutButton: true,
        },
        menuConfig: {
          body: {
            options: [
              [
                {
                  code: 'copyCell',
                  name: '复制单元格数据',
                  prefixIcon: 'vxe-icon-copy',
                },
                {
                  code: 'copyRow',
                  name: '复制整行数据',
                  prefixIcon: 'vxe-icon-copy',
                },
              ],
            ],
          },
        },
        printConfig: {},
        exportConfig: {
          type: 'xlsx',
          modes: ['current', 'all', 'selected'],
          excludeFields: ['seq', 'checkbox', 'action'],
        },
        toolbarConfig: {
          refresh: true,
          export: true,
          print: true,
          zoom: true,
          custom: true,
          customOptions: {
            icon: 'vxe-icon-setting',
          },
        },
        round: true,
        showOverflow: true,
        size: 'large',
      } as VxeTableGridOptions,
    });

    // 表格配置项可以用 cellRender: { name: 'CellImage' },
    vxeUI.renderer.add('CellImage', {
      renderTableDefault(renderOpts, params) {
        const { props } = renderOpts;
        const { column, row } = params;
        const src = row[column.field];
        return h(ElImage, { src, previewSrcList: [src], ...props });
      },
    });

    // 表格配置项可以用 cellRender: { name: 'CellLink' },
    vxeUI.renderer.add('CellLink', {
      renderTableDefault(renderOpts) {
        const { props } = renderOpts;
        return h(
          ElButton,
          { size: 'small', link: true },
          { default: () => props?.text },
        );
      },
    });

    // 这里可以自行扩展 vxe-table 的全局配置，比如自定义格式化
    // vxeUI.formats.add

    // ===== 1. 注册全局右键菜单项：复制当前单元格 =====
    vxeUI.menus.add('copyCell', {
      tableMenuMethod({ row, column }) {
        if (column && row && column.field) {
          const val = row[column.field];
          if (val !== undefined && val !== null && val !== '') {
            copyToClipboard(String(val));
            ElMessage.success('已复制单元格内容');
          } else {
            ElMessage.warning('当前单元格内容为空');
          }
        }
      },
    });

    // ===== 2. 注册全局右键菜单项：复制整行数据 =====
    vxeUI.menus.add('copyRow', {
      tableMenuMethod({ row }) {
        if (row) {
          const cleanJsonString = formatRowJson(row);
          copyToClipboard(cleanJsonString, '整行数据已复制到剪贴板');
        }
      },
    });
  },
  useVbenForm,
});

export const useVbenVxeGrid = <T extends Record<string, any>>(
  ...rest: Parameters<typeof useGrid<T, ComponentType, ComponentPropsMap>>
) => useGrid<T, ComponentType, ComponentPropsMap>(...rest);

export type * from '@vben/plugins/vxe-table';
