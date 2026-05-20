<script lang="ts" setup>
import type { ElTree } from 'element-plus';

import { reactive, ref, toRefs } from 'vue';

import { requestClient } from '#/api/request';
import { modalSave } from '#/utils/page/edit';
import { listQuery } from '#/utils/page/list';

const props = defineProps({
  url: {
    type: String,
    required: true,
  },
  tip: {
    type: String,
    default: '分类',
    required: false,
  },
  type: {
    type: Number,
    default: 1,
    required: false,
  },
});

const emits = defineEmits(['node-click']);

interface Tree {
  id: number;
  name: string;
  children?: Tree[];
}

const filterText = ref('');
const treeRef = ref<InstanceType<typeof ElTree>>();

const defaultProps = {
  children: 'children',
  label: 'name',
};

watch(filterText, (val) => {
  treeRef.value!.filter(val);
});

const filterNode = (value: string, data: Tree) => {
  if (!value) return true;
  return data.name.includes(value);
};

const state = reactive({
  data: [] as any,
  optionCardX: '',
  optionCardY: '',
  optionCardShow: false,
  optionData: [],
  show: false,
  form: {} as any,
  type: 'add',
  url: '',
});

const handleCommand = async (command: number | object | string) => {
  if (command === 'expandAll') {
    for (let i = 0; i < treeRef.value!.store._getAllNodes().length; i++) {
      treeRef.value!.store._getAllNodes()[i].expanded = true;
    }
  } else if (command === 'collapseAll') {
    for (let i = 0; i < treeRef.value!.store._getAllNodes().length; i++) {
      treeRef.value!.store._getAllNodes()[i].expanded = false;
    }
  } else if (command === 'refresh') {
    await initTreeData();
  } else if (command === 'rootNode') {
    emits('node-click', { id: '', name: '' });
  } else if (command === 'addCate') {
    await openModal({});
  }
};

const recAddUpdate = (updateNode: any, targetNode: any) => {
  if (targetNode.id === updateNode.pid) {
    if (targetNode.children === null) {
      targetNode.children = [];
    }
    targetNode.children.push(updateNode);
    return true;
  }
  if (targetNode.children) {
    for (const targetSunNode of targetNode.children) {
      const back = recAddUpdate(updateNode, targetSunNode);
      if (back) {
        return true;
      }
    }
  }
  return false;
};

const recEditUpdate = (updateNode: any, targetNode: any) => {
  if (targetNode.id === updateNode.id) {
    targetNode.name = updateNode.name;
    targetNode.notes = updateNode.notes;
    return true;
  }
  if (targetNode.children) {
    for (const targetSunNode of targetNode.children) {
      const back = recEditUpdate(updateNode, targetSunNode);
      if (back) {
        return true;
      }
    }
  }
  return false;
};

let currNode = {} as any;
const nodeClick = (node: any) => {
  state.optionCardShow = false;
  currNode = { id: node.id, name: node.name };
  emits('node-click', { id: node.id, name: node.name });
};

const rightClick = (e: any, data: any, n: any, t: any) => {
  state.optionCardShow = false;
  state.optionCardX = e.x;
  state.optionCardY = e.y;
  state.optionData = data;
  state.optionCardShow = true;
  document.addEventListener('click', rightClose);
};

const rightClose = () => {
  state.optionCardShow = false;
  document.removeEventListener('click', rightClose);
};

onMounted(async () => {
  await initTreeData();
});

const initTreeData = async () => {
  state.data = await requestClient.get(`${props.url}/tree`);
};

// region -----树拖拽逻辑-----
const handleDragStart = (node: any, ev: any) => {
  console.log('DragStart');
};
const handleDragEnter = (draggingNode: any, dropNode: any, ev: any) => {
  console.log('DragEnter');
};
const handleDragLeave = (draggingNode: any, dropNode: any, ev: any) => {
  console.log('DragLeave');
};
const handleDragOver = (draggingNode: any, dropNode: Node, ev: any) => {
  console.log('DragOver');
};
const handleDragEnd = async (draggingNode: any, dropNode: any, dropType: any, ev: any) => {
  console.log('DragEnd');
};
const handleDrop = async (draggingNode: any, dropNode: any, dropType: any, ev: any) => {
  await requestClient.post(`${props.url}/move`, {
    type: dropType,
    draid: draggingNode.data.id,
    droid: dropNode.data.id,
  });
  console.log('handleDrop');
};
const allowDrop = (draggingNode: any, dropNode: any, type: any) => {
  return !(props.type === 0 && type === 'inner');
};
const allowDrag = (draggingNode: any) => {
  return true;
};
// endregion

const addChildCate = async () => {
  await openModal({ pid: currNode.id });
};
const editCate = async () => {
  await openModal({ id: currNode.id });
};
const deleteCate = async () => {
  ElMessageBox.confirm('确认要删除吗?', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      await requestClient.delete(`${props.url}/${currNode.id}`);
      treeRef.value!.remove(currNode);
    })
    .catch(() => ElMessage.info('已取消删除'));
};

// edit逻辑
const rdata = reactive({} as any);
const { form } = toRefs(state);
const formRef = ref();
const openModal = async (data: any) => {
  if (data && data.id) {
    state.form = await requestClient.get(`${props.url}/info/${data.id}`);
    state.type = 'edit';
    if (state.form.pid === 0 || state.form.pid === '0') {
      delete state.form.pid;
    }
  } else {
    state.type = 'add';
    state.form = { avtag: true, children: [] };
    if (data.pid) {
      state.form.pid = data.pid;
    }
  }
  rdata.cates = await (data?.id ? requestClient.get(`${props.url}/tree?id=${data?.id}`) : requestClient.get(`${props.url}/tree`));
  state.show = true;
  formRef?.value?.clearValidate();
};

