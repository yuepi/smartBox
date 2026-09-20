<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { HomeCategory } from '#/api/system/homeCategory';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteHomeCategoryApi,
  getHomeCategoryListApi,
} from '#/api/system/homeCategory';

import HomeCategoryDrawer from './HomeCategoryDrawer.vue';
import HomeItemEditDialog from '#/views/merchant/housekeeping/item/HomeItemEditDialog.vue';
import { categoryImage } from './defaultImages';

const drawerRef = ref();
const serviceEditorRef = ref<InstanceType<typeof HomeItemEditDialog>>();
const isLeaf = (row: HomeCategory) => !categoryTreeData.value.some((item) => item.parentId === row.categoryId);
const categoryTreeData = ref<HomeCategory[]>([]);
const isExpanded = ref(true); // 记录当前展开/收起状态

// 表格列定义
const defaultColumns: VxeGridProps<HomeCategory>['columns'] = [
  { field: 'categoryId', title: '类目ID', width: 100, align: 'center' },
  {
    field: 'categoryName',
    title: '类目名称',
    treeNode: true,
    minWidth: 220,
    align: 'left',
  },
  { field: 'imageUrl', title: '默认图片', width: 100, slots: { default: 'image' } },
  { field: 'defaultPrice', title: '默认起价', width: 140, slots: { default: 'price' } },
  {
    field: 'level',
    title: '层级',
    width: 90,
    align: 'center',
    slots: { default: 'level' },
  },
  { field: 'sort', title: '排序', width: 90, align: 'center' },
  {
    field: 'status',
    title: '状态',
    width: 100,
    align: 'center',
    slots: { default: 'status' },
  },
  {
    field: 'action',
    title: '操作',
    width: 300,
    fixed: 'right',
    align: 'center',
    slots: { default: 'action' },
  },
];

// VXE Grid 树形配置
const gridOptions: VxeGridProps<HomeCategory> = {
  id: 'home_category_table',
  columns: defaultColumns,
  height: 'auto',
  treeConfig: {
    transform: true,
    rowField: 'categoryId',
    parentField: 'parentId',
    expandAll: true, // 默认展开所有节点
  },
  checkboxConfig: {
    range: false,
  },
  pagerConfig: {
    enabled: false,
  },
  proxyConfig: {
    ajax: {
      query: async () => {
        const rawList = await getHomeCategoryListApi();
        categoryTreeData.value = rawList; // 留存一份给弹窗下拉选择用
        return rawList;
      },
    },
  },
};

const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });

// 展开 / 折叠 切换
function handleToggleExpand() {
  isExpanded.value = !isExpanded.value;
  if (isExpanded.value) {
    gridApi.grid?.setAllTreeExpand(true);
  } else {
    gridApi.grid?.clearTreeExpand();
  }
}

// 新增/编辑/添加子类目
function handleAdd(parentId = 0) {
  drawerRef.value?.open({ parentId }, categoryTreeData.value);
}

function handleEdit(row: HomeCategory) {
  if (row.level > 1 && isLeaf(row)) {
    // 末级始终打开完整服务编辑器，不依赖历史配置标记隐藏规格/附加项。
    serviceEditorRef.value?.open({ categoryId: row.categoryId, itemName: row.categoryName, unit: 'time', status: 0 });
  } else {
    drawerRef.value?.open(row, categoryTreeData.value);
  }
}

function handleAddChild(row: HomeCategory) {
  if (row.level >= 3 || row.defaultServiceConfigured) return;
  drawerRef.value?.open({ parentId: row.categoryId }, categoryTreeData.value);
}

// 删除
async function handleDelete(row: HomeCategory) {
  try {
    await ElMessageBox.confirm(
      `确定要删除类目「${row.categoryName}」吗？`,
      '警告',
      { type: 'warning' },
    );
    await deleteHomeCategoryApi(row.categoryId);
    ElMessage.success('删除成功');
    gridApi.reload();
  } catch {
    // 取消删除
  }
}
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <!-- 工具栏按钮 -->
      <template #toolbar-actions>
        <span class="mr-3 text-sm text-gray-500">各级类目可维护图片，具体末级类目可配置默认价格</span>
        <el-button type="primary" icon="Plus" @click="handleAdd(0)">
          新增类目
        </el-button>
        <el-button @click="handleToggleExpand">
          {{ isExpanded ? '折叠全部' : '展开全部' }}
        </el-button>
      </template>

      <!-- 层级标签插槽 -->
      <template #image="{ row }">
        <el-image :src="categoryImage(row)" fit="contain" style="width: 48px; height: 48px" :preview-src-list="[categoryImage(row)]" preview-teleported />
      </template>
      <template #price="{ row }">
        <span v-if="row.level === 1 || !isLeaf(row)">不定价</span>
        <span v-else-if="row.defaultPrice != null">¥{{ Number(row.defaultPrice).toFixed(2) }}/{{ { time: '次', pcs: '台', hour: '小时' }[row.pricingUnit || 'time'] }}</span>
        <span v-else>{{ row.defaultServiceConfigured ? '查看规格价格' : '未配置' }}</span>
      </template>
      <template #level="{ row }">
        <el-tag
          :type="
            row.level === 1
              ? 'primary'
              : row.level === 2
                ? 'success'
                : 'warning'
          "
        >
          {{ row.level }} 级
        </el-tag>
      </template>

      <!-- 状态插槽 -->
      <template #status="{ row }">
        <el-tag :type="row.status === 0 ? 'success' : 'danger'">
          {{ row.status === 0 ? '正常' : '停用' }}
        </el-tag>
      </template>

      <!-- 操作列插槽 -->
      <template #action="{ row }">
        <div class="flex flex-wrap items-center justify-center gap-1">
          <el-button v-access:code="['plat:homeCategory:edit']" size="small" type="primary" link @click="handleEdit(row)">
            编辑
          </el-button>
          <el-button
            v-if="row.level < 3 && !row.defaultServiceConfigured"
            size="small"
            type="primary"
            link
            @click="handleAddChild(row)"
          >
            新增子类目
          </el-button>
          <el-button
            size="small"
            type="danger"
            link
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </div>
      </template>
    </Grid>

    <!-- 抽屉/弹窗组件 -->
    <HomeCategoryDrawer ref="drawerRef" @success="gridApi.reload()" />
    <HomeItemEditDialog ref="serviceEditorRef" platform-default category-edit @success="gridApi.reload()" />
  </Page>
</template>
