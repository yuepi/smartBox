<script lang="ts" setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { addPlatMenuApi, editPlatMenuApi, getPlatMenuDetailApi, getPlatMenuListApi } from '#/api/system/menu';
import type { Menu } from '#/api/system/menu';

const emit = defineEmits(['success']);

// --- 状态变量 ---
const formVisible = ref(false);
const formTitle = ref('');
const formData = ref<Partial<Menu>>({});
const formSubmitting = ref(false);

const parentMenuOptions = ref<any[]>([]); // 树形菜单下拉源

const menuTypeOptions = [
  { label: '目录', value: 0 },
  { label: '菜单', value: 1 },
  { label: '按钮', value: 2 },
];

const platformTypeOptions = [
  { label: '平台菜单', value: 0 },
  { label: '商户菜单', value: 1 },
];

// 递归构建纯树形结构（专供 el-tree-select 消费，拒绝平铺）
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

// 加载父级菜单选项树
async function loadParentMenuOptions() {
  try {
    const res = await getPlatMenuListApi();
    const treeMenus = buildTree(res || []);
    // 顶部追加“顶级菜单”虚拟总结点
    parentMenuOptions.value = [
      {
        menuId: 0,
        menuName: '顶级菜单',
        children: treeMenus
      }
    ];
  } catch (error) {
    console.error(error);
  }
}

// 🌟 核心对外开放的初始化开窗方法
async function open(row?: Partial<Menu> | Menu) {
  formVisible.value = true;

  if (!row) {
    formTitle.value = '新增菜单';
    formData.value = { parentId: 0, menuType: 0, platformType: 0, status: 0, sort: 0 };
    await loadParentMenuOptions();
  } else if (!row.menuId) {
    formTitle.value = '新增菜单';
    formData.value = { ...row };
    await loadParentMenuOptions();
  } else {
    try {
      formTitle.value = '编辑菜单';
      const res = await getPlatMenuDetailApi(row.menuId);
      formData.value = res || {};
      await loadParentMenuOptions();
    } catch {
      ElMessage.error('获取菜单信息失败');
    }
  }
}

// 导出方法给外层
defineExpose({ open });

// --- 提交表单 ---
async function handleSubmit() {
  if (!formData.value.menuName?.trim()) {
    ElMessage.warning('请输入菜单名称');
    return;
  }

  if (formData.value.menuId && formData.value.parentId === formData.value.menuId) {
    ElMessage.warning('上级菜单不能选择自身');
    return;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.menuId ? editPlatMenuApi : addPlatMenuApi;
    await api(formData.value);
    ElMessage.success(formData.value.menuId ? '修改成功' : '新增成功');
    formVisible.value = false;
    emit('success');
  } catch {
    ElMessage.error('操作失败');
  } finally {
    formSubmitting.value = false;
  }
}
</script>

<template>
  <el-dialog v-model="formVisible" :title="formTitle" width="540px" append-to-body>
    <el-form :model="formData" label-position="top">
      <el-form-item label="上级菜单">
        <el-tree-select v-model="formData.parentId" :data="parentMenuOptions"
          :props="{ value: 'menuId', label: 'menuName', children: 'children' }" value-key="menuId" placeholder="请选择上级菜单"
          check-strictly filterable default-expand-all clearable style="width: 100%" />
      </el-form-item>

      <el-form-item label="菜单名称" required>
        <el-input v-model="formData.menuName" placeholder="请输入菜单名称" />
      </el-form-item>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <el-form-item label="菜单类型" required>
          <el-select v-model="formData.menuType" placeholder="请选择菜单类型" >
            <el-option v-for="item in menuTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item label="菜单归属">
          <el-select v-model="formData.platformType" placeholder="请选择归属" >
            <el-option v-for="item in platformTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </div>

      <el-form-item v-if="formData.menuType !== 2" label="路由地址">
        <el-input v-model="formData.path" placeholder="请输入路由地址" />
      </el-form-item>

      <el-form-item v-if="formData.menuType === 1" label="组件路径">
        <el-input v-model="formData.component" placeholder="请输入组件路径" />
      </el-form-item>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <el-form-item label="权限标识">
          <el-input v-model="formData.code" placeholder="如: system:user:add" />
        </el-form-item>

        <el-form-item label="排序">
          <el-input-number v-model="formData.sort" :min="0" :max="999" controls-position="right" />
        </el-form-item>
      </div>

      <el-form-item label="状态">
        <div class="h-10 flex items-center">
          <el-switch v-model="formData.status" :active-value="0" :inactive-value="1" active-text="启用" inactive-text="禁用"
            inline-prompt />
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="flex justify-end gap-2 px-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting" @click="handleSubmit">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>
