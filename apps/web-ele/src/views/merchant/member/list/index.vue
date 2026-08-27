<script lang="ts" setup>
import type { Member, MemberPageParams } from '#/api/member/member';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from '@vben/common-ui';

import { deleteMemberApi, getMemberPageApi } from '#/api/member/member';
import { defaultMemberColumns, MEMBER_STORAGE_KEY } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

import MemberDetail from './MemberDetail.vue';
import MemberForm from './MemberForm.vue';
import MemberWallet from './MemberWallet.vue';

const { member_status, member_sex } = useDicts(['member_status', 'member_sex']);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultMemberColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const memberFormRef = ref();
const memberDetailRef = ref();
const memberWalletRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Member[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

// 查询参数
const queryParams = reactive<MemberPageParams>({
  pageNo: 1,
  pageSize: 10,
  memberId: undefined,
  mobile: undefined,
  nickname: undefined,
  sex: undefined,
  status: undefined,
});

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getMemberPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// --- 新增 ---
function handleAdd() {
  memberFormRef.value?.open();
}

// --- 编辑 ---
function handleEdit(row: Member) {
  memberFormRef.value?.open(row);
}

// --- 详情 ---
function handleView(row: Member) {
  memberDetailRef.value?.open(row);
}

// --- 钱包 ---
function handleViewWallet(row: Member) {
  memberWalletRef.value?.open(row);
}

// --- 删除 ---
async function handleDelete(row?: Member) {
  // eslint-disable-next-line no-useless-assignment
  let ids: number[] = [];
  if (row) {
    ids = [row.memberId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${ids.length} 条会员吗？`, '提示', { type: 'warning' });
    for (const id of ids) {
      await deleteMemberApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条会员`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: Member[]) {
  selectedIds.value = selection.map((item) => item.memberId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.memberId = undefined;
  queryParams.mobile = undefined;
  queryParams.nickname = undefined;
  queryParams.sex = undefined;
  queryParams.status = undefined;
  queryParams.pageNo = 1;
  loadData();
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <BaseTableLayout
v-model:query-params="queryParams" v-model:more-params="moreParams" :loading="loading"
      :total="total" @search="loadData" @reset="resetQuery"
>
      <!-- 📥 基础筛选项 -->
      <template #search-basic>
        <el-form-item>
          <el-input
v-model="queryParams.memberId" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">会员ID:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
v-model="queryParams.mobile" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">手机号:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
v-model="queryParams.nickname" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">昵称:</span>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-select v-model="queryParams.sex" clearable style="width: 200px">
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">性别:</span>
            </template>
            <el-option v-for="item in member_sex" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.status" clearable style="width: 200px">
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">状态:</span>
            </template>
            <el-option v-for="item in member_status" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <!-- <template #search-advanced>
      </template> -->

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <el-button type="primary" icon="Plus" @click="handleAdd">新增会员</el-button>
        <ExportButton :module-code="ModuleCodeMap.MEMBER" :fields="visibleColumns" :find-cond="queryParams" />
        <el-button type="danger" plain icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete()">
          批量删除
        </el-button>
        <transition name="el-fade-in">
          <span v-if="selectedIds.length > 0" class="selected-alert-badge ml-2 text-sm text-gray-400">
            已选 <span class="text-red-500 font-medium">{{ selectedIds.length }}</span> 项
          </span>
        </transition>
      </template>

      <!-- 📥 工具栏右侧 -->
      <template #toolbar-right>
        <ColumnSelector
:storage-key="MEMBER_STORAGE_KEY" :default-columns="defaultMemberColumns"
          @update:columns="handleColumnsUpdate"
/>
      </template>

      <!-- 📥 表格 -->
      <template #table>
        <el-table
:data="tableData" border stripe style="width: 100%; height: 100%"
          @selection-change="handleSelectionChange"
>
          <el-table-column type="selection" width="50" align="center" />

          <el-table-column
v-for="col in visibleColumns" :key="col.key" :prop="col.key" :label="col.label"
            :width="typeof col.width === 'number' ? col.width : undefined" :min-width="col.minWidth" :align="col.align"
            :show-overflow-tooltip="col.showOverflowTooltip || false"
>
            <template #default="{ row }">
              <template v-if="col.key === 'avatar'">
                <el-avatar :size="32" :src="row.avatar" />
              </template>
              <template v-else-if="col.key === 'sex'">
                <DictTag :options="member_sex" :value="row.sex" />
              </template>
              <template v-else-if="col.key === 'status'">
                <DictTag :options="member_status" :value="row.status" />
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right" align="center">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="handleView(row)">
                  详情
                </el-button>
                <el-button size="small" type="primary" @click="handleViewWallet(row)">
                  钱包
                </el-button>
                <el-button size="small" type="primary" @click="handleEdit(row)">
                  编辑
                </el-button>
                <!-- <el-button size="small" type="danger" @click="handleDelete(row)">
                  删除
                </el-button> -->
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <!-- ===== 弹窗们 ===== -->
    <MemberForm ref="memberFormRef" @success="handleQuery" />
    <MemberDetail ref="memberDetailRef" />
    <MemberWallet ref="memberWalletRef" />
  </Page>
</template>

<style scoped>
.selected-alert-badge {
  display: inline-block;
}
</style>
