<script lang="ts" setup>
import { ref } from 'vue';
import { Page } from '@vben/common-ui';

import DictMainPanel from './main.vue';
import DictDataPanel from './data.vue';

// 维护一个核心纽带：当前选中的字典 ID
const currentDictId = ref<number | undefined>(undefined);
const dataPanelRef = ref();

// 当左侧点击行时，直接通知右侧刷新数据
function handleDictRowClick(dictId: number) {
  currentDictId.value = dictId;
  dataPanelRef.value?.refresh(dictId);
}
</script>

<template>
  <Page :auto-content-height="true" content-class="flex flex-col lg:flex-row gap-2">
    <DictMainPanel class="flex-1 overflow-hidden" @row-click="handleDictRowClick" />
    <DictDataPanel ref="dataPanelRef" :dict-id="currentDictId" class="flex-1 overflow-hidden" />
  </Page>
</template>
