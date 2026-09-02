<script lang="ts" setup>
import type { VersionUpdate } from '#/api/system/version';

import { onMounted, ref } from 'vue';

import { ackVersionApi, getLatestVersionApi } from '#/api/system/version';

const visible = ref(false);
const loading = ref(false);
const btnLoading = ref(false);
const versionData = ref<null | VersionUpdate>(null);

// 标签类型映射
const itemTypeMap: Record<
  number,
  { label: string; type: 'primary' | 'success' | 'warning' }
> = {
  1: { label: '新增', type: 'primary' },
  2: { label: '优化', type: 'success' },
  3: { label: '修复', type: 'warning' },
};

async function checkVersionUpdate() {
  try {
    loading.value = true;
    const res = await getLatestVersionApi();
    // 只有当有数据且未确认 (acked === false) 时才弹窗
    if (res && res.acked === false) {
      versionData.value = res;
      visible.value = true;
    }
  } catch (error) {
    console.error('获取最新版本失败', error);
  } finally {
    loading.value = false;
  }
}

async function handleAck() {
  if (!versionData.value?.versionUpdateId) return;
  try {
    btnLoading.value = true;
    await ackVersionApi(versionData.value.versionUpdateId);
    visible.value = false;
  } catch (error) {
    console.error('确认版本失败', error);
  } finally {
    btnLoading.value = false;
  }
}

onMounted(() => {
  checkVersionUpdate();
});
</script>

<template>
  <el-dialog
    v-model="visible"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    width="520px"
    class="version-update-dialog"
    destroy-on-close
    append-to-body
  >
    <!-- 头部自定义结构 -->
    <template #header>
      <div class="version-header">
        <div class="version-tag">{{ versionData?.version || '新版本' }}</div>
        <div class="version-title">
          {{ versionData?.title || '新版本发布' }}
        </div>
        <div class="version-time">{{ versionData?.publishTime }}</div>
      </div>
    </template>

    <!-- 内容区域 -->
    <div v-loading="loading" class="version-body">
      <!-- 统计简报 -->
      <div class="version-summary">
        <span v-if="versionData?.newCount">
          <b class="text-primary">{{ versionData.newCount }}</b> 项新增
        </span>
        <span v-if="versionData?.optimizeCount">
          <b class="text-success">{{ versionData.optimizeCount }}</b> 项优化
        </span>
        <span v-if="versionData?.fixCount">
          <b class="text-warning">{{ versionData.fixCount }}</b> 项修复
        </span>
      </div>

      <!-- 按分组渲染日志明细 -->
      <div class="version-groups">
        <div
          v-for="group in versionData?.itemGroups"
          :key="group.itemType"
          class="group-item"
        >
          <div class="group-title">
            <el-tag
              :type="itemTypeMap[group.itemType]?.type || 'info'"
              size="small"
              effect="dark"
            >
              {{ group.itemTypeName }}
            </el-tag>
            <span class="group-count">（{{ group.count }}条）</span>
          </div>
          <ul class="content-list">
            <li v-for="(content, idx) in group.contents" :key="idx">
              {{ content }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="version-footer">
        <el-button
          type="primary"
          size="large"
          round
          class="ack-btn"
          :loading="btnLoading"
          @click="handleAck"
        >
          我知道了，立即体验
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.version-update-dialog {
  :deep(.el-dialog__header) {
    padding: 0;
    margin-right: 0;
  }

  :deep(.el-dialog__body) {
    padding: 20px 24px 10px;
  }

  :deep(.el-dialog__footer) {
    padding: 10px 24px 20px;
  }
}

.version-header {
  padding: 24px 24px 16px;
  color: #fff;
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
  border-radius: 8px 8px 0 0;

  .version-tag {
    display: inline-block;
    padding: 2px 8px;
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: bold;
    background: rgb(255 255 255 / 20%);
    border-radius: 4px;
  }

  .version-title {
    font-size: 18px;
    font-weight: 600;
    line-height: 1.4;
  }

  .version-time {
    margin-top: 6px;
    font-size: 12px;
    opacity: 0.8;
  }
}

.version-body {
  .version-summary {
    display: flex;
    gap: 16px;
    padding-bottom: 12px;
    margin-bottom: 16px;
    font-size: 13px;
    color: #64748b;
    border-bottom: 1px dashed #e2e8f0;

    b {
      font-size: 15px;
    }
  }

  .version-groups {
    max-height: 320px;
    overflow-y: auto;

    .group-item {
      margin-bottom: 16px;

      .group-title {
        display: flex;
        gap: 6px;
        align-items: center;
        margin-bottom: 8px;

        .group-count {
          font-size: 12px;
          color: #94a3b8;
        }
      }

      .content-list {
        padding-left: 20px;
        margin: 0;

        li {
          margin-bottom: 6px;
          font-size: 13px;
          line-height: 1.5;
          color: #334155;
          list-style-type: disc;
        }
      }
    }
  }
}

.version-footer {
  display: flex;
  justify-content: center;

  .ack-btn {
    width: 80%;
    font-weight: 500;
  }
}
</style>