const save = async () => {
  if (!state.form.name) {
    ElMessage.warning('分类名称必须填写');
    return;
  }
  state.url = props.url;
  const backNode = {} as any;
  backNode.id = await modalSave({ formRef: formRef.value, state });
  if (backNode.id) {
    backNode.name = state.form.name;
    backNode.notes = state.form.notes;
    backNode.pid = state.form.pid;
    backNode.children = state.form.children;
  }
  state.show = false;

  if (state.type === 'add') {
    if (backNode.pid === 0 || backNode.pid === null || backNode.pid === undefined) {
      state.data.push(backNode);
    } else {
      for (const targetNode of state.data) {
        const back = recAddUpdate(backNode, targetNode);
        if (back) {
          break;
        }
      }
    }
  } else if (state.type === 'edit') {
    for (const targetNode of state.data) {
      const back = recEditUpdate(backNode, targetNode);
      if (back) {
        break;
      }
    }
    currNode.name = backNode.name;
    currNode.notes = backNode.notes;
  }
};
</script>

<template>
  <el-card class="box-card" style="height: 100%" body-style="height: 100%;overflow: auto" body-class="thin-scrollbar">
    <template #header>
      <div class="card-header">
        <div class="tree-h-flex">
          <div class="tree-h-left">
            <div>
              <el-input prefix-icon="Search" v-model="filterText" :placeholder="`${props.tip} 可拖拽可右键`" />
            </div>
          </div>
          <div class="tree-h-right">
            <div>
              <el-dropdown @command="handleCommand">
                <el-button style="margin-left: 8px; width: 34px">
                  <el-icon class="el-icon--center">
                    <MoreFilled />
                  </el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="addCate">新增{{ props.tip }}</el-dropdown-item>
                    <el-dropdown-item command="expandAll" v-if="props.type === 1">全部展开</el-dropdown-item>
                    <el-dropdown-item command="collapseAll" v-if="props.type === 1">全部折叠</el-dropdown-item>
                    <el-dropdown-item command="rootNode">根目录</el-dropdown-item>
                    <el-dropdown-item command="refresh">刷新</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
      </div>
    </template>
    <div style="margin-bottom: 88px; font-family: 'Courier New', Helvetica, Arial, sans-serif">
      <el-tree
        highlight-current
        @node-contextmenu="rightClick"
        node-key="id"
        ref="treeRef"
        class="filter-tree"
        :data="state.data"
        :props="defaultProps"
        :filter-node-method="filterNode"
        @node-click="nodeClick"
        draggable
        :allow-drop="allowDrop"
        :allow-drag="allowDrag"
        @node-drag-start="handleDragStart"
        @node-drag-enter="handleDragEnter"
        @node-drag-leave="handleDragLeave"
        @node-drag-over="handleDragOver"
        @node-drag-end="handleDragEnd"
        @node-drop="handleDrop"
      />
      <div
        class="op-group"
        :style="{ 'z-index': 9999, width: '100px', position: 'fixed', left: `${state.optionCardX}px`, top: `${state.optionCardY}px` }"
        v-show="state.optionCardShow"
        id="option-button-group"
      >
        <el-button class="option-card-button" @click="addChildCate" style="border-bottom: 0" v-if="props.type === 1"> 新增{{ props.tip }} </el-button>
        <el-button class="option-card-button" @click="editCate" style="border-bottom: 0"> 修改{{ props.tip }} </el-button>
        <el-button class="option-card-button" @click="deleteCate">删除{{ props.tip }}</el-button>
      </div>
      <el-dialog v-model="state.show" :title="`${props.tip}编辑`" draggable width="500px">
        <el-form ref="formRef" :model="form" label-width="120px">
          <el-form-item label="上级分类" v-if="props.type === 1">
            <el-tree-select v-model="form.pid" :data="rdata.cates" :props="{ value: 'id', label: 'name' } as any" value-key="id" placeholder="选择上级分类" check-strictly />
          </el-form-item>
          <el-form-item label="分类名称" prop="name" :rules="[{ required: true, message: '分类名称不能为空' }]">
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item label="是否可用" prop="avtag" style="width: 50%" v-if="props.type === 1">
            <el-switch v-model="form.avtag" />
          </el-form-item>
          <el-form-item label="备注：" prop="notes">
            <el-input type="textarea" :rows="4" v-model="form.notes" />
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button type="primary" @click="save">保 存</el-button>
            <el-button @click="state.show = false">取 消</el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </el-card>
</template>

<style scoped lang="less">
.tree-h-flex {
  display: flex;
}

.tree-h-left {
  flex: 1;
  width: 100%;
}

.tree-h-right {
  width: 42px;
  min-width: 42px;
}

.option-card-button {
  width: 100%;
  margin-left: 0;
  font-size: 10px;
  border-radius: 0;
}

.op-group {
  background-color: #1f1f1f;
}

.thin-scrollbar {
  &::-webkit-scrollbar {
    width: 5px;
  }
}

:deep(.el-card__body) {
  @apply thin-scrollbar;
}
</style>
