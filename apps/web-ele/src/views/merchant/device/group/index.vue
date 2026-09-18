<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { DeviceGroup } from '#/api/device/deviceGroup';

import { h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  addDeviceGroupApi,
  bindOperatorApi,
  changeGroupStatusApi,
  deleteDeviceGroupApi,
  editDeviceGroupApi,
  getDeviceGroupPageApi,
} from '#/api/device/deviceGroup';

// 搜索表单配置
const formOptions: VbenFormProps = {
  wrapperClass: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
  showCollapseButton: false,
  schema: [
    {
      component: 'Input',
      fieldName: 'groupName',
      labelWidth: 0,
      renderComponentContent: () => ({
        prefix: () =>
          h('span', { class: 'text-sm text-gray-400 mr-1' }, '分组名称:'),
      }),
      componentProps: {
        placeholder: '请输入分组名称',
        clearable: true,
      },
    },
  ],
};

// 表格列配置
const gridOptions: VxeTableGridOptions<DeviceGroup> = {
  id: 'device_group_grid',
  keepSource: true,
  height: 'auto',
  columns: [
    { type: 'checkbox', width: 50, align: 'center' },
    { field: 'groupName', title: '分组名称', minWidth: 140, align: 'center' },
    { field: 'remark', title: '概述', minWidth: 180, align: 'center' },
    {
      field: 'deviceCount',
      title: '设备数',
      width: 100,
      align: 'center',
      sortable: true,
      slots: { default: 'deviceCount' },
    },
    {
      field: 'status',
      title: '状态',
      width: 120,
      align: 'center',
      slots: { default: 'status' },
    },
    { field: 'operatorName', title: '运营商', minWidth: 160, align: 'center' },
    {
      field: 'createdTime',
      title: '创建时间',
      width: 180,
      align: 'center',
      sortable: true,
    },
    {
      field: 'action',
      title: '操作',
      width: 160,
      fixed: 'right',
      align: 'center',
      slots: { default: 'action' },
    },
  ],
  // 开启服务端远程排序机制
  sortConfig: {
    remote: true,
    multiple: true,
  },
  proxyConfig: {
    sort: true, // 开启代理排序参数注入
    ajax: {
      query: async ({ page, sorts }, formValues) => {
        // 这里的 sorts 数组最多只有 1 项：[{ field: 'createdTime', order: 'desc' }]
        const formattedSorts = (sorts || []).map((item) => ({
          field: item.field,
          order: item.order,
        }));

        const res = await getDeviceGroupPageApi({
          pageNo: page.currentPage,
          pageSize: page.pageSize,
          ...formValues,
          sorts: formattedSorts, // 传给后端的数组结构
        });

        return res;
      },
    },
  },
};

const [Grid, gridApi] = useVbenVxeGrid<DeviceGroup>({
  formOptions,
  gridOptions,
});

// ================= 状态切换（显示 / 隐藏） =================
const statusLoadingMap = ref<Record<number, boolean>>({});

async function handleStatusChange(row: DeviceGroup) {
  statusLoadingMap.value[row.id] = true;
  try {
    await changeGroupStatusApi({ id: row.id, status: row.status });
    ElMessage.success(
      `已${row.status ? '开启' : '隐藏'}分组 [${row.groupName}]`,
    );
  } catch {
    // 失败时还原状态
    row.status = !row.status;
    ElMessage.error('状态修改失败');
  } finally {
    statusLoadingMap.value[row.id] = false;
  }
}

// ================= 点击设备数量跳转/筛选 =================
function handleDeviceCountClick(row: DeviceGroup) {
  if (row.deviceCount === 0) {
    ElMessage.info('当前分组下暂无关联设备');
    return;
  }
  // 模拟跳转到设备列表页面并携带分组 ID 过滤
  ElMessage.success(`跳转至设备列表，筛选分组：${row.groupName}`);
  // router.push({ path: '/device/list', query: { groupId: row.id } });
}

// ================= 新增 / 编辑弹窗逻辑 =================
const dialogVisible = ref(false);
const dialogTitle = ref('新增');
const formData = ref<Partial<DeviceGroup>>({
  id: undefined,
  groupName: '',
  remark: '',
});

function handleAdd() {
  dialogTitle.value = '新增分组';
  formData.value = { id: undefined, groupName: '', remark: '' };
  dialogVisible.value = true;
}

function handleEdit(row: DeviceGroup) {
  dialogTitle.value = '编辑分组';
  formData.value = { ...row };
  dialogVisible.value = true;
}

