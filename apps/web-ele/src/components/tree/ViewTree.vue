<script lang="ts" setup>
import type { ElTree } from 'element-plus';

import { requestClient } from '#/api/request';

const props = defineProps({
  url: {
    type: String,
    required: true,
  },
  tip: {
    type: String,
    default: '分类名称',
    required: false,
  },
  expand: {
    type: Boolean,
    default: false,
    required: false,
  },
});

const emits = defineEmits(['node-click']);
const filterText = ref('');
const treeRef = ref<InstanceType<typeof ElTree>>();

const defaultProps = {
  children: 'children',
  label: 'name',
};

const state = reactive({
  data: [] as any,
  willInit: true,
  form: {} as any,
});

const handleCommand = async (command: number | object | string) => {
  switch (command) {
    case 'collapseAll': {
      for (let i = 0; i < treeRef.value!.store._getAllNodes().length; i++) {
        treeRef.value!.store._getAllNodes()[i].expanded = false;
      }
      break;
    }
    case 'expandAll': {
      for (let i = 0; i < treeRef.value!.store._getAllNodes().length; i++) {
        treeRef.value!.store._getAllNodes()[i].expanded = true;
      }
      break;
    }
    case 'refresh': {
      await treeQuery();
      break;
    }
    case 'rootNode': {
      emits('node-click', { id: '', name: '' });
      break;
    }
  }
};

const treeQuery = async () => {
  state.data = await requestClient.get(`${props.url}`, { params: state.form });
};

const filterNode = (value: string, data: any) => {
  if (!value) return true;
  return data.name.includes(value);
};

watch(filterText, (val: string) => {
  treeRef.value!.filter(val);
});

const nodeClick = (node: any) => {
  emits('node-click', { id: node.id, name: node.name, type:node.type });
};

const init = async () => {
  await treeQuery();
};
defineExpose({ init });

onMounted(async () => {
  await treeQuery();
});
</script>

<template>
  <el-card class="box-card" style="height: 100%" body-style="height: 100%;overflow: auto" body-class="thin-scrollbar">
    <template #header>
      <div style="display: flex">
        <div style="flex: 1; width: 100%">
          <el-input prefix-icon="Search" v-model="filterText" :placeholder="props.tip" />
        </div>
        <div style="width: 42px; min-width: 42px">
          <el-dropdown @command="handleCommand">
            <el-button style="width: 34px; margin-left: 8px">
              <el-icon class="el-icon--center">
                <MoreFilled />
              </el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="expandAll">全部展开</el-dropdown-item>
                <el-dropdown-item command="collapseAll">全部折叠</el-dropdown-item>
                <el-dropdown-item command="rootNode">根目录</el-dropdown-item>
                <el-dropdown-item command="refresh">刷新</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </template>
    <div style="margin-bottom: 45px">
      <el-tree
        :default-expand-all="props.expand"
        highlight-current
        node-key="id"
        ref="treeRef"
        :data="state.data"
        :props="defaultProps"
        class="filter-tree"
        :filter-node-method="filterNode"
        @node-click="nodeClick"
      />
    </div>
  </el-card>
</template>

<style scoped lang="less">
.thin-scrollbar {
  &::-webkit-scrollbar {
    width: 5px;
  }
}

:deep(.el-card__body) {
  @apply thin-scrollbar;
}
</style>
