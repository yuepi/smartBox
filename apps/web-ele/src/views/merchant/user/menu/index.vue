<script lang="tsx" setup>
import { onMounted, reactive, ref, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Delete, Plus, Edit, Folder, Document, Operation } from '@element-plus/icons-vue';
import { Page } from '@vben/common-ui';

import { useUserStore } from '@vben/stores';

import {
  refreshMenuCacheApi,
  clearMenuCacheApi,
  getMerchantMenuListApi,
  addMerchantMenuApi,
  editMerchantMenuApi,
  deleteMerchantMenuApi,
  getMerchantMenuDetailApi,
  type Menu,
} from '#/api/system/menu';

import { useAccess } from '@vben/access';

const { hasAccessByCodes } = useAccess();


const userStore = useUserStore();
const isSuperAdmin = computed(() => userStore.userInfo?.superAdminFlag === 1);

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Menu[]>([]);

// 表单弹窗控制
const formVisible = ref(false);
const formTitle = ref('');
const formData = ref<Partial<Menu>>({});
const formSubmitting = ref(false);
const expandedRowKeys = ref([]);
const rowKey = 'menuId';

// 类型选项
const menuTypeOptions = [
  { label: '目录', value: 0 },
  { label: '菜单', value: 1 },
  { label: '按钮', value: 2 },
];

// 平台类型选项
const platformTypeOptions = [
  { label: '平台菜单', value: 0 },
  { label: '商户菜单', value: 1 },
];

// 状态选项
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

// 表格列配置
const columns = ref([
  {
    key: 'menuName',
    title: '菜单名称',
    width: 400,
    align: 'left' as const,
    cellRenderer: ({ rowData, cells }: any) => (
      <div class="flex items-center gap-1">
        {cells}

        {rowData.menuType === 0 && <Folder class="w-4 h-4 text-gray-500" />}
        {rowData.menuType === 1 && <Document class="w-4 h-4 text-gray-500" />}
        {rowData.menuType === 2 && <Operation class="w-4 h-4 text-gray-500" />}
        <span>{rowData.menuName}</span>
      </div>
    ),
  },
  {
    key: 'menuType',
    title: '类型',
    width: 200,
    align: 'center' as const,
    cellRenderer: ({ rowData }: any) => {
      const typeMap: Record<number, { text: string; type: string }> = {
        0: { text: '目录', type: 'primary' },
        1: { text: '菜单', type: 'success' },
        2: { text: '按钮', type: 'info' },
      };
      const config = typeMap[rowData.menuType] || { text: '未知', type: 'danger' };
      return <el-tag type={config.type} size="small">{config.text}</el-tag>;
    },
  },
  {
    key: 'platformType',
    title: '归属',
    width: 200,
    align: 'center' as const,
    cellRenderer: ({ rowData }: any) => (
      <el-tag type={rowData.platformType === 0 ? 'primary' : 'success'} size="small">
        {rowData.platformType === 0 ? '平台菜单' : '商户菜单'}
      </el-tag>
    ),
  },
  {
    key: 'path',
    title: '路由地址',
    width: 280,
    cellRenderer: ({ rowData }: any) => (
      <span class="text-gray-500 text-sm">{rowData.path || '-'}</span>
    ),
  },
  {
    key: 'code',
    title: '权限标识',
    width: 280,
    cellRenderer: ({ rowData }: any) => (
      <span class="text-gray-500 text-sm">{rowData.code || '-'}</span>
    ),
  },
  {
    key: 'sort',
    title: '排序',
    width: 100,
    align: 'center' as const,
    cellRenderer: ({ rowData }: any) => rowData.sort,
  },
  {
    key: 'status',
    title: '状态',
    width: 120,
    align: 'center' as const,
    cellRenderer: ({ rowData }: any) => (
      <el-tag type={rowData.status === 0 ? 'success' : 'danger'} size="small">
        {rowData.status === 0 ? '启用' : '禁用'}
      </el-tag>
    ),
  },
  {
    key: 'operate',
    title: '操作',
    width: 300,
    fixed: 'right',
    align: 'center' as const,
    cellRenderer: ({ rowData }: any) => (
      <div class="flex justify-center gap-1">
       {hasAccessByCodes(['merchant:menu:add']) && (
        <el-button icon={Plus} link type="primary" onClick={() => handleAdd(rowData.menuId)}>
          新增
        </el-button>
      )}
      {hasAccessByCodes(['merchant:menu:edit']) && (
        <el-button icon={Edit} link type="primary" onClick={() => handleEdit(rowData)}>
          编辑
        </el-button>
      )}
      {hasAccessByCodes(['merchant:menu:del']) && (
        <el-button icon={Delete} link type="danger" onClick={() => handleDelete(rowData)}>
          删除
        </el-button>
      )}
      </div>
    ),
  },
]);

