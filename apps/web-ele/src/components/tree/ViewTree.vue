<script lang="ts" setup>
import type { FilterNodeMethodFunction, TreeInstance } from "element-plus";


interface Tree {
  [key: string]: any
}

const props = defineProps({
  api: {
    type: Function,
    required: true,
  },
  tip: {
    type: String,
    default: "搜索分类",
  },
  defaultExpand: {
    type: Boolean,
    default: false,
  },
  nodeKey: {
    type: String,
    default: "deptId",
  },
  labelKey: {
    type: String,
    default: "deptName",
  }
});

const emits = defineEmits(["nodeClick"]);

const filterText = ref("");
const treeRef = ref<TreeInstance>();

const defaultProps = {
  children: "children",
  label: props.labelKey,
};

const state = reactive({
  data: [] as Tree[],
  loading: false,
});

const treeQuery = async () => {
  try {
    state.loading = true;
    const res = await props.api({ status: 0 }); // 默认查启用状态
    state.data = res || [];
  } catch (error) {
    console.error("树组件加载数据失败:", error);
  } finally {
    state.loading = false;
  }
};

// 过滤搜索
const filterNode: FilterNodeMethodFunction = (value: string, data: Tree) => {
  if (!value) return true;
  return data[props.labelKey].includes(value);
};

watch(filterText, (val: string) => {
    treeRef.value?.filter(val);

});

// 节点点击向外发射事件
const nodeClick = (node: Tree) => {
  emits("nodeClick", node);
};

const toggleExpandAll = (isExpand: boolean) => {
  if (!treeRef.value) return;
  const nodes = treeRef.value.store.nodesMap;
  for (const key in nodes) {
    if (nodes[key]) {
      nodes[key].expanded = isExpand;
    }
  }
};

const handleCommand = async (command: string) => {
  switch (command) {
    case "collapseAll": {
      toggleExpandAll(false);
      break;
    }
    case "expandAll": {
      toggleExpandAll(true);
      break;
    }
    case "refresh": {
      await treeQuery();
      break;
    }
    case "rootNode": {
      emits("nodeClick", null);
      break;
    }
  }
};

onMounted(async () => {
  await treeQuery();
});

// 暴露刷新方法给父组件
defineExpose({ refresh: treeQuery });
</script>

<template>
  <el-card class="box-card-tree" shadow="never">
    <template #header>
      <div class="flex items-center gap-1">
        <div class="flex-1">
          <el-input prefix-icon="Search" v-model="filterText" :placeholder="props.tip" clearable size="default" />
        </div>
        <el-dropdown @command="handleCommand" trigger="click">
          <el-button icon="MoreFilled" class="!px-2" />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="expandAll">全部展开</el-dropdown-item>
              <el-dropdown-item command="collapseAll">全部折叠</el-dropdown-item>
              <el-dropdown-item command="rootNode">全组织（根）</el-dropdown-item>
              <el-dropdown-item command="refresh" divided>刷新数据</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </template>
    
    <div class="tree-container thin-scrollbar" v-loading="state.loading">
      <el-tree
        ref="treeRef"
        :data="state.data"
        :props="defaultProps"
        :node-key="props.nodeKey"
        :default-expand-all="props.defaultExpand"
        :filter-node-method="filterNode"
        highlight-current
        :expand-on-click-node="false"
        @node-click="nodeClick"
      />
    </div>
  </el-card>
</template>

<style scoped lang="scss">
.box-card-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: none;
  
  :deep(.el-card__header) {
    padding: 12px;
  }
  
  :deep(.el-card__body) {
    flex: 1;
    padding: 12px;
    overflow: hidden;
  }
}

.tree-container {
  height: 100%;
  padding-bottom: 20px;
  overflow-y: auto;

  :deep(.el-tree-node__content) {
    height: 34px;
    margin-bottom: 2px;
    border-radius: 4px;
  }
}
</style>
