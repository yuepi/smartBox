<script setup lang="ts">
import type { UploadFile, UploadFiles, UploadRawFile } from 'element-plus';

import { computed, ref, watch } from 'vue';

import { useAccessStore } from '@vben/stores';

import { Plus } from '@element-plus/icons-vue';
import { ElLoading, ElMessage } from 'element-plus';

interface CustomUploadFile {
  name: string;
  url: string;
  fileId?: string;
}

interface Props {
  modelValue?: CustomUploadFile[] | string | string[];
  limit?: number;
  fileSize?: number;
  fileType?: string[];
  isShowTip?: boolean;
  action?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  limit: 5,
  fileSize: 5,
  fileType: () => ['png', 'jpg', 'jpeg'],
  isShowTip: true,
  action: '/common/upload/uploadFile',
});

const emit = defineEmits(['update:modelValue', 'success', 'error']);
const baseUrl = import.meta.env.VITE_GLOB_API_URL;
const uploadImgUrl = ref(baseUrl + props.action);

const accessStore = useAccessStore();
const headers = computed(() => ({
  Authorization: `Bearer ${accessStore.accessToken}`,
}));


const fileList = ref<UploadFile[]>([]);
const dialogImageUrl = ref('');
const dialogVisible = ref(false);
const fileAccept = computed(() => props.fileType.map(type => `.${type}`).join(','));
const showTip = computed(() => props.isShowTip && (props.fileType.length || props.fileSize));
const hideUpload = computed(() => fileList.value.length >= props.limit);

// 用于防重判断，避免 watch 死循环
const isInnerChange = ref(false);

// 监听外部值变化
watch(
  () => props.modelValue,
  (val) => {
    // 如果是内部 emit 引起的改变，不需要重新解析，防止死循环
    if (isInnerChange.value) {
      isInnerChange.value = false;
      return;
    }

    if (!val) {
      fileList.value = [];
      return;
    }
    
    if (Array.isArray(val)) {
      if (val.length === 0) {
        fileList.value = [];
      } else if (typeof val[0] === 'string') {
        fileList.value = (val as string[]).map((url, index) => ({
          name: `image_${index}`,
          url: url,
          status: 'success', // 必须加上状态，否则 el-upload 渲染异常
          uid: Date.now() + index,
        }));
      } else {
        fileList.value = (val as CustomUploadFile[]).map((item) => ({
          name: item.name,
          url: item.url,
          status: 'success',
          // 将自定义字段塞入 raw 或当作扩展属性
          response: { data: { fileId: item.fileId } } 
        })) as unknown as UploadFile[];
      }
    } else if (typeof val === 'string' && val) {
      const urls = val.split(',');
      fileList.value = urls.filter(Boolean).map((url, index) => ({
        name: `image_${index}`,
        url,
        status: 'success',
        uid: Date.now() + index,
      }));
    }
  },
  { deep: true, immediate: true },
);

// 上传前校验
const handleBeforeUpload = (file: UploadRawFile) => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const isValidType = props.fileType.some(type => 
    file.type.includes(type) || fileExtension === type.toLowerCase()
  );

  if (!isValidType) {
    ElMessage.error(`文件格式不正确，请上传 ${props.fileType.join('/')} 格式的图片`);
    return false; // 直接返回，此时无 Loading
  }
  
  const isLt = file.size / 1024 / 1024 < props.fileSize;
  if (!isLt) {
    ElMessage.error(`上传图片大小不能超过 ${props.fileSize} MB`);
    return false; // 直接返回，此时无 Loading
  }
  
  // 校验通过后，再开启 Loading
  ElLoading.service({ lock: true, text: '正在上传...', background: 'rgba(0,0,0,0.7)' });
  return true;
};

// 上传成功（关键修改：利用 el-upload 自身的 uploadFiles）
const handleUploadSuccess = (res: any, uploadFile: UploadFile, uploadFiles: UploadFiles) => {
  ElLoading.service().close();
  
  if (res.code === 200) {
    // 关键：把后端返回的实际 url 挂载到当前组件内部的文件对象上
    uploadFile.url = res.data;
    // 更新本地维护的列表
    fileList.value = uploadFiles;
    
    emitValue();
    emit('success', res);
  } else {
    ElMessage.error(res.message || '上传失败');
    // 上传失败，从内部组件列表中移除该文件
    const index = uploadFiles.findIndex(f => f.uid === uploadFile.uid);
    if (index !== -1) uploadFiles.splice(index, 1);
    fileList.value = uploadFiles;
    
    emit('error', res);
  }
};

// 上传失败
const handleUploadError = (error: Error, uploadFile: UploadFile, uploadFiles: UploadFiles) => {
  ElLoading.service().close();
  ElMessage.error('上传失败，请重试');
  fileList.value = uploadFiles;
  emit('error', error);
};

// 删除图片
const handleRemove = (uploadFile: UploadFile, uploadFiles: UploadFiles) => {
  fileList.value = uploadFiles;
  emitValue();
};

// 预览图片
const handlePreview = (file: UploadFile) => {
  if (file.url) {
    dialogImageUrl.value = file.url;
    dialogVisible.value = true;
  }
};

// 超出数量限制
const handleExceed = () => {
  ElMessage.error(`最多只能上传 ${props.limit} 张图片`);
};

// 发送数据给父组件
const emitValue = () => {
  const urls = fileList.value.map(f => f.url).filter(Boolean) as string[];
  isInnerChange.value = true; // 标记：这次改变是内部触发的
  emit('update:modelValue', urls);
};
</script>

<template>
  <div class="upload-image">
    <el-upload
      v-model:file-list="fileList"
      :action="uploadImgUrl"
      :headers="headers"
      :limit="limit"
      :accept="fileAccept"
      list-type="picture-card"
      :before-upload="handleBeforeUpload"
      :on-success="handleUploadSuccess"
      :on-error="handleUploadError"
      :on-remove="handleRemove"
      :on-preview="handlePreview"
      :on-exceed="handleExceed"
      :class="{ 'hide-upload': hideUpload }"
    >
      <el-icon><Plus /></el-icon>
    </el-upload>
    
    <div v-if="showTip" class="upload-tip">
      支持 {{ fileType.join('/') }} 格式，单张不超过 {{ fileSize }}MB
    </div>
    
    <el-dialog v-model="dialogVisible" title="预览" width="500px" append-to-body>
      <img :src="dialogImageUrl" style="width: 100%" alt="预览" />
    </el-dialog>
  </div>
</template>
