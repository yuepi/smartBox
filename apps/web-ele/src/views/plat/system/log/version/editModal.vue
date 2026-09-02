<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';

import type { VersionSaveParams } from '#/api/system/version';

import { nextTick, reactive, ref } from 'vue';

import { ElMessage } from 'element-plus';

import { addVersionApi, editVersionApi, getVersionDetailApi } from '#/api/system/version';

const emit = defineEmits(['success']);

const visible = ref(false);
const loading = ref(false);
const submitLoading = ref(false);
const formRef = ref<FormInstance>();

const form = reactive<VersionSaveParams>({
  versionUpdateId: undefined,
  version: '',
  title: '',
  publishTime: '',
  status: 1,
  items: [],
});

const rules: FormRules = {
  version: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
  title: [{ required: true, message: '请输入更新标题', trigger: 'blur' }],
  publishTime: [{ required: true, message: '请选择发布时间', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
};

function addItem() {
  form.items.push({
    itemType: 1,
    content: '',
    sort: form.items.length,
  });
}

function removeItem(index: number) {
  form.items.splice(index, 1);
}

async function open(id?: number) {
  visible.value = true;
  await nextTick();
  formRef.value?.resetFields();
  form.versionUpdateId = undefined;
  form.items = [];

  if (id) {
    try {
      loading.value = true;
      const res = await getVersionDetailApi(id);
      if (res) {
        form.versionUpdateId = res.versionUpdateId;
        form.version = res.version;
        form.title = res.title;
        form.publishTime = res.publishTime;
        form.status = res.status;
        form.items = res.items
          ? res.items.map((item) => ({
              itemType: item.itemType,
              content: item.content,
              sort: item.sort ?? 0,
            }))
          : [];
      }
    } catch (error) {
      console.error(error);
    } finally {
      loading.value = false;
    }
  } else {
    // 默认添加一条空明细
    addItem();
  }
}

async function handleSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    if (form.items.length === 0) {
      ElMessage.warning('请至少添加一条更新内容明细');
      return;
    }

    for (let i = 0; i < form.items.length; i++) {
      if (!form.items[i].content.trim()) {
        ElMessage.warning(`第 ${i + 1} 条更新明细内容不能为空`);
        return;
      }
    }

    try {
      submitLoading.value = true;
      if (form.versionUpdateId) {
        await editVersionApi(form);
        ElMessage.success('修改成功');
      } else {
        await addVersionApi(form);
        ElMessage.success('新增成功');
      }
      visible.value = false;
      emit('success');
    } catch (error) {
      console.error(error);
    } finally {
      submitLoading.value = false;
    }
  });
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="form.versionUpdateId ? '编辑版本更新' : '新增版本更新'"
    width="680px"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      v-loading="loading"
      :model="form"
      :rules="rules"
      label-width="100px"
    >
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="版本号" prop="version">
            <el-input v-model="form.version" placeholder="例如: v1.4.0" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio :value="1">已发布</el-radio>
              <el-radio :value="0">草稿</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="更新标题" prop="title">
        <el-input v-model="form.title" placeholder="请输入更新主题标题" clearable />
      </el-form-item>

      <el-form-item label="发布时间" prop="publishTime">
        <el-date-picker
          v-model="form.publishTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="选择发布时间"
          style="width: 100%"
        />
      </el-form-item>

      <el-divider content-position="left">更新明细内容</el-divider>

      <div class="items-wrapper">
        <div
          v-for="(item, index) in form.items"
          :key="index"
          class="item-row"
        >
          <el-select v-model="item.itemType" style="width: 110px">
            <el-option :value="1" label="新增" />
            <el-option :value="2" label="优化" />
            <el-option :value="3" label="修复" />
          </el-select>

          <el-input
            v-model="item.content"
            placeholder="请输入更新具体说明"
            clearable
            style="flex: 1"
          />

          <el-button
            type="danger"
            icon="Delete"
            circle
            plain
            @click="removeItem(index)"
          />
        </div>

        <el-button
          type="primary"
          dashed
          icon="Plus"
          class="w-full mt-2"
          @click="addItem"
        >
          添加一条明细
        </el-button>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.items-wrapper {
  .item-row {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 10px;
  }
}
</style>