async function handleSave() {
  if (!formData.value.groupName) {
    ElMessage.warning('请输入分组名称');
    return;
  }

  await (formData.value.id
    ? editDeviceGroupApi(formData.value)
    : addDeviceGroupApi(formData.value));

  ElMessage.success('保存成功');
  dialogVisible.value = false;
  gridApi.query();
}

async function handleDelete(row: DeviceGroup) {
  try {
    await ElMessageBox.confirm(`确认删除分组 "${row.groupName}" 吗？`, '提示', {
      type: 'warning',
    });
    await deleteDeviceGroupApi(row.id);
    ElMessage.success('删除成功');
    gridApi.query();
  } catch {
    // 取消删除
  }
}

// ================= 绑定运营商弹窗逻辑 =================
const bindDialogVisible = ref(false);
const selectedOperator = ref('');
const operatorOptions = [
  { label: '全部', value: '全部' },
  { label: '慧小分运营点1', value: '慧小分运营点1' },
  { label: '慧小分运营点2', value: '慧小分运营点2' },
];

function handleOpenBind() {
  const records = gridApi.grid?.getCheckboxRecords();
  if (!records || records.length === 0) {
    ElMessage.warning('请先勾选需要绑定的分组');
    return;
  }
  selectedOperator.value = '';
  bindDialogVisible.value = true;
}

async function handleConfirmBind() {
  if (!selectedOperator.value) {
    ElMessage.warning('请选择运营商');
    return;
  }
  const records = gridApi.grid?.getCheckboxRecords() || [];
  const ids = records.map((item) => item.id);

  await bindOperatorApi({ ids, operatorName: selectedOperator.value });
  ElMessage.success('绑定运营商成功');
  bindDialogVisible.value = false;
  gridApi.query();
}
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <!-- 左上角操作工具栏 -->
      <template #toolbar-actions>
        <div class="flex items-center gap-2">
          <ElButton type="primary" icon="Plus" @click="handleAdd">
            新增分组
          </ElButton>
          <ElButton type="primary" @click="handleOpenBind">
            绑定运营商
          </ElButton>
        </div>
      </template>

      <!-- 设备数（点击可跳转/查看设备） -->
      <template #deviceCount="{ row }">
        <ElTag
          type="success"
          effect="light"
          class="cursor-pointer rounded-md hover:opacity-80"
          @click="handleDeviceCountClick(row)"
        >
          {{ row.deviceCount }}
        </ElTag>
      </template>

      <!-- 状态开关（接口调起及防抖） -->
      <template #status="{ row }">
        <ElSwitch
          v-model="row.status"
          :loading="statusLoadingMap[row.id]"
          active-text="显示"
          inactive-text="隐藏"
          inline-prompt
          @change="handleStatusChange(row)"
        />
      </template>

      <!-- 操作按钮（编辑 / 删除） -->
      <template #action="{ row }">
        <div class="action-buttons">
          <ElButton size="small" type="primary" @click="handleEdit(row)">
            编辑
          </ElButton>
          <ElButton size="small" type="danger" @click="handleDelete(row)">
            删除
          </ElButton>
        </div>
      </template>
    </Grid>

    <!-- 1. 新增 / 编辑分组弹窗 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      align-center
      destroy-on-close
    >
      <ElForm label-width="90px" class="px-4 pt-2">
        <ElFormItem label="分组名称" required>
          <ElInput
            v-model="formData.groupName"
            maxlength="20"
            show-word-limit
            placeholder="请输入分组名称"
          />
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput
            v-model="formData.remark"
            type="textarea"
            :rows="4"
            maxlength="200"
            show-word-limit
            placeholder="请输入分组描述信息"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <div class="flex justify-end gap-2 pr-4 pb-2">
          <ElButton @click="dialogVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handleSave">保存</ElButton>
        </div>
      </template>
    </ElDialog>

    <!-- 2. 绑定运营商弹窗 -->
    <ElDialog
      v-model="bindDialogVisible"
      title="绑定运营商"
      width="420px"
      align-center
      destroy-on-close
    >
      <ElForm label-width="80px" class="px-4 pt-4">
        <ElFormItem label="运营商" required>
          <ElSelect
            v-model="selectedOperator"
            placeholder="运营商 选择或搜索"
            filterable
            class="w-full"
          >
            <ElOption
              v-for="item in operatorOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <div class="flex justify-end gap-2 pr-4 pb-2">
          <ElButton @click="bindDialogVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handleConfirmBind">保存</ElButton>
        </div>
      </template>
    </ElDialog>
  </Page>
</template>
