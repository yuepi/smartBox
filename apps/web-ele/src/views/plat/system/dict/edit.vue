<script lang="ts" setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { addDictApi, editDictApi, getDictDetailApi } from '#/api/system/dict/dict';
import type { Dict } from '#/api/system/dict/dict';

const emit = defineEmits(['success']);

const visible = ref(false);
const title = ref('');
const formData = ref<Partial<Dict>>({});
const submitting = ref(false);

async function open(row?: Dict) {
  visible.value = true;
  if (!row) {
    title.value = '新增字典';
    formData.value = { status: 0 };
  } else {
    title.value = '编辑字典';
    try {
      const res = await getDictDetailApi(row.dictId);
      formData.value = res || {};
    } catch {
      ElMessage.error('获取字典详细信息失败');
    }
  }
}

defineExpose({ open });

async function handleSubmit() {
  if (!formData.value.dictName?.trim()) return ElMessage.warning('请输入字典名称');
  if (!formData.value.dictCode?.trim()) return ElMessage.warning('请输入字典编码');

  try {
    submitting.value = true;
    const api = formData.value.dictId ? editDictApi : addDictApi;
    await api(formData.value);
    ElMessage.success(formData.value.dictId ? '修改成功' : '新增成功');
    visible.value = false;
    emit('success');
  } catch {
    ElMessage.error('操作失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="460px" append-to-body>
    <el-form :model="formData" label-position="top">
      <el-form-item label="字典名称" required>
        <el-input v-model="formData.dictName" placeholder="请输入字典名称" />
      </el-form-item>
      <el-form-item label="字典编码" required>
        <el-input v-model="formData.dictCode" placeholder="如: sys_user_sex" />
      </el-form-item>
      <el-form-item label="状态">
        <el-switch v-model="formData.status" :active-value="0" :inactive-value="1" active-text="启用" inactive-text="禁用" inline-prompt />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
