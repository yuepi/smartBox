<script lang="ts" setup>
import { nextTick, ref } from "vue";
import { ElMessage } from "element-plus";
import { InfoFilled } from "@element-plus/icons-vue";

import { getPlatDeptListApi } from '#/api/system/dept';
import type { Dept } from '#/api/system/dept';
import { getPlatMenuListApi } from "#/api/system/menu";
import { addPlatRoleApi, editPlatRoleApi, getPlatRoleDetailApi } from '#/api/system/role';
import type { Role } from '#/api/system/role';
import MemberSelector from "#/components/MemberSelector/index.vue";

const emit = defineEmits(["success"]);

// --- 弹窗内部独立状态变量 ---
const formVisible = ref(false);
const formTitle = ref("");
const formData = ref<Partial<Role>>({});
const formSubmitting = ref(false);
const formRef = ref();

const activeTab = ref("basic");

const menuTreeRef = ref();
const menuTreeData = ref<any[]>([]);
const menuLoading = ref(false);

const deptTreeRef = ref();
const deptTreeData = ref<Dept[]>([]);
const deptLoading = ref(false);

const scopeOptions = [
  { label: "全部数据权限", value: 1 },
  { label: "自定数据权限", value: 2 },
];

// --- 🌟 核心对外暴露的开窗方法 ---
async function open(row?: Role) {
  formVisible.value = true;
  activeTab.value = "basic";
  menuTreeData.value = [];
  deptTreeData.value = [];

  if (!row) {
    formTitle.value = "新增角色";
    formData.value = {
      status: 0,
      sort: 0,
      scope: 1,
      members: [],
      menuIds: [],
      deptIds: [],
    };
  } else {
    try {
      formTitle.value = "编辑角色";
      const res = await getPlatRoleDetailApi(row.roleId);
      formData.value = res || {};
      formData.value.menuIds = res.menuIds || [];
      formData.value.members = res.members || [];
      formData.value.deptIds = res.deptIds || [];
    } catch {
      ElMessage.error("获取角色信息失败");
    }
  }
}

// 暴露 open 给父组件访问
defineExpose({ open });

// --- 树结构处理逻辑（纯高内聚逻辑） ---
function buildMenuTree(menuList: any[], parentId: number = 0): any[] {
  const tree: any[] = [];
  for (const menu of menuList) {
    if (menu.parentId === parentId) {
      const children = buildMenuTree(menuList, menu.menuId);
      if (children.length > 0) {
        menu.children = children;
      }
      tree.push(menu);
    }
  }
  return tree;
}

function buildDeptTree(deptList: Dept[], parentId: number = 0): Dept[] {
  const tree: Dept[] = [];
  for (const dept of deptList) {
    if (dept.parentId === parentId) {
      const children = buildDeptTree(deptList, dept.deptId);
      if (children.length > 0) {
        dept.children = children;
      }
      tree.push(dept);
    }
  }
  tree.sort((a, b) => (a.sort || 0) - (b.sort || 0));
  return tree;
}

function filterLeafIds(nodes: any[], checkedIds: number[]): number[] {
  const leafKeys: number[] = [];
  const findLeafIds = (nodeList: any[]) => {
    nodeList.forEach((node) => {
      if (!node.children || node.children.length === 0) {
        if (checkedIds.includes(node.menuId || node.deptId)) {
          leafKeys.push(node.menuId || node.deptId);
        }
      } else {
        findLeafIds(node.children);
      }
    });
  };
  findLeafIds(nodes);
  return leafKeys;
}

async function loadMenuTree() {
  try {
    menuLoading.value = true;
    const res = await getPlatMenuListApi();
    menuTreeData.value = buildMenuTree(res || []);

    await nextTick();
    if (menuTreeRef.value && formData.value.menuIds?.length) {
      const leafKeys = filterLeafIds(menuTreeData.value, formData.value.menuIds);
      menuTreeRef.value.setCheckedKeys(leafKeys);
    }
  } catch (error) {
    console.error("加载菜单失败：", error);
    ElMessage.error("加载菜单权限失败");
  } finally {
    menuLoading.value = false;
  }
}

