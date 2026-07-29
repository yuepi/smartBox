<script lang="ts" setup>
import { getMerchantInfoApi } from '#/api/system/merchant';

const props = defineProps<{ merchantId: number }>();

const loading = ref(false);
const info = ref<any>(null);

async function loadData() {
  if (!props.merchantId) {
    console.warn('merchantId 为空，无法加载商户信息');
    return;
  }
  loading.value = true;
  try {
    const res = await getMerchantInfoApi(props.merchantId);
    info.value = res;
  } catch {
    ElMessage.error('获取商户信息失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div v-loading="loading" class="basic-info">
    <el-descriptions :column="2" border v-if="info">
      <el-descriptions-item label="商户ID">{{ info.merchantId }}</el-descriptions-item>
      <el-descriptions-item label="商户名称">{{ info.merchantName }}</el-descriptions-item>
      <el-descriptions-item label="商户编码">{{ info.merchantCode }}</el-descriptions-item>
      <el-descriptions-item label="联系人">{{ info.contact || '-' }}</el-descriptions-item>
      <el-descriptions-item label="联系电话">{{ info.phone || '-' }}</el-descriptions-item>
      <el-descriptions-item label="商户状态">
        <el-tag :type="info.status === 0 ? 'success' : 'danger'" size="small">
          {{ info.status === 0 ? '启用' : '禁用' }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="所在区域" :span="2">
        {{ info.province }} {{ info.city }} {{ info.district }}
      </el-descriptions-item>
      <el-descriptions-item label="详细地址" :span="2">
        {{ info.detailAddress || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="地理位置" :span="2">
        <span v-if="info.longitude && info.latitude">
          经度：{{ info.longitude }}，纬度：{{ info.latitude }}
        </span>
        <span v-else>-</span>
      </el-descriptions-item>
      <el-descriptions-item label="商户Logo" :span="2">
        <el-image
v-if="info.logo" :src="info.logo" :preview-src-list="[info.logo]" fit="cover"
          style="width: 60px; height: 60px; border-radius: 8px"
/>
        <span v-else>-</span>
      </el-descriptions-item>
    </el-descriptions>
  </div>
</template>
