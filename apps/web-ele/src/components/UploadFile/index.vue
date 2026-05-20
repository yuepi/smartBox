<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useAccessStore } from '@vben/stores';

import { Upload } from '@element-plus/icons-vue';
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
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  limit: 5,
  fileSize: 10,
  fileType: () => ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar'],
  isShowTip: true,
  action: '/common/upload/uploadFile',
  disabled: false,
});

const emit = defineEmits(['update:modelValue', 'success', 'error']);

const { uploadToOss } = useOssUpload();

const customUpload = async (options: any) => {
  const { file, onSuccess, onError } = options;
  try {
    const url = await uploadToOss(file);
    // 调用你原来的成功处理逻辑 [cite: 20]
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

// 💡 新增：防止父子双向绑定导致的数据二次解析死循环标记
const isInnerChange = ref(false);

const fileAccept = computed(() => props.fileType.map(type => `.${type}`).join(','));
const showTip = computed(() => props.isShowTip && (props.fileType.length || props.fileSize));

// 监听外部值变化
watch(
  () => props.modelValue,
  (val) => {
    // 如果是组件内部 emit 激发的变动，直接拦截，不重置本地的 fileList 名字
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
          url: url,
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

// 获取文件名（从URL中提取）
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

// 上传前校验
const handleBeforeUpload = (file: File) => {
  // 💡 核心安全策略：由于绑了空数组，必须在前端手动硬拦截 limit
  if (fileList.value.length >= props.limit) {
    ElMessage.error(`最多只能上传 ${props.limit} 个文件`);
    return false;
  }

  // 校验文件类型
  // const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  // const isValidType = props.fileType.some(type =>
  //   file.type.includes(type) || fileExtension === type.toLowerCase()
  // );

  // if (!isValidType) {
  //   ElMessage.error(`文件格式不正确，请上传 ${props.fileType.join('/')} 格式的文件`);
  //   return false;
  // }

  // 校验文件大小
  const isLt = file.size / 1024 / 1024 < props.fileSize;
  if (!isLt) {
    ElMessage.error(`上传文件大小不能超过 ${props.fileSize} MB`);
    return false;
  }

  // 校验全部通过后才开启 Loading
  ElLoading.service({ lock: true, text: '正在上传...', background: 'rgba(0,0,0,0.7)' });
  return true;
};

// 上传成功
const handleUploadSuccess = (res: any, file: any) => {
  ElLoading.service().close();

  if (res.code === 200) {
    // 💡 核心修改：兼容后端 data 直接返回字符串 URL 的情况
    const actualUrl = typeof res.data === 'string' 
      ? res.data 
      : (res.data?.url || res.data?.fileUrl);

    const newFile: UploadFile = {
      name: file.name,
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

// 上传失败
const handleUploadError = (err: any) => {
  ElLoading.service().close();
  ElMessage.error('上传失败，请重试');
  emit('error', err);
};

// 删除文件
const handleRemove = (index: number) => {
  fileList.value.splice(index, 1);
  emitValue();
};

// 发送数据给父组件
const emitValue = () => {
  const urls = fileList.value.map(f => f.url).filter(Boolean);
  isInnerChange.value = true; // 锁定：告诉 watch 这是我自己改的，不要瞎洗我的数据
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
    >
      <el-button 
        type="primary" 
        :icon="Upload" 
        :disabled="fileList.length >= limit"
      >
        上传文件
      </el-button>
    </el-upload>

    <div v-if="showTip && !disabled" class="upload-tip">
      支持 {{ fileType.join('/') }} 格式，单个文件不超过 {{ fileSize }}MB，最多 {{ limit }} 个
    </div>

    <div v-if="fileList.length > 0" class="file-list">
      <div
        v-for="(file, index) in fileList"
        :key="index"
        class="file-item"
      >
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
