<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";
import { Page } from "@vben/common-ui";
import { Delete, Edit, Plus } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import { deletePlatRoleApi, getPlatRolePageApi } from '#/api/system/role';
import type { Role, RolePageParams } from '#/api/system/role';
import { defaultRoleColumns, ROLE_STORAGE_KEY } from '#/constants/tableColumns';
import type { TableColumnConfig } from '#/constants/tableColumns';
import { ModuleCodeMap } from "#/hooks/useExport";

// 🌟 引入拆分出去的弹窗组件
import RoleModal from "./RoleModal.vue";

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultRoleColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Role[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false); // 控制高级筛选展开

const roleModalRef = ref(); // 🌟 弹窗组件实例

// 查询参数
const queryParams = reactive<RolePageParams>({
  pageNo: 1,
  pageSize: 10,
  roleName: undefined,
  roleCode: undefined,
  status: undefined,
});

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getPlatRolePageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error("加载数据失败");
  } finally {
    loading.value = false;
  }
}

function getStatusText(status: number): string {
  return status === 0 ? "启用" : "禁用";
}

// 🌟 唤起弹窗：交由子组件自己去处理
function handleOpenModal(row?: Role) {
  roleModalRef.value?.open(row);
}

// --- 删除 ---
async function handleDelete(row?: Role) {
  let ids: number[] = [];

  if (row) {
    ids = [row.roleId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条角色吗？`,
      "提示",
      { type: "warning" }
    );

    for (const id of ids) {
      await deletePlatRoleApi(id);
    }

    ElMessage.success(`成功删除 ${ids.length} 条角色`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: Role[]) {
  selectedIds.value = selection.map((item) => item.roleId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.roleName = undefined;
  queryParams.roleCode = undefined;
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
    <BaseTableLayout v-model:queryParams="queryParams" v-model:moreParams="moreParams" :loading="loading" :total="total"
      @search="loadData" @reset="resetQuery">
      <!-- 📥 1. 基础常驻筛选项 -->
      <template #search-basic>
        <el-form-item>
          <el-input v-model="queryParams.roleName" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">角色名称:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input v-model="queryParams.roleCode" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">角色编码:</span>
            </template>
          </el-input>
        </el-form-item>
      </template>

      <!-- 📥 2. 更多高级筛选项 -->
      <template #search-advanced>
        <el-form-item>
          <el-select v-model="queryParams.status" clearable style="width: 200px" placeholder="请选择">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">状态:</span>
            </template>
            <el-option v-for="item in [{ label: '启用', value: 0 }, { label: '禁用', value: 1 }]" :key="item.value"
              :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 3. 工具栏左侧 -->
      <template #toolbar-left>
        <el-button type="primary" plain :icon="Plus" @click="handleOpenModal()" v-access:code="['plat:role:add']">
          新增角色
        </el-button>
        <ExportButton :module-code="ModuleCodeMap.ROLE" :fields="visibleColumns" :find-cond="queryParams" />
        <el-button type="danger" plain :icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete()"
          v-access:code="['plat:role:del']">
          批量删除
        </el-button>

        <transition name="el-fade-in">
          <span v-if="selectedIds.length > 0" class="selected-alert-badge ml-2 text-xs text-gray-400">
            已选
            <span class="text-red-500 font-medium">{{ selectedIds.length }}</span>
            项
          </span>
        </transition>
      </template>

      <!-- 📥 4. 工具栏右侧 -->
      <template #toolbar-right>
        <ColumnSelector :storage-key="ROLE_STORAGE_KEY" :default-columns="defaultRoleColumns"
          @update:columns="handleColumnsUpdate" />
      </template>

      <!-- 📥 5. 表格数据列 -->
      <template #table>
        <el-table :data="tableData" border stripe style="width: 100%; height: 100%"
          @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="50" align="center" />

          <el-table-column v-for="col in visibleColumns" :key="col.key" :prop="col.key" :label="col.label"
            :width="typeof col.width === 'number' ? col.width : undefined" :min-width="col.minWidth" :align="col.align"
            :show-overflow-tooltip="col.showOverflowTooltip || false">
            <template #default="{ row }">
              <template v-if="col.key === 'status'">
                <el-tag :type="row.status === 0 ? 'success' : 'danger'" size="small" round effect="light">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
              <template v-else-if="col.key === 'sort'">
                {{ row.sort || 0 }}
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="100" fixed="right" align="center">
            <template #default="{ row }">
              <el-tooltip content="修改" placement="top" :enterable="false">
                <el-button link type="primary" :icon="Edit" @click="handleOpenModal(row)"
                  v-access:code="['plat:role:edit']" />
              </el-tooltip>

              <el-tooltip content="删除" placement="top" :enterable="false">
                <el-button link type="danger" :icon="Delete" @click="handleDelete(row)"
                  v-access:code="['plat:role:del']" />
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <!-- 🌟 引入独立拆分出去的弹窗 -->
    <RoleModal ref="roleModalRef" @success="handleQuery" />
  </Page>
</template>
