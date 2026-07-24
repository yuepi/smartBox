<script lang="ts" setup>
import type { Member } from '#/api/member/member';

import { getMemberDetailApi } from '#/api/member/member';

import AuthList from './AuthList.vue';

const { member_status } = useDicts(['member_status']);

const visible = ref(false);
const activeTab = ref('basic');
const detailData = ref<Member | null>(null);

function getSexText(sex: number): string {
  const map: Record<number, string> = { 0: '未知', 1: '男', 2: '女' };
  return map[sex] || '未知';
}

function getStatusText(status: number): string {
  const map: Record<number, string> = { 0: '启用', 1: '禁用', 2: '黑名单' };
  return map[status] || '未知';
}

function getStatusType(status: number): string {
  const map: Record<number, string> = { 0: 'success', 1: 'danger', 2: 'warning' };
  return map[status] || 'info';
}

async function open(row: Member) {
  visible.value = true;
  activeTab.value = 'basic';
  try {
    const res = await getMemberDetailApi(row.memberId);
    detailData.value = res;
  } catch {
    ElMessage.error('获取详情失败');
    visible.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="会员详情" width="800px" append-to-body>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="基本信息" name="basic">
        <el-descriptions :column="1" border v-if="detailData">
          <el-descriptions-item label="会员ID">{{ detailData.memberId }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detailData.mobile }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ detailData.nickname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ getSexText(detailData.sex) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(detailData.status)" size="small">
              {{ getStatusText(detailData.status) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>
      <el-tab-pane label="认证信息" name="auth">
        <AuthList :member-id="detailData?.memberId" :member-name="detailData?.nickname" />
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
