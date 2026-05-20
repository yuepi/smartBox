<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import { Page } from '@vben/common-ui';

import { Delete, Refresh, Search, View } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import { deleteMerchantLoginLogApi, getMerchantLoginLogDetailApi, getMerchantLoginLogPageApi } from "#/api/monitor/login";

import type { LoginLogPageParams } from "#/api/monitor/login";

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref([]);
const total = ref(0);
const selectedIds = ref<string[]>([]); // 存储选中的 ID

// 详情弹窗控制
const detailVisible = ref(false);
const detailData = ref<any>({});

// 查询参数
const queryParams = reactive<LoginLogPageParams>({
  pageNo: 1,
  pageSize: 10,
  accountName: undefined,
  status: undefined,
});

// --- 逻辑函数 ---

// 加载分页数据
async function loadData() {
  try {
    loading.value = true;
    const res = await getMerchantLoginLogPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

// 查看详情逻辑
async function handleView(row: any) {
  try {
    // 调用接口获取最新详情
    const res = await getMerchantLoginLogDetailApi(row.loginLogId);
    detailData.value = res;
    detailVisible.value = true;
  } catch {
    ElMessage.error("获取详情失败");
  }
}

// 批量删除逻辑
async function handleDelete() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning("请选择要删除的记录");
    return;
  }

  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 条日志吗？`, "提示", {
      type: "warning",
    });
    const ids = selectedIds.value.join(",");
    await deleteMerchantLoginLogApi(ids);
    ElMessage.success("删除成功");
    handleQuery(); // 刷新列表
  } catch {
    // 用户取消删除
  }
}

// 表格选中变化
function handleSelectionChange(selection: any[]) {
  selectedIds.value = selection.map((item) => item.loginLogId);
}

// 搜索
function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

// 重置
function resetQuery() {
  queryParams.accountName = undefined;
  queryParams.status = undefined;
  handleQuery();
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <el-card shadow="never" class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="登录账号">
            <el-input v-model="queryParams.accountName" placeholder="请输入账号" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 100px">
              <el-option label="成功" :value="0" />
              <el-option label="失败" :value="1" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
            <el-button type="danger" plain :icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete">
              批量删除
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never">
        <el-table v-loading="loading" :data="tableData" border style="width: 100%"
          @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column prop="accountName" label="账号" min-width="120" align="center" />
          <el-table-column prop="ipAddr" label="登录IP" width="140" align="center" />
          <el-table-column prop="loginLocation" label="地点" width="150" align="center" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 0 ? 'success' : 'danger'">
                {{ row.status === 0 ? "成功" : "失败" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="loginTime" label="登录时间" width="180" align="center" />
          <el-table-column label="操作" width="100" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" :icon="View" @click="handleView(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="flex justify-end mt-4">
          <el-pagination v-model:current-page="queryParams.pageNo" v-model:page-size="queryParams.pageSize"
            :total="total" :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadData" @current-change="loadData" />
        </div>
      </el-card>
    </div>

    <el-dialog v-model="detailVisible" title="登录日志详情" width="600px" append-to-body>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="登录账号">{{ detailData.accountName }}</el-descriptions-item>
        <el-descriptions-item label="登录IP">{{ detailData.ipAddr }}</el-descriptions-item>
        <el-descriptions-item label="登录地点">{{ detailData.loginLocation }}</el-descriptions-item>
        <el-descriptions-item label="浏览器">{{ detailData.browser }}</el-descriptions-item>
        <el-descriptions-item label="操作系统">{{ detailData.os }}</el-descriptions-item>
        <el-descriptions-item label="登录状态">
          <el-tag :type="detailData.status === 0 ? 'success' : 'danger'">
            {{ detailData.status === 0 ? "成功" : "失败" }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操作信息">{{ detailData.msg }}</el-descriptions-item>
        <el-descriptions-item label="登录日期">{{ detailData.loginTime }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </Page>
</template>
