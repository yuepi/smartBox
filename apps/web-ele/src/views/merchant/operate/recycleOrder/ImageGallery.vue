<script lang="ts" setup>
import { ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Delete, Picture, VideoCamera, Upload } from '@element-plus/icons-vue';

import {
  getRecycleOrderImageListApi,
  addRecycleOrderImageApi,
  deleteRecycleOrderImageApi,
  type RecycleOrderImage,
} from '#/api/operation/recycleOrderImage';

const props = defineProps<{
  orderId: number;
  orderNo?: string;
}>();

const emit = defineEmits<{
  (e: 'update', count: number): void;
}>();

const loading = ref(false);
const imageList = ref<RecycleOrderImage[]>([]);

// 预览相关
const previewVisible = ref(false);
const previewUrl = ref('');
const previewType = ref<'image' | 'video'>('image');

// 上传相关
const uploadVisible = ref(false);
const uploadType = ref<0 | 1>(0); // 0=图片,1=视频
const uploadUrl = ref('');
const uploadSubmitting = ref(false);

// 获取附件列表
async function loadImageList() {
  if (!props.orderId) return;

  loading.value = true;
  try {
    const res = await getRecycleOrderImageListApi(props.orderId);
    imageList.value = res || [];
    emit('update', imageList.value.length);
  } catch (error) {
    console.error(error);
    ElMessage.error('加载附件失败');
  } finally {
    loading.value = false;
  }
}

// 预览
function handlePreview(item: RecycleOrderImage) {
  previewUrl.value = item.url;
  previewType.value = item.type === 0 ? 'image' : 'video';
  previewVisible.value = true;
}

// 删除
async function handleDelete(item: RecycleOrderImage) {
  try {
    await ElMessageBox.confirm('确定要删除该附件吗？', '提示', { type: 'warning' });
    await deleteRecycleOrderImageApi(item.recycleOrderImageId);
    ElMessage.success('删除成功');
    await loadImageList();
  } catch {
    // 取消删除
  }
}

// 上传附件
function handleUpload() {
  uploadType.value = 0;
  uploadUrl.value = '';
  uploadVisible.value = true;
}

function handleUploadVideo() {
  uploadType.value = 1;
  uploadUrl.value = '';
  uploadVisible.value = true;
}

async function handleUploadSubmit() {
  if (!uploadUrl.value.trim()) {
    ElMessage.warning('请输入文件地址');
    return;
  }

  uploadSubmitting.value = true;
  try {
    const res = await addRecycleOrderImageApi({
      recycleOrderId: props.orderId,
      type: uploadType.value,
      url: uploadUrl.value,
      sort: imageList.value.length,
      status: 0,
    });
    if (res.code === 200) {
      ElMessage.success('添加成功');
      uploadVisible.value = false;
      await loadImageList();
    } else {
      ElMessage.error(res.message || '添加失败');
    }
  } catch {
    ElMessage.error('添加失败');
  } finally {
    uploadSubmitting.value = false;
  }
}

// 监听订单ID变化
watch(() => props.orderId, () => {
  if (props.orderId) {
    loadImageList();
  } else {
    imageList.value = [];
  }
}, { immediate: true });

defineExpose({ loadImageList });
</script>

<template>
  <div class="image-gallery">
    <!-- 操作按钮 -->
    <div class="mb-3 flex gap-2">
      <el-button type="primary" size="small" :icon="Picture" @click="handleUpload">
        添加图片
      </el-button>
      <el-button type="success" size="small" :icon="VideoCamera" @click="handleUploadVideo">
        添加视频
      </el-button>
    </div>

    <!-- 附件列表 -->
    <div v-loading="loading" class="gallery-grid">
      <div
        v-for="item in imageList"
        :key="item.recycleOrderImageId"
        class="gallery-item"
        @click="handlePreview(item)"
      >
        <!-- 图片 -->
        <div v-if="item.type === 0" class="image-item">
          <el-image
            :src="item.url"
            fit="cover"
            class="w-full h-full"
            :preview-src-list="[item.url]"
            :preview-teleported="true"
          />
          <div class="item-actions">
            <el-button
              link
              type="danger"
              :icon="Delete"
              size="small"
              @click.stop="handleDelete(item)"
            />
          </div>
        </div>
        <!-- 视频 -->
        <div v-else class="video-item">
          <video :src="item.url" class="w-full h-full object-cover" />
          <div class="video-play-icon">
            <el-icon :size="32"><VideoCamera /></el-icon>
          </div>
          <div class="item-actions">
            <el-button
              link
              type="danger"
              :icon="Delete"
              size="small"
              @click.stop="handleDelete(item)"
            />
          </div>
        </div>
        <div class="item-type">
          <el-tag :type="item.type === 0 ? 'primary' : 'success'" size="small">
            {{ item.type === 0 ? '图片' : '视频' }}
          </el-tag>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && imageList.length === 0" class="empty-state">
        <el-empty description="暂无附件" :image-size="80" />
      </div>
    </div>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" title="预览" width="600px" append-to-body center>
      <div class="preview-container">
        <img v-if="previewType === 'image'" :src="previewUrl" class="preview-image" />
        <video v-else :src="previewUrl" controls class="preview-video" />
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 添加附件弹窗 -->
    <el-dialog
      v-model="uploadVisible"
      :title="uploadType === 0 ? '添加图片' : '添加视频'"
      width="500px"
      append-to-body
    >
      <el-form label-width="80px">
        <el-form-item label="文件地址" required>
          <el-input
            v-model="uploadUrl"
            :placeholder="uploadType === 0 ? '请输入图片URL' : '请输入视频URL'"
          />
          <div class="text-gray-400 text-xs mt-1">
            支持输入网络图片/视频地址
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploadSubmitting" @click="handleUploadSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.gallery-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #e4e7ed;
  transition: all 0.2s;
}

.gallery-item:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.gallery-item:hover .item-actions {
  opacity: 1;
}

.image-item,
.video-item {
  width: 100%;
  height: 100%;
  background-color: #f5f7fa;
}

.video-item {
  position: relative;
}

.video-play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.8);
  pointer-events: none;
}

.item-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  padding: 2px;
}

.item-type {
  position: absolute;
  bottom: 4px;
  left: 4px;
}

.empty-state {
  grid-column: 1 / -1;
  padding: 40px 0;
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.preview-image {
  max-width: 100%;
  max-height: 500px;
  object-fit: contain;
}

.preview-video {
  max-width: 100%;
  max-height: 500px;
}
</style>