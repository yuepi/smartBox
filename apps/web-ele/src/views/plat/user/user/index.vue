<script lang="ts" setup>
import type { Dept } from '#/api/system/dept';
import type { User, UserPageParams } from '#/api/system/user';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Delete, Edit, Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Pane, Splitpanes } from 'splitpanes';

import { getPlatDeptListApi } from '#/api/system/dept';
import { deletePlatUserApi, getPlatUserPageApi } from '#/api/system/user';
import ColumnSelector from '#/components/ColumnSelector/index.vue';
import DictTag from '#/components/DictTag/index.vue';
import ViewTree from '#/components/tree/ViewTree.vue';
import { defaultUserColumns, USER_STORAGE_KEY } from '#/constants/tableColumns';
import { useDicts } from '#/hooks/useDict';
import { ModuleCodeMap } from '#/hooks/useExport';
const { member_sex, member_status } = useDicts(['member_sex', 'member_status']);

import UserModal from './UserModal.vue';

import 'splitpanes/dist/splitpanes.css';

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultUserColumns]);
function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}
const visibleColumns = computed(() =>
  columnConfig.value.filter((col) => col.visible),
);

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<User[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const currentSelectedDeptId = ref<number | undefined>(undefined);
const moreParams = ref(false);

// 弹窗 Ref 实例
const userModalRef = ref<InstanceType<typeof UserModal> | null>(null);
const deptTreeData = ref<Dept[]>([]);
const deptLoading = ref(false);

// 查询参数
const queryParams = reactive<UserPageParams & { deptId?: number }>({
  pageNo: 1,
  pageSize: 10,
  nickName: undefined,
  email: undefined,
  sex: undefined,
  status: undefined,
  deptId: undefined,
});

// 加载部门树
async function loadDeptTree() {
  try {
    deptLoading.value = true;
    const res = await getPlatDeptListApi({ status: 0 });
    deptTreeData.value = res || [];
  } catch {
    ElMessage.error('加载部门树失败');
  } finally {
    deptLoading.value = false;
  }
}

// 核心：左侧部门树点击联动右侧表格
function handleDeptNodeClick(node: any) {
  if (node) {
    currentSelectedDeptId.value = node.deptId;
    queryParams.deptId = node.deptId;
  } else {
    currentSelectedDeptId.value = undefined;
    queryParams.deptId = undefined;
  }
  handleQuery();
}

// 数据加载
async function loadData() {
  try {
    loading.value = true;
    const res = await getPlatUserPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

function handleAdd() {
  userModalRef.value?.open(undefined, currentSelectedDeptId.value);
}
function handleEdit(row: User) {
  userModalRef.value?.open(row);
}

// 删除用户
async function handleDelete(row?: User) {
  const ids = row ? [row.userId] : selectedIds.value;
  if (ids.length === 0) return ElMessage.warning('请选择要删除的记录');

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条用户吗？`,
      '提示',
      { type: 'warning' },
    );
    loading.value = true;
    await Promise.all(ids.map((id) => deletePlatUserApi(id)));
    ElMessage.success(`成功删除 ${ids.length} 条用户`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消不处理
  } finally {
    loading.value = false;
  }
}

function handleSelectionChange(selection: User[]) {
  selectedIds.value = selection.map((item) => item.userId);
}
function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.nickName = undefined;
  queryParams.email = undefined;
  queryParams.sex = undefined;
  queryParams.status = undefined;
  queryParams.deptId = undefined;
  currentSelectedDeptId.value = undefined;
  queryParams.pageNo = 1;
  loadData();
}

onMounted(() => {
  loadData();
  loadDeptTree();
});
</script>

<template>
  <Page auto-content-height content-class="p-2">
    <Splitpanes class="default-theme">
      <Pane size="15">
        <ViewTree :api="getPlatDeptListApi" tip="输入部门名称检索" node-key="deptId" label-key="deptName"
          @node-click="handleDeptNodeClick" />
      </Pane>

      <Pane size="85">
        <BaseTableLayout v-model:query-params="queryParams" v-model:more-params="moreParams" :loading="loading"
          :total="total" @search="loadData" @reset="resetQuery">
          <template #search-basic>
            <el-form-item>
              <el-input v-model="queryParams.nickName" placeholder="请输入" clearable style="width: 180px"
                @keyup.enter="handleQuery">
                <template #prefix><span class="text-xs text-gray-400 mr-0.5">昵称:</span></template>
              </el-input>
            </el-form-item>

            <el-form-item>
              <el-select v-model="queryParams.sex" clearable style="width: 150px" placeholder="请选择">
                <template #prefix><span class="text-xs text-gray-400 mr-0.5">性别:</span></template>
                <el-option v-for="item in member_sex" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>

            <el-form-item>
              <el-select v-model="queryParams.status" clearable style="width: 150px" placeholder="请选择">
                <template #prefix><span class="text-xs text-gray-400 mr-0.5">状态:</span></template>
                <el-option v-for="item in member_status" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </template>

          <template #search-advanced>
            <el-form-item>
              <el-input v-model="queryParams.email" placeholder="请输入" clearable style="width: 180px"
                @keyup.enter="handleQuery">
                <template #prefix><span class="text-xs text-gray-400 mr-0.5">邮箱:</span></template>
              </el-input>
            </el-form-item>
          </template>

          <template #toolbar-left>
            <el-button type="primary" :icon="Plus" @click="handleAdd" v-access:code="['plat:user:add']">
              新增用户
            </el-button>
            <ExportButton :module-code="ModuleCodeMap.USER" :fields="visibleColumns" :find-cond="queryParams" />
            <el-button type="danger" plain :icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete()"
              v-access:code="['plat:user:del']">
              批量删除
            </el-button>

            <transition name="el-fade-in">
              <span v-if="selectedIds.length > 0" class="selected-alert-badge">
                已选
                <span class="count-highlight">{{ selectedIds.length }}</span> 项
              </span>
            </transition>
          </template>

          <template #toolbar-right>
            <ColumnSelector :storage-key="USER_STORAGE_KEY" :default-columns="defaultUserColumns"
              @update:columns="handleColumnsUpdate" />
          </template>

          <template #table>
            <el-table :data="tableData" border stripe :cell-style="{ padding: '6px 0' }"
              @selection-change="handleSelectionChange">
              <el-table-column type="selection" width="50" align="center" />
              <el-table-column v-for="col in visibleColumns" :key="col.key" :prop="col.key" :label="col.label"
                :width="col.width" :min-width="col.minWidth" :align="col.align"
                :show-overflow-tooltip="col.showOverflowTooltip">
                <template #default="{ row }">
                  <template v-if="col.key === 'avatar'">
                    <el-avatar :size="26" :src="row.avatar" class="align-middle shadow-sm" />
                  </template>
                  <template v-else-if="col.key === 'sex'">
                    <DictTag :options="member_sex" :value="row.sex" />
                  </template>
                  <template v-else-if="col.key === 'status'">
                    <DictTag :options="member_status" :value="row.status" />
                  </template>
                  <template v-else-if="col.key === 'superAdminFlag'">
                    <el-tag :type="row.superAdminFlag === 1 ? 'danger' : 'info'" size="small" effect="light" round>
                      {{ row.superAdminFlag === 1 ? '是' : '否' }}
                    </el-tag>
                  </template>
                  <template v-else>{{ (row as any)[col.key] ?? '-' }}</template>
                </template>
              </el-table-column>

              <el-table-column label="操作" width="100" fixed="right" align="center">
                <template #default="{ row }">
                  <el-tooltip content="修改" placement="top" :enterable="false">
                    <el-button link type="primary" :icon="Edit" @click="handleEdit(row)"
                      v-access:code="['plat:user:edit']">
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="删除" placement="top" :enterable="false">
                    <el-button link type="danger" :icon="Delete" @click="handleDelete(row)"
                      v-access:code="['plat:user:del']">
                    </el-button>
                  </el-tooltip>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </BaseTableLayout>
      </Pane>
    </Splitpanes>

    <UserModal ref="userModalRef" @success="handleQuery" />
  </Page>
</template>
