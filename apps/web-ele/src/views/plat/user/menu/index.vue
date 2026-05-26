<script lang="tsx" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Delete, Document, Edit, Folder, Operation, Plus, Refresh, Search } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  addPlatMenuApi,
  clearMenuCacheApi,
  deletePlatMenuApi,
  editPlatMenuApi,
  getPlatMenuDetailApi,
  getPlatMenuListApi,
  type Menu,
  refreshMenuCacheApi,
} from '#/api/system/menu';
import ColumnSelector from '#/components/ColumnSelector/index.vue';
import {
  defaultMenuColumns,
  MENU_STORAGE_KEY,
  type TableColumnConfig,
} from '#/constants/tableColumns';
import { ModuleCodeMap } from "#/hooks/useExport";

const userStore = useUserStore();
const isSuperAdmin = computed(() => userStore.userInfo?.superAdminFlag === 1);
const { hasAccessByCodes } = useAccess();

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultMenuColumns]);
const visibleColumns = computed(() => columnConfig.value.filter((col) => col.visible));

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}
// --- 转换为 el-table-v2 需要的 columns 格式 ---
const tableColumns = computed(() => {
  // 1. 获取当前用户自定义勾选显示的动态列
  const cols = visibleColumns.value.length > 0 ? visibleColumns.value : defaultMenuColumns;

  // 2. 将动态列映射为相应的渲染格式
  const mappedColumns = cols.map((col) => ({
    key: col.key,
    title: col.label,
    width: col.width,
    align: col.align || 'left',
    cellRenderer: ({ rowData, cells }: { cells: any[]; rowData: Menu; }) => {
      switch (col.key) {
        case 'code': {
          return <span class="text-gray-500 text-sm">{rowData.code || '-'}</span>;
        }
        case 'component': {
          return <span class="text-gray-500 text-sm truncate">{rowData.component || '-'}</span>;
        }
        case 'menuName': {
          return (
            <div class="flex items-center gap-1 w-full overflow-hidden">
              {cells} 
              {rowData.menuType === 0 && <Folder class="w-4 h-4 text-gray-400 shrink-0" />}
              {rowData.menuType === 1 && <Document class="w-4 h-4 text-gray-400 shrink-0" />}
              {rowData.menuType === 2 && <Operation class="w-4 h-4 text-gray-400 shrink-0" />}
              <span class="truncate">{rowData.menuName}</span>
            </div>
          );
        }
        case 'menuType': {
          return (
            <el-tag size="small" type={rowData.menuType === 0 ? 'primary' : (rowData.menuType === 1 ? 'success' : 'info')}>
              {rowData.menuType === 0 ? '目录' : (rowData.menuType === 1 ? '菜单' : '按钮')}
            </el-tag>
          );
        }
        case 'path': {
          return <span class="text-gray-500 text-sm truncate">{rowData.path || '-'}</span>;
        }
        case 'platformType': {
          return (
            <el-tag size="small" type={rowData.platformType === 0 ? 'primary' : 'success'}>
              {rowData.platformType === 0 ? '平台' : '商户'}
            </el-tag>
          );
        }
        case 'sort': {
          return <span>{rowData.sort ?? 0}</span>;
        }
        case 'status': {
          return (
            <el-tag effect="light" round size="small" type={rowData.status === 0 ? 'success' : 'danger'}>
              {rowData.status === 0 ? '启用' : '禁用'}
            </el-tag>
          );
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
      width: 300,          // 宽度写死
      align: 'center',
      fixed: 'right', 
      cellRenderer: ({ rowData }: { rowData: Menu }) => (
        <div class="flex justify-center gap-1 w-full">
          {hasAccessByCodes(['plat:menu:add']) && (
            <el-button icon={Plus} link onClick={() => handleAdd(rowData.menuId)} type="primary">
              新增
            </el-button>
          )}
          {hasAccessByCodes(['plat:menu:edit']) && (
            <el-button icon={Edit} link onClick={() => handleEdit(rowData)} type="primary">
              编辑
            </el-button>
          )}
          {hasAccessByCodes(['plat:menu:del']) && (
            <el-button icon={Delete} link onClick={() => handleDelete(rowData)} type="danger">
              删除
            </el-button>
          )}
        </div>
      )
    }
  ];
});
// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Menu[]>([]);

// 表单弹窗控制
const formVisible = ref(false);
const formTitle = ref('');
const formData = ref<Partial<Menu>>({});
const formSubmitting = ref(false);
const expandedRowKeys = ref<string[]>([]);
const rowKey = 'menuId';

// 类型选项
const menuTypeOptions = [
  { label: '目录', value: 0 },
  { label: '菜单', value: 1 },
  { label: '按钮', value: 2 },
];

const platformTypeOptions = [
  { label: '平台菜单', value: 0 },
  { label: '商户菜单', value: 1 },
];

const statusOptions = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
];

// 查询参数
const queryParams = reactive({
  menuName: undefined as string | undefined,
  menuType: undefined as number | undefined,
  platformType: undefined as number | undefined,
  status: undefined as number | undefined,
});

// 刷新菜单缓存
async function handleRefreshCache() {
  try {
    await ElMessageBox.confirm('确定要刷新菜单缓存吗？刷新后菜单数据将立即生效。', '提示', { type: 'warning' });
    await refreshMenuCacheApi();
    ElMessage.success('菜单缓存刷新成功');
    await loadData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('刷新缓存失败');
    }
  }
}

// 清除菜单缓存
async function handleClearCache() {
  try {
    await ElMessageBox.confirm('确定要清除菜单缓存吗？清除后需要重新加载菜单数据。', '提示', { type: 'warning' });
    await clearMenuCacheApi();
    ElMessage.success('菜单缓存清除成功');
    await loadData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清除缓存失败');
    }
  }
}

// 递归构建树形结构
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

// 父级菜单选项
const parentMenuOptions = ref<Menu[]>([]);

async function loadParentMenuOptions() {
  try {
    const res = await getPlatMenuListApi(queryParams);
    const treeMenus = buildTree(res || []);
    parentMenuOptions.value = [
      {
        menuId: 0,
        menuName: '顶级菜单',
        parentId: 0,
        menuType: 0,
        platformType: 0,
        path: '',
        component: '',
        code: '',
        sort: 0,
        status: 0,
        children: []
      } as Menu,
      ...treeMenus
    ];
  } catch (error) {
    console.error(error);
  }
}

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

// --- 新增/编辑 ---
function handleAdd(parentId?: number) {
  formTitle.value = '新增菜单';
  formData.value = {
    parentId: parentId || 0,
    menuType: 0,
    platformType: 0,
    status: 0,
    sort: 0,
  };
  loadParentMenuOptions();
  formVisible.value = true;
}

async function handleEdit(row: Menu) {
  try {
    formTitle.value = '编辑菜单';
    const res = await getPlatMenuDetailApi(row.menuId);
    formData.value = res || {};
    await loadParentMenuOptions();
    formVisible.value = true;
  } catch {
    ElMessage.error('获取菜单信息失败');
  }
}

async function handleSubmit() {
  if (!formData.value.menuName?.trim()) {
    ElMessage.warning('请输入菜单名称');
    return;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.menuId ? editPlatMenuApi : addPlatMenuApi;
    await api(formData.value);
    ElMessage.success(formData.value.menuId ? '修改成功' : '新增成功');
    formVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    formSubmitting.value = false;
  }
}

// --- 删除 ---
async function handleDelete(row?: Menu) {
  let ids: number[] = [];
  let deleteName = '';

  if (row) {
    ids = [row.menuId];
    deleteName = row.menuName || '';
  }

  try {
    await ElMessageBox.confirm(
      row ? `确定要删除菜单"${deleteName}"吗？删除后可能导致子菜单也被删除。` : `确定要删除选中的 ${ids.length} 条菜单吗？`,
      '提示',
      { type: 'warning' }
    );

    for (const id of ids) {
      await deletePlatMenuApi(id);
    }

    ElMessage.success(`成功删除 ${ids.length} 条菜单`);
    handleQuery();
  } catch {
    // 取消删除
  }
}

// 搜索与重置
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

// 监听 visibleColumns 变化，确保表格刷新（强制重新渲染）
const tableKey = ref(0);
watch(visibleColumns, () => {
  tableKey.value++;
});

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-0">
      <!-- 查询表单 -->
      <el-card shadow="never" class="border-none mb-4 !p-2">
        <el-form :inline="true" :model="queryParams" class="flex flex-wrap gap-x-2 gap-y-2 items-center">
          <el-form-item class="!mb-0 !mr-2">
            <el-input v-model="queryParams.menuName" placeholder="请输入" clearable style="width: 200px" @keyup.enter="handleQuery">
              <template #prefix><span class="text-xs text-gray-400 mr-0.5">菜单名称:</span></template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select v-model="queryParams.menuType" clearable style="width: 200px">
              <template #prefix><span class="text-xs text-gray-400 mr-0.5">类型:</span></template>
              <el-option v-for="item in menuTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select v-model="queryParams.platformType" clearable style="width: 200px">
              <template #prefix><span class="text-xs text-gray-400 mr-0.5">归属:</span></template>
              <el-option v-for="item in platformTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select v-model="queryParams.status" clearable style="width: 200px">
              <template #prefix><span class="text-xs text-gray-400 mr-0.5">状态:</span></template>
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-0 md:ml-auto flex items-center gap-1">
            <el-tooltip content="查询" placement="top">
              <el-button type="primary" :icon="Search" circle @click="handleQuery" />
            </el-tooltip>
            <el-tooltip content="重置" placement="top">
              <el-button :icon="Refresh" circle @click="resetQuery" />
            </el-tooltip>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 -->
      <el-card shadow="never">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <el-button type="primary" plain :icon="Plus" @click="handleAdd()" v-access:code="['plat:menu:add']">
              新增菜单
            </el-button>
            <el-button type="warning" plain :icon="Refresh" @click="handleRefreshCache">
              刷新缓存
            </el-button>
            <el-button type="danger" plain :icon="Delete" @click="handleClearCache">
              清除缓存
            </el-button>
            <ExportButton
               v-access:code="['plat:menu:export']"
              :module-code="ModuleCodeMap.MENU"
              :fields="visibleColumns"
              :find-cond="queryParams"
            />
          </div>
          <div class="flex items-center">
            <ColumnSelector
              :storage-key="MENU_STORAGE_KEY"
              :default-columns="defaultMenuColumns"
              @update:columns="handleColumnsUpdate"
            />
          </div>
        </div>

        <div class="table-container">
          <el-auto-resizer>
            <template #default="{ height, width }">
              <el-table-v2
                :key="tableKey"
                :columns="tableColumns"
                :data="tableData"
                :width="width"
                :height="height"
                fixed
                :row-key="rowKey"
                :expanded-row-keys="expandedRowKeys"
                expand-column-key="menuName"
              />
            </template>
          </el-auto-resizer>
        </div>
      </el-card>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="formTitle" width="600px" append-to-body>
      <el-form :model="formData" label-width="100px">
        <el-form-item label="上级菜单">
          <el-tree-select
v-model="formData.parentId" :data="parentMenuOptions" :props="{
            value: 'menuId',
            label: 'menuName',
            children: 'children',
          }" :check-strictly="true" placeholder="请选择上级菜单" clearable filterable style="width: 100%"
