<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useAccessStore } from '@vben/stores';

import { Document, Upload } from '@element-plus/icons-vue';
import { ElLoading, ElMessage } from 'element-plus';

import { useOssUpload } from '#/utils/file/oss';

interface UploadFile {
  name: string;
  url: string;
  fileId?: string;
}

interface Props {
  modelValue?: string | string[] | UploadFile[];
  limit?: number;
  fileSize?: number;
  fileType?: string[];
  isShowTip?: boolean;
  action?: string;
  disabled?: boolean;

  // ✨ 新增动态配置属性
  drag?: boolean; // 是否启用拖拽上传
  webkitdirectory?: boolean; // 是否启用文件夹上传
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  limit: 5,
  fileSize: 10,
  fileType: () => [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'txt',
    'zip',
    'rar',
  ],
  isShowTip: true,
  action: '/common/upload/uploadFile',
  disabled: false,
  drag: false, // 默认关闭拖拽
  webkitdirectory: false, // 默认关闭文件夹上传
});

const emit = defineEmits(['update:modelValue', 'success', 'error']);

const { uploadToOss } = useOssUpload();

// 自定义 OSS 上传核心逻辑
const customUpload = async (options: any) => {
  const { file, onSuccess, onError } = options;
  try {
    const url = await uploadToOss(file);
    handleUploadSuccess({ code: 200, data: url }, file);
    onSuccess();
  } catch (error) {
    handleUploadError(error);
    onError(error);
  }
};

const baseUrl = import.meta.env.VITE_GLOB_API_URL;
const uploadUrl = ref(baseUrl + props.action);

const accessStore = useAccessStore();
const headers = computed(() => ({
  Authorization: `Bearer ${accessStore.accessToken}`,
}));

const fileList = ref<UploadFile[]>([]);
const uploadRef = ref();
const isInnerChange = ref(false);

const fileAccept = computed(() =>
  props.fileType.map((type) => `.${type}`).join(','),
);
const showTip = computed(
  () => props.isShowTip && (props.fileType.length || props.fileSize),
);

// 监听外部值变化 [cite: 11]
watch(
  () => props.modelValue,
  (val) => {
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
          name: getFileName(url, `file_${index}`),
          url,
        }));
      } else {
        fileList.value = JSON.parse(JSON.stringify(val)) as UploadFile[];
      }
    } else if (typeof val === 'string' && val) {
      const urls = val.split(',');
      fileList.value = urls.filter(Boolean).map((url, index) => ({
        name: getFileName(url, `file_${index}`),
        url,
      }));
    }
  },
  { deep: true, immediate: true },
);

function getFileName(url: string, defaultName?: string) {
  if (!url) return defaultName || '未知文件';
  if (url && url.includes('/')) {
    try {
      return decodeURIComponent(url.slice(url.lastIndexOf('/') + 1));
    } catch {
      return url.slice(url.lastIndexOf('/') + 1);
    }
  }
  return defaultName || '文件';
}

// 上传前校验 [cite: 14]
const handleBeforeUpload = (file: File) => {
  // 手动拦截文件数量限制
  if (fileList.value.length >= props.limit) {
    ElMessage.error(`最多只能上传 ${props.limit} 个文件`);
    return false;
  }

  // 校验文件类型 (注：文件夹上传时某些系统文件可能没有type，主要依赖后缀校验)
  // const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  // const isValidType = props.fileType.some(type =>
  //   file.type.includes(type) || fileExtension === type.toLowerCase()
  // );

  // if (!isValidType) {
  //   ElMessage.error(`文件 "${file.name}" 格式不正确，请上传 ${props.fileType.join('/')} 格式的文件`);
  //   return false;
  // }

  // 校验文件大小
  const isLt = file.size / 1024 / 1024 < props.fileSize;
  if (!isLt) {
    ElMessage.error(`文件 "${file.name}" 大小不能超过 ${props.fileSize} MB`);
    return false;
  }

  ElLoading.service({
    lock: true,
    text: '正在上传...',
    background: 'rgba(0,0,0,0.7)',
  });
  return true;
};