// 刷新菜单缓存
async function handleRefreshCache() {
  try {
    await ElMessageBox.confirm(
      '确定要刷新菜单缓存吗？刷新后菜单数据将立即生效。',
      '提示',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      }
    );
    
    await refreshMenuCacheApi();
    ElMessage.success('菜单缓存刷新成功');
    // 刷新后重新加载数据
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
    await ElMessageBox.confirm(
      '确定要清除菜单缓存吗？清除后需要重新加载菜单数据。',
      '提示',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      }
    );
    
    await clearMenuCacheApi();
    ElMessage.success('菜单缓存清除成功');
    // 清除后重新加载数据
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

  // 排序
  const sortTree = (nodes: Menu[]) => {
    nodes.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    nodes.forEach(node => {
      if (node.children && node.children.length) {
        sortTree(node.children);
      }
    });
  };
  sortTree(tree);

  return tree;
}

// 父级菜单选项
const parentMenuOptions = ref<Menu[]>([]);

// 加载父级菜单选项（用于下拉选择）
async function loadParentMenuOptions() {
  try {
    
    let res = await getMerchantMenuListApi({
      merchantId: userStore.userInfo?.merchantId,
      status: 0
    });

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

// 递归扁平化树形结构
function flattenTree(nodes: Menu[]): Menu[] {
  let result: Menu[] = [];
  nodes.forEach(node => {
    result.push(node);
    if (node.children && node.children.length) {
      result = result.concat(flattenTree(node.children));
    }
  });
  return result;
}

// --- 数据加载 ---
async function loadData() {

  try {
    loading.value = true;

    let res = await getMerchantMenuListApi({
      merchantId: userStore.userInfo?.merchantId,
      status: 0
    });

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
    const res = await getMerchantMenuDetailApi(row.menuId);
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
    const api = formData.value.menuId ? editMerchantMenuApi : addMerchantMenuApi;
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
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      }
    );

    for (const id of ids) {
      await deleteMerchantMenuApi(id);
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

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <h1 class="text-2xl font-bold">商户菜单管理</h1>
    <div class="p-4">
      <!-- 查询表单 -->
      <el-card shadow="never" class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="菜单名称">
            <el-input v-model="queryParams.menuName" placeholder="请输入菜单名称" clearable style="width: 180px"
              @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="queryParams.menuType" placeholder="全部" clearable style="width: 100px">
              <el-option v-for="item in menuTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 100px">
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleQuery" v-access:code="['merchant:menu:page']">查询</el-button>
            <el-button :icon="Refresh" @click="resetQuery" v-access:code="['merchant:menu:page']">重置</el-button>
            <el-button type="primary" plain :icon="Plus" @click="handleAdd()" v-access:code="['merchant:menu:add']">新增菜单</el-button>
            <el-button type="warning" plain :icon="Refresh" @click="handleRefreshCache">刷新缓存</el-button>
            <el-button type="danger" plain :icon="Delete" @click="handleClearCache">清除缓存</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 - 使用 el-table-v2 -->
      <el-card shadow="never">
        <div class="table-container">
          <el-auto-resizer>
            <template #default="{ height, width }">
              <el-table-v2 :columns="columns" :data="tableData" :width="width" :height="height" fixed :row-key="rowKey"
                :expanded-row-keys="expandedRowKeys" expand-column-key="menuName" />
            </template>
          </el-auto-resizer>
        </div>
      </el-card>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="formTitle" width="600px" append-to-body>
      <el-form :model="formData" label-width="100px">
        <el-form-item label="上级菜单">
          <el-tree-select v-model="formData.parentId" :data="parentMenuOptions" :props="{
            value: 'menuId',
            label: 'menuName',
            children: 'children',
          }" :check-strictly="true" placeholder="请选择上级菜单" clearable filterable style="width: 100%" />
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
  min-height: 500px;
  height: calc(100vh - 280px);
  width: 100%;
}

:deep(.el-table-v2__row-cell) {
  display: flex;
  align-items: center;
}

:deep(.el-table-v2__header-cell) {
  background-color: var(--el-fill-color-light);
  font-weight: 600;
}
</style>