/>
        </el-form-item>
        <el-form-item label="菜单名称" required>
          <el-input v-model="formData.menuName" placeholder="请输入菜单名称" />
        </el-form-item>
        <el-form-item label="菜单类型" required>
          <el-radio-group v-model="formData.menuType">
            <el-radio v-for="item in menuTypeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="菜单归属">
          <el-radio-group v-model="formData.platformType">
            <el-radio v-for="item in platformTypeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="路由地址" v-if="formData.menuType !== 2">
          <el-input v-model="formData.path" placeholder="请输入路由地址" />
        </el-form-item>
        <el-form-item label="组件路径" v-if="formData.menuType === 1">
          <el-input v-model="formData.component" placeholder="请输入组件路径" />
        </el-form-item>
        <el-form-item label="权限标识">
          <el-input v-model="formData.code" placeholder="请输入权限标识，如: system:user:add" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="formData.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="formData.status">
            <el-radio :value="0">启用</el-radio>
            <el-radio :value="1">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped>
.table-container {
  width: 100%;
  height: calc(100vh - 320px);
  min-height: 500px;
}

:deep(.el-table-v2__row-cell) {
  display: flex;
  align-items: center;
}

:deep(.el-table-v2__header-cell) {
  font-weight: 600;
  background-color: var(--el-fill-color-light);
}
</style>