async function loadDeptTree() {
  try {
    deptLoading.value = true;
    const res = await getPlatDeptListApi({ status: 0 });
    deptTreeData.value = buildDeptTree(res || []);

    await nextTick();
    if (deptTreeRef.value && formData.value.deptIds?.length) {
      const leafKeys = filterLeafIds(deptTreeData.value, formData.value.deptIds);
      deptTreeRef.value.setCheckedKeys(leafKeys);
    }
  } catch (error) {
    console.error("加载部门树失败：", error);
    ElMessage.error("加载部门树失败");
  } finally {
    deptLoading.value = false;
  }
}

function handleMenuTreeCheck() {
  if (menuTreeRef.value) {
    const checkedKeys = menuTreeRef.value.getCheckedKeys();
    const halfCheckedKeys = menuTreeRef.value.getHalfCheckedKeys();
    formData.value.menuIds = [...checkedKeys, ...halfCheckedKeys];
  }
}

function handleDeptTreeCheck() {
  if (deptTreeRef.value) {
    const checkedKeys = deptTreeRef.value.getCheckedKeys();
    const halfCheckedKeys = deptTreeRef.value.getHalfCheckedKeys();
    formData.value.deptIds = [...checkedKeys, ...halfCheckedKeys];
  }
}

function handleScopeChange(scope: number) {
  if (scope !== 2) {
    formData.value.deptIds = [];
    if (deptTreeRef.value) {
      deptTreeRef.value.setCheckedKeys([]);
    }
  }
}

const handleTabClick = async (tab: any) => {
  if (tab.paneName === "menu" && menuTreeData.value.length === 0) {
    await loadMenuTree();
  }
  if (tab.paneName === "dataScope" && deptTreeData.value.length === 0) {
    await loadDeptTree();
  }
};

function handleMemberChange(members: any[]) {
  formData.value.members = members;
}

// --- 提交操作 ---
async function handleSubmit() {
  if (!formData.value.roleName?.trim()) {
    ElMessage.warning("请输入角色名称");
    return;
  }
  if (!formData.value.roleCode?.trim()) {
    ElMessage.warning("请输入角色编码");
    return;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.roleId ? editPlatRoleApi : addPlatRoleApi;
    await api(formData.value);
    ElMessage.success(formData.value.roleId ? "修改成功" : "新增成功");
    formVisible.value = false;
    emit("success"); // 🌟 通知父组件刷新列表数据
  } catch {
    ElMessage.error("操作失败");
  } finally {
    formSubmitting.value = false;
  }
}
</script>

