<script lang="tsx" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';

import { Delete, Document, Edit, Folder, Operation, Plus, Refresh, Search } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox, ElTooltip, ElButton, ElTag } from 'element-plus';

import { deletePlatMenuApi, getPlatMenuListApi, clearMenuCacheApi, refreshMenuCacheApi } from '#/api/system/menu';
import type { Menu } from '#/api/system/menu';
import ColumnSelector from '#/components/ColumnSelector/index.vue';
import { defaultMenuColumns, MENU_STORAGE_KEY } from '#/constants/tableColumns';
import type { TableColumnConfig } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

// 🌟 引入独立拆分出去的弹窗组件
import MenuModal from './MenuModal.vue';

const { hasAccessByCodes } = useAccess();

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultMenuColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Menu[]>([]);
const moreParams = ref(false);

const menuModalRef = ref(); // 🌟 弹窗组件实例
const rowKey = 'menuId';

// 查询参数
const queryParams = reactive({
  menuName: undefined as string | undefined,
  menuType: undefined as number | undefined,
  platformType: undefined as number | undefined,
  status: undefined as number | undefined,
});

// 递归构建树形结构（主列表渲染需要）
function buildTree(menus: Menu[]): Menu[] {
  const menuMap = new Map<number, Menu>();
  const tree: Menu[] = [];

  menus.forEach((menu) => {
    menuMap.set(menu.menuId, { ...menu, children: [] });
  });

  menus.forEach((menu) => {
    const node = menuMap.get(menu.menuId);
    if (node) {
      if (menu.parentId === 0 || !menuMap.has(menu.parentId)) {
        tree.push(node);
      } else {
        const parent = menuMap.get(menu.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      }
    }
  });

  const sortTree = (nodes: Menu[]) => {
    nodes.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        sortTree(node.children);
      }
    });
  };
  sortTree(tree);
  return tree;
}

// 强制刷新表格的 key
const tableKey = ref(0);
watch(visibleColumns, () => {
  tableKey.value++;
});

