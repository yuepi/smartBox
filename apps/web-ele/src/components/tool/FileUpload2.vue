<script lang="ts" setup>
import { defineExpose, reactive, ref } from 'vue';

import { UploadFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

import { globalHeaders } from '#/api/request';

// const props = defineProps({
//   url: { type: String, required: false },
// });

const emits = defineEmits(['close']);

const state = reactive({
  uploadUrl: '',
  back: {} as any,
});

const headers = ref(globalHeaders());

const upload = ref();

const dialogVisible = ref(false);
const open = async (url: string) => {
  if (url) {
    // eslint-disable-next-line unicorn/prefer-string-slice
    state.uploadUrl = url.startsWith('/') ? `${import.meta.env.VITE_GLOB_API_URL}${url.substring(1, url.length - 1)}` : `${import.meta.env.VITE_GLOB_API_URL}${url}`;
  } else {
    state.uploadUrl = `${import.meta.env.VITE_GLOB_API_URL}/tool/oss/main/upload`;
  }
  dialogVisible.value = true;
};

defineExpose({ open });

const handleConfirm = async () => {
  // ElMessage.warning("演示模式不支持导入")
  // console.log(upload.value);
  await upload.value!.submit();

  const back = {} as any;
  back.id = state.back.id;
  back.name = state.back.name;
  back.path = state.back.path;
  console.log(back);
  emits('close', { uptag: true, file: back });
  dialogVisible.value = false;
};

const handleSuccess = (a: any, b: any, c: any) => {
  if (a.code === '500') {
    ElMessage.error(a.msg);
    emits('close', { uptag: false });

    return;
  }
  state.back.id = a.id;
  state.back.name = a.name;
  state.back.path = a.path;
  ElMessage.success('上传成功');
  emits('close', { uptag: false });
};
const error = (res: any) => {
  ElMessage.error('上传失败');
  emits('close', { uptag: false });
};
// const clearAndcloseModal = () => {
//   emits('close', null);
//   dialogVisible.value = false;
// };
</script>

<template>
  <el-dialog v-model="dialogVisible" title="文件上传" draggable width="500px">
    <el-upload class="upload-demo" drag ref="upload" :headers="headers" :action="state.uploadUrl" :auto-upload="false" :on-success="handleSuccess" :on-error="error">
      <el-icon class="el-icon--upload">
        <UploadFilled />
      </el-icon>
      <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
      <template #tip>
        <div class="el-upload__tip">
          <!--          请选择文件上传-->
        </div>
      </template>
    </el-upload>

    <template #footer>
      <span class="dialog-footer">
        <el-button type="primary" @click="handleConfirm">确 认</el-button>
        <el-button @click="dialogVisible = false">取 消</el-button>
      </span>
    </template>
  </el-dialog>
</template>
<style scoped></style>