<template>
  <el-dialog
    v-model="formVisible"
    :title="formTitle"
    width="900px"
    append-to-body
    class="rounded-xl overflow-hidden shadow-2xl"
  >
    <el-tabs
      v-model="activeTab"
      type="border-card"
      class="border-none shadow-none !bg-transparent"
      @tab-click="handleTabClick"
    >
      <!-- 1. 基本信息 -->
      <el-tab-pane label="基本信息" name="basic" class="p-4 bg-white dark:bg-[#18181c]">
        <el-form ref="formRef" :model="formData" label-position="top">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <el-form-item label="角色名称" required class="font-medium text-gray-700 dark:text-gray-300">
              <el-input v-model="formData.roleName" placeholder="请输入角色名称" class="!h-10" />
            </el-form-item>

            <el-form-item label="角色编码" required class="font-medium text-gray-700 dark:text-gray-300">
              <el-input v-model="formData.roleCode" placeholder="请输入角色编码" class="!h-10" />
            </el-form-item>

            <el-form-item label="排序号" class="font-medium text-gray-700 dark:text-gray-300">
              <el-input-number v-model="formData.sort" :min="0" :max="999" controls-position="right" class="!w-full !line-height-[38px]" />
            </el-form-item>

            <el-form-item label="是否可用" class="font-medium text-gray-700 dark:text-gray-300">
              <div class="h-10 flex items-center">
                <el-switch v-model="formData.status" :active-value="0" :inactive-value="1" active-text="启用" inactive-text="禁用" inline-prompt />
              </div>
            </el-form-item>
          </div>

          <el-form-item label="包含成员" class="mt-2 font-medium text-gray-700 dark:text-gray-300">
            <MemberSelector style="width: 100%" v-model="formData.members" placeholder="点击选择成员" @change="handleMemberChange" />
          </el-form-item>

          <el-form-item label="备注" class="font-medium text-gray-700 dark:text-gray-300">
            <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注说明（可选）" class="rounded-lg" />
          </el-form-item>

          <!-- 操作追溯底栏 -->
          <div v-if="formData.createTime" class="mt-6 p-4 bg-slate-50 dark:bg-zinc-900 rounded-xl grid grid-cols-2 gap-4 text-xs text-gray-500">
            <div class="flex items-center gap-2"><span class="font-semibold text-gray-400 w-16">创建人:</span><span class="text-gray-700 dark:text-gray-300 font-medium">{{ formData.createBy || "-" }}</span></div>
            <div class="flex items-center gap-2"><span class="font-semibold text-gray-400 w-16">创建时间:</span><span class="text-gray-700 dark:text-gray-300 font-mono">{{ formData.createTime }}</span></div>
            <div class="flex items-center gap-2"><span class="font-semibold text-gray-400 w-16">更新人:</span><span class="text-gray-700 dark:text-gray-300 font-medium">{{ formData.updateBy || "-" }}</span></div>
            <div class="flex items-center gap-2"><span class="font-semibold text-gray-400 w-16">更新时间:</span><span class="text-gray-700 dark:text-gray-300 font-mono">{{ formData.updateTime }}</span></div>
          </div>
        </el-form>
      </el-tab-pane>

      <!-- 2. 菜单权限 -->
      <el-tab-pane label="菜单权限" name="menu" class="p-4 bg-white dark:bg-[#18181c]">
        <div class="min-h-[400px] flex flex-col" v-loading="menuLoading">
          <div class="flex items-center gap-2 px-4 py-2.5 mb-4 text-xs text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40 rounded-lg">
            <el-icon class="text-base"><InfoFilled /></el-icon>
            <span>提示：勾选下方菜单，设置角色可访问的菜单页面及按钮权限</span>
          </div>
          <div class="flex-1 max-h-[420px] overflow-y-auto p-3 border border-slate-100 dark:border-zinc-800 rounded-xl shadow-inner bg-slate-50/50 dark:bg-zinc-900/30">
            <el-tree ref="menuTreeRef" :data="menuTreeData" show-checkbox node-key="menuId" :props="{ label: 'menuName', children: 'children' }" default-expand-all class="!bg-transparent text-gray-700 dark:text-gray-300" @check="handleMenuTreeCheck" />
            <el-empty v-if="!menuLoading && menuTreeData.length === 0" description="暂无菜单权限数据" :image-size="80" />
          </div>
        </div>
      </el-tab-pane>

      <!-- 3. 数据权限 -->
      <el-tab-pane label="数据权限" name="dataScope" class="p-4 bg-white dark:bg-[#18181c]">
        <div class="min-h-[400px] flex flex-col">
          <el-form-item label="数据权限范围" label-width="110px" class="font-medium !mb-4">
            <el-select v-model="formData.scope" placeholder="请选择数据权限" class="!w-72" @change="handleScopeChange">
              <el-option v-for="item in scopeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>

          <div v-if="formData.scope === 2" class="flex-1 flex flex-col mt-2" v-loading="deptLoading">
            <div class="flex items-center gap-2 px-4 py-2.5 mb-4 text-xs text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40 rounded-lg">
              <el-icon class="text-base"><InfoFilled /></el-icon>
              <span>提示：勾选下方组织架构部门，角色的数据查看权限将严格限制在所选范围内</span>
            </div>
            <div class="flex-1 max-h-[350px] overflow-y-auto p-3 border border-slate-100 dark:border-zinc-800 rounded-xl shadow-inner bg-slate-50/50 dark:bg-zinc-900/30">
              <el-tree ref="deptTreeRef" :data="deptTreeData" show-checkbox node-key="deptId" :props="{ label: 'deptName', children: 'children' }" default-expand-all class="!bg-transparent text-gray-700 dark:text-gray-300" @check="handleDeptTreeCheck" />
              <el-empty v-if="!deptLoading && deptTreeData.length === 0" description="暂无组织架构数据" :image-size="80" />
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="flex justify-end gap-2 px-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
        <el-button class="rounded-lg px-5" @click="formVisible = false">取消</el-button>
        <el-button type="primary" class="rounded-lg px-5 shadow-sm" :loading="formSubmitting" @click="handleSubmit">保存提交</el-button>
      </div>
    </template>
  </el-dialog>
</template>