const tableColumns = computed(() => {
  const cols = visibleColumns.value.length > 0 ? visibleColumns.value : defaultMenuColumns;

  const mappedColumns = cols.map((col) => ({
    key: col.key,
    title: col.label,
    width: col.width,
    align: col.align || 'left',
    cellRenderer: ({ rowData, cells }: { cells: any[]; rowData: Menu }) => {
      switch (col.key) {
        case 'menuName': {
          return (
            <div class="flex w-full items-center gap-1 overflow-hidden">
              {cells}
              {rowData.menuType === 0 && <Folder class="size-4 shrink-0 text-gray-400" />}
              {rowData.menuType === 1 && <Document class="size-4 shrink-0 text-gray-400" />}
              {rowData.menuType === 2 && <Operation class="size-4 shrink-0 text-gray-400" />}
              <span class="truncate">{rowData.menuName}</span>
            </div>
          );
        }
        case 'menuType': {
          const typeMap: Record<number, { text: string; type: string }> = {
            0: { text: '目录', type: 'primary' },
            1: { text: '菜单', type: 'success' },
            2: { text: '按钮', type: 'info' },
          };
          const config = typeMap[rowData.menuType] || { text: '未知', type: 'danger' };
          return <ElTag size="small" type={config.type}>{config.text}</ElTag>;
        }
        case 'platformType': {
          return (
            <ElTag size="small" type={rowData.platformType === 0 ? 'primary' : 'success'}>
              {rowData.platformType === 0 ? '平台' : '商户'}
            </ElTag>
          );
        }
        case 'status': {
          return (
            <ElTag effect="light" round size="small" type={rowData.status === 0 ? 'success' : 'danger'}>
              {rowData.status === 0 ? '启用' : '禁用'}
            </ElTag>
          );
        }
        case 'code':
        case 'component':
        case 'path': {
          const text = rowData[col.key] || '-';
          return <span class="truncate text-sm text-gray-500">{text}</span>;
        }
        default: {
          const text = (rowData as any)[col.key] ?? '-';
          return <span>{text}</span>;
        }
      }
    },
  }));

  return [
    ...mappedColumns,
    {
      key: 'operate',
      title: '操作',
      width: 120, // 🌟 操作宽度从 300 压缩至 120！
      align: 'center',
      fixed: 'right' as const,
      cellRenderer: ({ rowData }: { rowData: Menu }) => (
        <div class="flex w-full justify-center gap-1">
          {/* 1. 新增子菜单按钮 */}
          {hasAccessByCodes(['plat:menu:add']) && (
            <ElTooltip content="新增下级" placement="top" enterable={false}>
              <ElButton icon={Plus} link onClick={() => handleOpenModal({ parentId: rowData.menuId, menuType: 0, platformType: 0, status: 0, sort: 0 })} type="primary" />
            </ElTooltip>
          )}
          {/* 2. 修改按钮 */}
          {hasAccessByCodes(['plat:menu:edit']) && (
            <ElTooltip content="修改" placement="top" enterable={false}>
              <ElButton icon={Edit} link onClick={() => handleOpenModal(rowData)} type="primary" />
            </ElTooltip>
          )}
          {/* 3. 删除按钮 */}
          {hasAccessByCodes(['plat:menu:del']) && (
            <ElTooltip content="删除" placement="top" enterable={false}>
              <ElButton icon={Delete} link onClick={() => handleDelete(rowData)} type="primary" />
            </ElTooltip>
          )}
        </div>
      ),
    },
  ];
});

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getPlatMenuListApi(queryParams);
    tableData.value = buildTree(res || []);
  } catch (error) {
    console.error(error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// 🌟 打开弹窗
function handleOpenModal(row?: Partial<Menu> | Menu) {
  menuModalRef.value?.open(row);
}

// 刷新菜单缓存
async function handleRefreshCache() {
  try {
    await ElMessageBox.confirm('确定要刷新菜单缓存吗？刷新后菜单数据将立即生效。', '提示', { type: 'warning' });
    await refreshMenuCacheApi();
    ElMessage.success('菜单缓存刷新成功');
    loadData();
  } catch {
    // 取消
  }
}

// 清除菜单缓存
async function handleClearCache() {
  try {
    await ElMessageBox.confirm('确定要清除菜单缓存吗？清除后需要重新加载菜单数据。', '提示', { type: 'warning' });
    await clearMenuCacheApi();
    ElMessage.success('菜单缓存清除成功');
    loadData();
  } catch {
    // 取消
  }
}

// --- 删除 ---
async function handleDelete(row: Menu) {
  try {
    await ElMessageBox.confirm(
      `确定要删除菜单"${row.menuName}"吗？删除后可能导致子菜单也被删除。`,
      '提示',
      { type: 'warning' }
    );
    await deletePlatMenuApi(row.menuId);
    ElMessage.success(`成功删除菜单`);
    loadData();
  } catch {
    // 取消
  }
}

function handleQuery() {
  loadData();
}

function resetQuery() {
  queryParams.menuName = undefined;
  queryParams.menuType = undefined;
  queryParams.platformType = undefined;
  queryParams.status = undefined;
  loadData();
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <BaseTableLayout v-model:queryParams="queryParams" v-model:moreParams="moreParams" :loading="loading"
      :is-virtual-table="true" @search="loadData" @reset="resetQuery">
      <template #search-basic>
        <el-form-item>
          <el-input v-model="queryParams.menuName" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery">
            <template #prefix><span class="text-xs text-gray-400 mr-0.5">菜单名称:</span></template>
          </el-input>
        </el-form-item>
      </template>

      <template #search-advanced>
        <el-form-item>
          <el-select v-model="queryParams.menuType" clearable style="width: 200px" placeholder="请选择">
            <template #prefix><span class="text-xs text-gray-400 mr-0.5">类型:</span></template>
            <el-option v-for="item in [{ label: '目录', value: 0 }, { label: '菜单', value: 1 }, { label: '按钮', value: 2 }]"
              :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.platformType" clearable style="width: 200px" placeholder="请选择">
            <template #prefix><span class="text-xs text-gray-400 mr-0.5">归属:</span></template>
            <el-option v-for="item in [{ label: '平台菜单', value: 0 }, { label: '商户菜单', value: 1 }]" :key="item.value"
              :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.status" clearable style="width: 200px" placeholder="请选择">
            <template #prefix><span class="text-xs text-gray-400 mr-0.5">状态:</span></template>
            <el-option v-for="item in [{ label: '启用', value: 0 }, { label: '禁用', value: 1 }]" :key="item.value"
              :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </template>

      <template #toolbar-left>
        <el-button type="primary" plain :icon="Plus" @click="handleOpenModal()" v-access:code="['plat:menu:add']">
          新增菜单
        </el-button>
        <el-button type="warning" plain :icon="Refresh" @click="handleRefreshCache">
          刷新缓存
        </el-button>
        <el-button type="danger" plain :icon="Delete" @click="handleClearCache">
          清除缓存
        </el-button>
        <ExportButton :module-code="ModuleCodeMap.MENU" :fields="visibleColumns" :find-cond="queryParams"
          v-access:code="['plat:menu:export']" />
      </template>

      <template #toolbar-right>
        <ColumnSelector :storage-key="MENU_STORAGE_KEY" :default-columns="defaultMenuColumns"
          @update:columns="handleColumnsUpdate" />
      </template>

      <template #table>
        <div :style="{ height: 'calc(100% - 1px)' }">
          <el-auto-resizer>
            <template #default="{ height, width } = {}">
              <el-table-v2 v-if="height && width" :key="tableKey" :columns="tableColumns" :data="tableData"
                :width="width" :height="height" :row-key="rowKey" expand-column-key="menuName" fixed />
            </template>
          </el-auto-resizer>
        </div>
      </template>
    </BaseTableLayout>

    <MenuModal ref="menuModalRef" @success="loadData" />
  </Page>
</template>

<style scoped></style>
