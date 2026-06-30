<script lang="ts" setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { addDictDataApi, editDictDataApi, getDictDataDetailApi } from '#/api/system/dict/dictData';
import type { DictData } from '#/api/system/dict/dictData';

const emit = defineEmits(['success']);

const visible = ref(false);
const title = ref('');
const formData = ref<Partial<DictData>>({});
const submitting = ref(false);

const listClassOptions = [
  { label: '默认', value: '' },
  { label: '主要 (Primary)', value: 'primary' },
  { label: '成功 (Success)', value: 'success' },
  { label: '信息 (Info)', value: 'info' },
  { label: '警告 (Warning)', value: 'warning' },
  { label: '危险 (Danger)', value: 'danger' },
];

async function open(row?: DictData, dictId?: number) {
  visible.value = true;
  if (!row) {
    title.value = '新增字典项';
    formData.value = { dictId, status: 0, defaultFlag: 0, sort: 0, listClass: '' };
  } else {
    title.value = '编辑字典项';
    try {
      const res = await getDictDataDetailApi(row.dictDataId);
      formData.value = res || {};
    } catch {
      ElMessage.error('获取字典项信息失败');
    }
  }
}

defineExpose({ open });

async function handleSubmit() {
  if (!formData.value.itemLabel?.trim()) return ElMessage.warning('请输入显示标签');
  if (formData.value.itemValue === undefined) return ElMessage.warning('请输入字典值');

  try {
    submitting.value = true;
    const api = formData.value.dictDataId ? editDictDataApi : addDictDataApi;
    await api(formData.value);
    ElMessage.success(formData.value.dictDataId ? '修改成功' : '新增成功');
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
      <el-form-item label="显示标签" required>
        <el-input v-model="formData.itemLabel" placeholder="请输入显示标签" />
      </el-form-item>
      <el-form-item label="字典值" required>
        <el-input-number v-model="formData.itemValue" :min="0" placeholder="请输入字典值" style="width: 100%" />
      </el-form-item>
      <el-form-item label="标签样式">
        <el-select v-model="formData.listClass" placeholder="请选择标签色彩风格" style="width: 100%">
          <el-option v-for="item in listClassOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <div class="grid grid-cols-2 gap-4">
        <el-form-item label="排序">
          <el-input-number v-model="formData.sort" :min="0" :max="999" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="设为默认">
          <div class="h-8 flex items-center">
            <el-radio-group v-model="formData.defaultFlag">
              <el-radio :value="1">是</el-radio>
              <el-radio :value="0">否</el-radio>
            </el-radio-group>
          </div>
        </el-form-item>
      </div>
      <el-form-item label="状态">
        <el-switch v-model="formData.status" :active-value="0" :inactive-value="1" active-text="启用" inactive-text="禁用" inline-prompt />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="请输入备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