// 上传成功
const handleUploadSuccess = (res: any, file: any) => {
  ElLoading.service().close();

  if (res.code === 200) {
    const actualUrl =
      typeof res.data === 'string'
        ? res.data
        : res.data?.url || res.data?.fileUrl;

    // ✨ 优化：如果引入了文件夹上传，file.name 会包含相对路径（如 "folder/sub/a.txt"）
    // 我们只需要提取出纯文件名即可
    const pureName = file.name.includes('/')
      ? file.name.slice(file.name.lastIndexOf('/') + 1)
      : file.name;

    const newFile: UploadFile = {
      name: pureName,
      url: actualUrl,
      fileId: res.data?.fileId || res.data?.ossId,
    };
    fileList.value.push(newFile);
    emitValue();
    emit('success', res);
  } else {
    ElMessage.error(res.message || '上传失败');
    emit('error', res);
  }
};

const handleUploadError = (err: any) => {
  ElLoading.service().close();
  ElMessage.error('上传失败，请重试');
  emit('error', err);
};

const handleRemove = (index: number) => {
  fileList.value.splice(index, 1);
  emitValue();
};

const emitValue = () => {
  const urls = fileList.value.map((f) => f.url).filter(Boolean);
  isInnerChange.value = true;
  emit('update:modelValue', urls);
};
</script>

<template>
  <div class="upload-file">
    <el-upload
      v-if="!disabled"
      ref="uploadRef"
      :action="uploadUrl"
      :headers="headers"
      :file-list="[]"
      :accept="fileAccept"
      :before-upload="handleBeforeUpload"
      :on-success="handleUploadSuccess"
      :on-error="handleUploadError"
      :http-request="customUpload"
      :show-file-list="false"
      :disabled="fileList.length >= limit"
      :drag="drag"
      :webkitdirectory="webkitdirectory"
    >
      <template v-if="drag">
        <el-icon class="el-icon--upload"><Upload /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或 <em>点击上传</em>
          <span v-if="webkitdirectory">（支持选择整个文件夹）</span>
        </div>
      </template>

      <template v-else>
        <el-button
          type="primary"
          :icon="webkitdirectory ? Document : Upload"
          :disabled="fileList.length >= limit"
        >
          {{ webkitdirectory ? '上传文件夹' : '上传文件' }}
        </el-button>
      </template>
    </el-upload>

    <div v-if="showTip && !disabled" class="upload-tip">
      支持 {{ fileType.join('/') }} 格式，单个文件不超过 {{ fileSize }}MB，最多
      {{ limit }} 个
    </div>

    <div v-if="fileList.length > 0" class="file-list">
      <div v-for="(file, index) in fileList" :key="index" class="file-item">
        <el-link :href="file.url" target="_blank" :underline="false">
          <span class="file-name">{{ file.name }}</span>
        </el-link>
        <el-button
          v-if="!disabled"
          link
          type="danger"
          size="small"
          @click="handleRemove(index)"
        >
          删除
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.upload-file {
  // 💡 优化拖拽框的自适应宽度样式
  :deep(.el-upload-dragger) {
    padding: 20px;
    background-color: #fafafa;

    &:hover {
      border-color: #409eff;
    }
  }

  .upload-tip {
    margin-top: 8px;
    font-size: 12px;
    color: #909399;
  }

  .file-list {
    margin-top: 12px;

    .file-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      margin-bottom: 8px;
      background-color: #f5f7fa;
      border: 1px solid #ebeef5;
      border-radius: 4px;

      &:hover {
        background-color: #ecf5ff;
        border-color: #c6e2ff;
      }

      .file-name {
        display: inline-block;
        max-width: 400px;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 14px;
        color: #409eff;
        white-space: nowrap;
        cursor: pointer;
      }
    }
  }
}
</style>
