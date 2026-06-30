<script lang="ts" setup>
import type { ElTree } from "element-plus";

import { onMounted, reactive, ref, watch } from "vue";

import { MoreFilled, Search } from "@element-plus/icons-vue";

// ✨ 1. 规范 Props 声明，并适配你们项目的属性字段
const props = defineProps({
  // 异步获取树数据的 API 函数（传入封装好的 API 比传 URL 字符串更符合 TS 安全）
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
  // 🛠️ 关键改动：因为你们后端的部门属性是 deptId 和 deptName，这里做成配置项提高通用性
  nodeKey: {
    type: String,
    default: "deptId",
  },
  labelKey: {
    type: String,
    default: "deptName",
  }
});

const emits = defineEmits(["node-click"]);

const filterText = ref("");
const treeRef = ref<InstanceType<typeof ElTree>>();

const defaultProps = {
  children: "children",
  label: props.labelKey,
};

const state = reactive({
  data: [] as any[],
  loading: false,
});

// ✨ 2. 核心数据请求逻辑（改用传进来的统一 API）
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
const filterNode = (value: string, data: any) => {
  if (!value) return true;
  return data[props.labelKey].includes(value);
};

watch(filterText, (val: string) => {
  treeRef.value?.filter(val);
});

// 节点点击向外发射事件
const nodeClick = (node: any) => {
  emits("node-click", node);
};

// ✨ 3. 修复原作者“全部展开/折叠”的底层隐患，改用官方正规逻辑
const toggleExpandAll = (isExpand: boolean) => {
  if (!treeRef.value) return;
  // 通过根节点一层层向下操作节点对象的 expanded 属性，安全稳定
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
      // 点击根目录，相当于清空部门筛选条件，查全部
      emits("node-click", null);
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
          <el-input :prefix-icon="Search" v-model="filterText" :placeholder="props.tip" clearable size="default" />
        </div>
        <el-dropdown @command="handleCommand" trigger="click">
          <el-button :icon="MoreFilled" class="!px-2" />
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
