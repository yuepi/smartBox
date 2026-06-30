<script lang="ts" setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { addPlatDeptApi, editPlatDeptApi, getPlatDeptDetailApi, getPlatDeptListApi } from '#/api/system/dept';
import type { Dept } from '#/api/system/dept';

const emit = defineEmits(['success']);

// --- 状态变量 ---
const formVisible = ref(false);
const formTitle = ref('');
const formData = ref<Partial<Dept>>({});
const formSubmitting = ref(false);

const parentDeptOptions = ref<any[]>([]); // 树形下拉选项

const deptTypeOptions = [
  { label: '顶级部门', value: 0 },
  { label: '部门', value: 1 },
  { label: '小区', value: 2 },
];

// 加载父级部门树选项
async function loadParentDeptOptions() {
  try {
    const res = await getPlatDeptListApi({ status: 0 });
    const depts = res || [];

    // 🌟 核心改动：不再平铺，直接构建一棵树
    // 在最外层包裹一个“顶级部门”虚拟根节点，方便用户可以把某个部门调整为最上层节点
    parentDeptOptions.value = [
      {
        deptId: 0,
        deptName: '顶级部门',
        children: depts // 后端返回的部门树直接作为子节点
      }
    ];
  } catch (error) {
    console.error(error);
  }
}

// 🌟 核心对外开放的初始化开窗方法
async function open(row?: Partial<Dept> | Dept) {
  formVisible.value = true;

  if (!row) {
    formTitle.value = '新增部门';
    formData.value = { parentId: 0, deptType: 1, status: 0, sort: 0 };
    await loadParentDeptOptions();
  } else if (!row.deptId) {
    formTitle.value = '新增部门';
    formData.value = { ...row };
    await loadParentDeptOptions();
  } else {
    try {
      formTitle.value = '编辑部门';
      const res = await getPlatDeptDetailApi(row.deptId);
      formData.value = res || {};
      await loadParentDeptOptions();
    } catch {
      ElMessage.error('获取部门信息失败');
    }
  }
}

// 导出方法给外层
defineExpose({ open });

// --- 提交表单 ---
async function handleSubmit() {
  if (!formData.value.deptName?.trim()) {
    ElMessage.warning('请输入部门名称');
    return;
  }

  // 🌟 防错安全小优化：防止用户在编辑时，不小心把“上级部门”选成了自己本身
  if (formData.value.deptId && formData.value.parentId === formData.value.deptId) {
    ElMessage.warning('上级部门不能选择自身');
    return;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.deptId ? editPlatDeptApi : addPlatDeptApi;
    await api(formData.value);
    ElMessage.success(formData.value.deptId ? '修改成功' : '新增成功');
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
  <el-dialog v-model="formVisible" :title="formTitle" width="520px" append-to-body
    class="rounded-xl overflow-hidden shadow-2xl">
    <el-form :model="formData" label-position="top" class="p-2">

      <el-form-item label="上级部门" required>
        <el-tree-select v-model="formData.parentId" :data="parentDeptOptions"
          :props="{ label: 'deptName', value: 'deptId', children: 'children' }" value-key="deptId" placeholder="请选择上级部门"
          check-strictly default-expand-all clearable style="width: 100%" />
      </el-form-item>

      <el-form-item label="部门名称" required>
        <el-input v-model="formData.deptName" placeholder="请输入部门名称" />
      </el-form-item>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <el-form-item label="部门类型">
          <el-select v-model="formData.deptType" placeholder="请选择类型">
            <el-option v-for="item in deptTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item label="排序">
          <el-input-number v-model="formData.sort" :min="0" :max="999" controls-position="right" class="!w-full" />
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
