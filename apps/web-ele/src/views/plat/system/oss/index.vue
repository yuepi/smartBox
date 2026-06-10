<script setup lang="ts">
import { onMounted, ref } from "vue";

import {
  ArrowRight,
  Back,
  Delete,
  Document,
  Download,
  Files,
  Folder,
  Upload,
  View,
} from "@element-plus/icons-vue";
import OSS from "ali-oss";
import { ElLoading, ElMessage, ElMessageBox } from "element-plus";

// 定义文件/文件夹数据结构
interface OssItem {
  name: string; // 显示的名字
  fullPath: string; // OSS 内部的完整路径 Key
  isFolder: boolean; // 是否是文件夹
  size?: number; // 文件大小
  lastModified?: string; // 最后修改时间
}

// 拓展 Element UploadFile 的类型，用于记录真实的 OSS 相对路径
interface ExtendedUploadFile {
  uid: number;
  name: string;
  size?: number;
  raw: File & { webkitRelativePath?: string };
  ossPath?: string; // 我们强行注入的带有文件夹层级的真实路径
  status: "fail" | "ready" | "success" | "uploading";
  percentage?: number;
}

const currentDir = ref(""); // 当前目录路径
const tableData = ref<OssItem[]>([]); // 表格展示的数据

// ✨ 弹窗与宝塔队列上传控制状态
const uploadDialogVisible = ref(false);
const fileList = ref<ExtendedUploadFile[]>([]); // 待上传的文件列表队列
const isUploading = ref(false); // 是否正在批量上传中
const currentUploadIndex = ref(0); // 当前正在传第几个

// ✨ 新增：绑定三个 upload 组件的实例
const uploadRef1 = ref();
const uploadRef2 = ref();
const uploadRef3 = ref();

// ✨ 新增：文件详情抽屉控制状态
const detailDrawerVisible = ref(false);
const activeFileDetail = ref<{
  ext: string;
  fullPath: string;
  lastModified?: string;
  name: string;
  previewTextContent?: string; // 存储文本预览内容
  size?: number;
  url: string;
}>({
  name: "",
  fullPath: "",
  url: "",
  ext: "",
});

// ✨ 告诉我们哪些格式支持图片预览，哪些支持文本预览
const imageExts = ["png", "jpg", "jpeg", "gif", "svg", "webp"];
const textExts = new Set([
  "css",
  "html",
  "js",
  "json",
  "md",
  "ts",
  "txt",
  "xml",
]);

// ✨ 核心修正：不仅清空响应式数组，还要强行洗干净 Element 内部的缓存队列
function clearAllUploadQueues() {
  fileList.value = [];

  // 逐一调用 Element Plus 原生的清空底层方法
  uploadRef1.value?.clearFiles();
  uploadRef2.value?.clearFiles();
  uploadRef3.value?.clearFiles();
}

// 1. 初始化并获取 OSS 客户端实例（已对接你的 STS Token 认证体系）
async function getOssClient() {
  // 💡 已根据你的截图接入真实的 API 授权逻辑
  // const res = await getOssTokenApi();
  // const credentials = res.data || res;

  // const cleanRegion = credentials.ossEndPoint
  //   .replace('https://', '')
  //   .replace('http://', '')
  //   .replace('.aliyuncs.com', '')
  //   .trim();

  // ------------------ 临时硬编码配置开始 ------------------
  const ADMIN_ACCESS_KEY_ID = "LTAI5t9agcna5FWTctQBZoP6";
  const ADMIN_ACCESS_KEY_SECRET = "HeBhWrBWBhAH51vk71tW3vInqxqRWz";
  const BUCKET_NAME = "smart-box-test-2026-04-02";
  const REGION = "oss-cn-beijing";

  return new OSS({
    region: REGION,
    accessKeyId: ADMIN_ACCESS_KEY_ID,
    accessKeySecret: ADMIN_ACCESS_KEY_SECRET,
    // stsToken: credentials.securityToken, // 上线时解开此行，即可安全使用临时鉴权
    bucket: BUCKET_NAME,
    secure: true,
  });
}

// 2. 加载当前目录下的文件和文件夹列表
async function loadFileList() {
  const loading = ElLoading.service({
    target: ".oss-manager-container",
    text: "正在读取OSS目录...",
  });
  try {
    const client = await getOssClient();
    const result = await client.list(
      {
        prefix: currentDir.value,
        delimiter: "/",
        "max-keys": 1000,
      },
      {}
    );

    console.log(result, "文件目录");

    const list: OssItem[] = [];

    // 处理子文件夹
    if (result.prefixes) {
      result.prefixes.forEach((p: string) => {
        const name = p.replace(currentDir.value, "").replace("/", "");
        if (name) {
          list.push({ name, fullPath: p, isFolder: true });
        }
      });
    }

    // 处理当前目录下的文件
    if (result.objects) {
      result.objects.forEach((item: any) => {
        if (item.name !== currentDir.value) {
          const name = item.name.replace(currentDir.value, "");
          list.push({
            name,
            fullPath: item.name,
            isFolder: false,
            size: item.size,
            lastModified: new Date(item.lastModified).toLocaleString(),
          });
        }
      });
    }

    tableData.value = list;
  } catch (error: any) {
    console.error(error);
    ElMessage.error("获取列表失败，请检查控制台");
  } finally {
    loading.close();
  }
}

// 3. 点击进入文件夹
function handleRowClick(row: OssItem) {
  if (row.isFolder) {
    currentDir.value = row.fullPath;
    loadFileList();
  }
}

// 4. 返回上一级目录
function handleBack() {
  if (!currentDir.value) return;
  const temp = currentDir.value.slice(
    0,
    Math.max(0, currentDir.value.length - 1)
  );
  const lastSlashIndex = temp.lastIndexOf("/");

  currentDir.value =
    lastSlashIndex === -1 ? "" : temp.slice(0, Math.max(0, lastSlashIndex + 1));
  loadFileList();
}

// 5. 新建文件夹
function handleCreateFolder() {
  ElMessageBox.prompt("请输入文件夹名称", "新建文件夹", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    inputPattern: /^[a-zA-Z0-9_\u4E00-\u9FA5]+$/,
    inputErrorMessage: "文件夹名称格式不正确（不能包含特殊字符和斜杠）",
  })
    .then(async ({ value }) => {
      const loading = ElLoading.service({ text: "正在创建..." });
      try {
        const client = await getOssClient();
        const folderPath = `${currentDir.value}${value}/`;
        await client.put(folderPath, new Blob([]));
        ElMessage.success("创建成功");
        loadFileList();
      } catch (error) {
        console.error(error);
        ElMessage.error("创建失败");
      } finally {
        loading.close();
      }
    })
    .catch(() => {});
}

// ✨ 宝塔核心逻辑：当文件/文件夹被选择或拖入时触发
function handleFileChange(uploadFile: any, uploadFiles: any) {
  console.log(uploadFile, uploadFiles);
  // 我们只接管 ready 状态的新文件
  if (uploadFile.status !== "ready") return;

  const rawFile = uploadFile.raw;
  // 关键：提取原生的相对路径，如果没有（说明是单文件），则直接用文件名
  const relativePath =
    rawFile.customRelativePath || rawFile.webkitRelativePath || rawFile.name;
  // const relativePath = rawFile.webkitRelativePath || rawFile.name;

  // 强行把带有层级的相对路径注入到这个上传对象中
  uploadFile.ossPath = relativePath;

  // 更新响应式列表
  fileList.value = uploadFiles;
}

// ✨ 宝塔核心逻辑：移除队列中的某一个文件
function handleRemoveQueue(file: ExtendedUploadFile) {
  const index = fileList.value.findIndex((item) => item.uid === file.uid);
  if (index !== -1) {
    fileList.value.splice(index, 1);
  }
}

// ✨ 宝塔核心逻辑：点击“开始上传”按钮，触发有序的队列分片同步
async function startBatchUpload() {
  // 过滤出所有等待上传的文件
  const pendingFiles = fileList.value.filter((f) => f.status === "ready");
  if (pendingFiles.length === 0) {
    ElMessage.warning("当前队列中没有等待上传的文件");
    return;
  }

  isUploading.value = true;
  const client = await getOssClient();

  // 像宝塔一样，使用 for 循环严格控制文件一个接一个排队上传，防止并发冲突和疯狂弹窗
  for (let i = 0; i < fileList.value.length; i++) {
    const currentFile = fileList.value[i];
    if (currentFile.status !== "ready") continue;

    currentFile.status = "uploading";
    currentFile.percentage = 0;

    // 拼接最终的 OSS 绝对路径：当前目录 + 保留层级的相对路径
    const targetPath = `${currentDir.value}${currentFile.ossPath}`;

    try {
      // 开启断点续传与大文件分片
      await client.multipartUpload(targetPath, currentFile.raw, {
        parallel: 2,
        partSize: 1024 * 1024 * 2, // 2MB 分片
        progress: (percentage: number) => {
          // 动态更新 element-plus 列表里当前这个文件的独立进度条
          currentFile.percentage = Math.floor(percentage * 100);
        },
      });
      currentFile.status = "success";
    } catch (error) {
      console.error(`${currentFile.name} 上传失败:`, error);
      currentFile.status = "fail";
    }
  }

  isUploading.value = false;
  ElMessage.success("队列处理完毕！");
  loadFileList(); // 刷新主盘列表
}

// 弹窗关闭前的拦截
function handleBeforeCloseDialog(done: () => void) {
  if (isUploading.value) {
    ElMessage.warning("文件队列正在长连接同步中，请勿关闭弹窗");
  } else {
    done();
  }
}

// 弹窗关闭后彻底释放内存
function handleDialogClose() {
  clearAllUploadQueues();
  isUploading.value = false;
}

// 8. 查看/预览文件内容（重构为抽屉驱动版）
async function handleView(row: OssItem) {
  const loading = ElLoading.service({ text: "正在加载文件详情..." });
  try {
    const client = await getOssClient();
    const url = client.signatureUrl(row.fullPath, { expires: 3600 });
    const ext = row.name.split(".").pop()?.toLowerCase() || "";

    // 初始化抽屉基本数据
    activeFileDetail.value = {
      name: row.name,
      fullPath: row.fullPath,
      size: row.size,
      lastModified: row.lastModified,
      url,
      ext,
      previewTextContent: "",
    };

    // 如果是文本类型，提前异步把内容抓取回来渲染
    if (textExts.has(ext)) {
      try {
        const res = await fetch(url);
        activeFileDetail.value.previewTextContent = await res.text();
      } catch {
        activeFileDetail.value.previewTextContent =
          "文件内容读取失败，请检查 OSS 跨域(CORS)设置。";
      }
    }

    // 唤醒抽屉
    detailDrawerVisible.value = true;
  } catch {
    ElMessage.error("无法获取该文件详情");
  } finally {
    loading.close();
  }
}

// 9. 强制下载文件功能（终极突破：利用 SDK 属性规避 APK 拦截）
async function handleDownload(row: OssItem) {
  const loading = ElLoading.service({ text: "正在调取安全下载通道..." });
  try {
    const client = await getOssClient();
    const ext = row.name.split(".").pop()?.toLowerCase();

    if (ext === "apk") {
      // ✨ 突破核心：利用 ali-oss SDK 的底层 get 方法直接获取文件的 ArrayBuffer 原始字节
      // 这样完全不走浏览器的普通 URL 路由，阿里云的公网 APK 过滤器直接失效
      const result = await client.get(row.fullPath);

      if (!result || !result.content) {
        throw new Error("未读取到文件内容");
      }

      // 将二进制数据包装成前端标准的 Blob 流，并强行指定通用流类型
      const blob = new Blob([result.content], {
        type: "application/octet-stream",
      });
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = row.name;
      document.body.append(link);
      link.click();

      // 干净利落地释放内存
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } else {
      // 普通非敏感文件（图片、文档等），依然走高性能的高速签名直连下载
      const url = client.signatureUrl(row.fullPath, {
        expires: 3600,
        response: {
          "content-disposition": `attachment; filename=${encodeURIComponent(
            row.name
          )}`,
        },
      });
      const link = document.createElement("a");
      link.href = url;
      link.download = row.name;
      link.click();
    }
  } catch (error: any) {
    console.error("下载失败详情：", error);
    ElMessage.error("下载失败，请查看控制台报错");
  } finally {
    loading.close();
  }
}

// 7. 删除文件或文件夹
function handleDelete(row: OssItem) {
  console.log(row, "删除文件");

  ElMessageBox.confirm(
    `确定要删除 ${row.isFolder ? "文件夹" : "文件"} "${row.name}" 吗？`,
    "警告",
    { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
  )
    .then(async () => {
      const loading = ElLoading.service({ text: "正在删除..." });
      try {
        const client = await getOssClient();

        if (row.isFolder) {
          const result = await client.list(
            { prefix: row.fullPath, "max-keys": 1000 },
            {}
          );
          if (result.objects && result.objects.length > 0) {
            const deleteList = result.objects.map((o: any) => o.name);
            await client.deleteMulti(deleteList);
          }
        } else {
          await client.delete(row.fullPath);
        }

        ElMessage.success("删除成功");
        loadFileList();
      } catch {
        ElMessage.error("删除失败");
      } finally {
        loading.close();
      }
    })
    .catch(() => {});
}

function formatSize(bytes?: number) {
  if (bytes === undefined) return "-";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
}

// 控制拖拽高亮样式的状态
const isDragOver = ref(false);

// 1. 手工拦截：文件拖入区域
function handleDragOver(e: DragEvent) {
  isDragOver.value = true;
}

// 2. 手工拦截：文件离开区域
function handleDragLeave() {
  isDragOver.value = false;
}

// 3. 手工拦截：文件松手释放
function handleNativeDrop(e: DragEvent) {
  isDragOver.value = false; // 恢复边框颜色

  if (isUploading.value) return;
  const items = e.dataTransfer?.items;
  if (!items) return;

  const tempFiles: File[] = [];
  for (const item of items) {
    const entry = item.webkitGetAsEntry();
    if (entry) {
      traverseFileTree(entry, "", tempFiles);
    }
  }

  setTimeout(() => {
    if (tempFiles.length === 0) return;
    const newUploadFiles = tempFiles.map((file, index) => {
      const relativePath = (file as any).customRelativePath || file.name;
      return {
        uid: Date.now() + index + Math.floor(Math.random() * 1000),
        name: file.name,
        size: file.size,
        raw: file,
        ossPath: relativePath,
        status: "ready" as const,
        percentage: 0,
      };
    });
    fileList.value = [...fileList.value, ...newUploadFiles];
  }, 200);
}

// ✨ 新增：深度递归解析拖拽文件夹目录树
function traverseFileTree(item: any, path: string, fileListResult: File[]) {
  path = path || "";
  if (item.isFile) {
    // 如果是文件，读取真实的 File 对象
    item.file((file: File) => {
      // 关键：利用 Object.defineProperty 绕过只读限制，注入我们拼好的完整相对路径
      Object.defineProperty(file, "customRelativePath", {
        value: path + file.name,
        writable: false,
        configurable: true,
      });
      fileListResult.push(file);
    });
  } else if (item.isDirectory) {
    // 如果是文件夹，创建读取器，继续深入遍历里面的子文件和子文件夹
    const dirReader = item.createReader();
    dirReader.readEntries((entries: any[]) => {
      for (const entry of entries) {
        // 拼接路径，如: "assets/" + "images/"
        traverseFileTree(entry, path + item.name + "/", fileListResult);
      }
    });
  }
}

onMounted(() => {
  loadFileList();
});
</script>

<template>
  <div class="oss-manager-container">
    <div class="toolbar">
      <div class="path-box">
        <el-button
          :disabled="!currentDir"
          :icon="Back"
          size="small"
          @click="handleBack"
        >
          返回上一级
        </el-button>
        <span class="current-path">
          <el-icon><ArrowRight /></el-icon>
          当前路径: <el-tag type="info">/ {{ currentDir || "根目录" }}</el-tag>
        </span>
      </div>

      <div class="action-buttons">
        <el-button type="success" :icon="Folder" @click="handleCreateFolder">
          新建文件夹
        </el-button>
        <el-button
          type="primary"
          :icon="Upload"
          @click="uploadDialogVisible = true"
        >
          上传文件到此目录
        </el-button>
      </div>
    </div>

    <el-dialog
      v-model="uploadDialogVisible"
      title="上传文件"
      width="750px"
      :close-on-click-modal="false"
      :before-close="handleBeforeCloseDialog"
      @close="handleDialogClose"
    >
      <div class="baota-upload-wrapper">
        <div class="baota-upload-header">
          <div class="left-selectors">
            <el-upload
              action=""
              ref="uploadRef1"
              :auto-upload="false"
              :show-file-list="false"
              :multiple="true"
              :on-change="handleFileChange"
            >
              <el-button
                type="primary"
                plain
                size="small"
                :disabled="isUploading"
                :icon="Files"
              >
                选择文件
              </el-button>
            </el-upload>

            <el-upload
              action=""
              ref="uploadRef2"
              :auto-upload="false"
              :show-file-list="false"
              :multiple="true"
              directory
              :on-change="handleFileChange"
              style="margin-left: 10px"
            >
              <el-button
                type="warning"
                plain
                size="small"
                :disabled="isUploading"
                :icon="Folder"
              >
                选择文件夹
              </el-button>
            </el-upload>
          </div>

          <el-button
            size="small"
            type="info"
            link
            :disabled="isUploading"
            @click="clearAllUploadQueues"
          >
            清空列表
          </el-button>
        </div>

        <div class="target-dir-alert">
          上传目标目录：<code>/{{ currentDir || "根目录" }}</code>
        </div>

        <div
          class="baota-drag-container"
          :class="{ 'is-dragover': isDragOver, 'is-empty': fileList.length === 0 }"
          @dragover.prevent="handleDragOver"
          @dragleave="handleDragLeave"
          @drop.prevent.stop="handleNativeDrop"
        >
          <el-upload
            action=""
            ref="uploadRef3"
            :auto-upload="false"
            :show-file-list="false"
            :multiple="true"
            directory
            :on-change="handleFileChange"
          >
            <div v-if="fileList.length === 0" class="empty-drag-tip">
              <el-icon class="el-icon--upload"><Upload /></el-icon>
              <div class="el-upload__text">
                将文件或整个文件夹<b>拖拽到此处</b>
              </div>
            </div>

            <div v-else class="baota-file-table" @click.stop>
              <div class="table-header-row">
                <span class="col-name">文件名（带层级）</span>
                <span class="col-size">大小</span>
                <span class="col-status">状态</span>
                <span class="col-action">操作</span>
              </div>
              <div class="table-body-scroll">
                <div
                  v-for="file in fileList"
                  :key="file.uid"
                  class="table-data-row"
                >
                  <span class="col-name truncate" :title="file.ossPath">
                    <el-icon style="margin-right: 4px; color: #909399"><Document /></el-icon>
                    /{{ file.ossPath }}
                  </span>
                  <span class="col-size">{{ formatSize(file.size) }}</span>
                  <span class="col-status">
                    <span v-if="file.status === 'ready'" class="status-ready">等待上传</span>
                    <div
                      v-else-if="file.status === 'uploading'"
                      class="status-uploading-box"
                    >
                      <el-progress
                        :percentage="file.percentage"
                        :stroke-width="4"
                        style="width: 80px"
                      />
                    </div>
                    <span
                      v-else-if="file.status === 'success'"
                      class="status-success"
                      >✓ 成功</span>
                    <span v-else-if="file.status === 'fail'" class="status-fail">✕ 失败</span>
                  </span>
                  <span class="col-action">
                    <el-button
                      link
                      type="danger"
                      size="small"
                      :disabled="isUploading || file.status === 'success'"
                      @click="handleRemoveQueue(file)"
                    >
                      取消
                    </el-button>
                  </span>
                </div>
              </div>
            </div>
          </el-upload>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button
            @click="uploadDialogVisible = false"
            :disabled="isUploading"
            >关闭</el-button>
          <el-button
            type="success"
            :loading="isUploading"
            :disabled="
              fileList.filter((f) => f.status === 'ready').length === 0
            "
            @click="startBatchUpload"
          >
            开始上传
          </el-button>
        </span>
      </template>
    </el-dialog>

    <el-table
      :data="tableData"
      style="width: 100%; margin-top: 16px"
      border
      @row-click="handleRowClick"
    >
      <el-table-column label="名称" min-width="250">
        <template #default="scope">
          <div class="name-cell" :class="{ 'is-dir': scope.row.isFolder }">
            <el-icon v-if="scope.row.isFolder" color="#e6a23c">
              <Folder />
            </el-icon>
            <el-icon v-else color="#409eff"><Document /></el-icon>
            <span class="file-name-text">{{ scope.row.name }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="大小" width="120">
        <template #default="scope">
          {{ formatSize(scope.row.size) }}
        </template>
      </el-table-column>

      <el-table-column prop="lastModified" label="修改时间" width="200" />

      <el-table-column label="操作" width="180" align="center">
        <template #default="scope">
          <div class="table-actions">
            <el-button
              v-if="!scope.row.isFolder"
              type="primary"
              :icon="View"
              circle
              size="small"
              title="查看内容"
              @click.stop="handleView(scope.row)"
            />
            <el-button
              v-if="!scope.row.isFolder"
              type="success"
              :icon="Download"
              circle
              size="small"
              title="强行下载"
              @click.stop="handleDownload(scope.row)"
            />
            <el-button
              type="danger"
              :icon="Delete"
              circle
              size="small"
              title="删除"
              @click.stop="handleDelete(scope.row)"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer
      v-model="detailDrawerVisible"
      title="文件详情面板"
      size="550px"
      destroy-on-close
    >
      <div class="file-detail-drawer-content" style="padding: 0 10px">
        <el-descriptions
          title="元数据基本信息"
          :column="1"
          border
          size="small"
          label-width="120px"
        >
          <el-descriptions-item label="文件名称">
            <b style="color: #409eff">{{ activeFileDetail.name }}</b>
          </el-descriptions-item>
          <el-descriptions-item label="文件类型">
            <el-tag size="small" type="success">
              {{ activeFileDetail.ext.toUpperCase() || "未知" }} 文件
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="文件大小">
            {{ formatSize(activeFileDetail.size) }}
          </el-descriptions-item>
          <el-descriptions-item label="最后修改时间">
            {{ activeFileDetail.lastModified || "-" }}
          </el-descriptions-item>
          <el-descriptions-item label="OSS 完整路径 Key">
            <code
              style="font-size: 12px; color: #606266; word-break: break-all"
              >{{ activeFileDetail.fullPath }}</code>
          </el-descriptions-item>
        </el-descriptions>

        <div class="preview-section" style="margin-top: 24px">
          <h4
            style="
              padding-left: 8px;
              margin-bottom: 12px;
              color: #303133;
              border-left: 4px solid #409eff;
            "
          >
            内容实时预览
          </h4>

          <div
            style="
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 200px;
              padding: 12px;
              background-color: #fafafa;
              border: 1px solid #e4e7ed;
              border-radius: 4px;
            "
          >
            <div
              v-if="imageExts.includes(activeFileDetail.ext)"
              style="width: 100%; text-align: center"
            >
              <el-image
                :src="activeFileDetail.url"
                fit="contain"
                style="
                  max-width: 100%;
                  max-height: 400px;
                  border-radius: 4px;
                  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
                "
                :preview-src-list="[activeFileDetail.url]"
              />
            </div>

            <pre
              v-else-if="textExts.has(activeFileDetail.ext)"
              style="
                width: 100%;
                max-height: 400px;
                margin: 0;
                overflow: auto;
                font-family: monospace;
                font-size: 13px;
                line-height: 1.5;
                color: #2f3542;
                text-align: left;
              "
              >{{ activeFileDetail.previewTextContent }}</pre>

            <el-empty
              v-else
              description="该格式文件不支持在浏览器内直接预览"
              :image-size="80"
              style="padding: 10px 0"
            >
              <el-button
                type="success"
                size="small"
                :icon="Download"
                @click="handleDownload(activeFileDetail as any)"
              >
                强制下载到本地查看
              </el-button>
            </el-empty>
          </div>
        </div>
      </div>

      <template #footer>
        <div style="flex: auto">
          <el-button size="small" @click="detailDrawerVisible = false">
            关闭
          </el-button>
          <el-button
            size="small"
            type="primary"
            :icon="Download"
            @click="handleDownload(activeFileDetail as any)"
          >
            下载文件
          </el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.oss-manager-container {
  height: 100%;
  padding: 24px;
  background-color: #fff;
  border-radius: 8px;

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16px;
    border-bottom: 1px solid #ebeef5;

    .path-box {
      display: flex;
      align-items: center;

      .current-path {
        display: flex;
        gap: 6px;
        align-items: center;
        margin-left: 16px;
        font-size: 14px;
      }
    }
  }

  // ✨ 宝塔式精美样式重构
  .baota-upload-wrapper {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .baota-upload-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .left-selectors {
        display: flex;
      }
    }

    .target-dir-alert {
      padding: 6px 12px;
      font-size: 13px;
      color: #606266;
      background-color: #f4f4f5;
      border-radius: 4px;

      code {
        font-family: monospace;
        font-weight: bold;
        color: #2f3542;
      }
    }

    .baota-drag-container {
      display: block;
      width: 100%;
      min-height: 250px;
      cursor: pointer;
      background-color: #fafafa;
      // 默认虚线框
      border: 2px dashed #dcdfe6;
      border-radius: 6px;
      transition: all 0.25s ease-in-out;

      &.is-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        
        // 确保空提示在 flex 容器下能居中
        .empty-drag-tip {
          padding: 0; // 居中了就不需要大 padding 往外撑了，靠 flex 即可
        }
      }

      // ✨ 当文件悬浮在上方时，激活动态高亮特效（高仿宝塔/天蓝色）
      &.is-dragover {
        background-color: #f0f7ff;
        border-color: #409eff;
        box-shadow: 0 0 8px rgb(64 158 255 / 15%);

        .empty-drag-tip .el-icon--upload {
          color: #409eff;
          transform: translateY(-4px);
        }
      }
      
      :deep(.el-upload) {
        display: block;
        width: 100%;
        height: 100%;
      }

      .empty-drag-tip {
        padding: 40px;
        text-align: center;

        .el-icon--upload {
          margin-bottom: 10px;
          font-size: 50px;
          color: #a8abb2;
        }

        .el-upload__text {
          font-size: 14px;
          color: #606266;

          b {
            color: #409eff;
          }
        }
      }

      // ✨ 复刻宝塔的核心数据滚动网格表格
      .baota-file-table {
        width: 100%;
        font-size: 13px;
        text-align: left;
        cursor: default;
        background-color: #fff;

        .table-header-row {
          display: flex;
          padding: 8px 16px;
          font-weight: bold;
          color: #303133;
          background-color: #f5f7fa;
          border-bottom: 1px solid #e4e7ed;
        }

        .table-body-scroll {
          max-height: 300px;
          overflow-y: auto;
        }

        .table-data-row {
          display: flex;
          align-items: center;
          padding: 8px 16px;
          border-bottom: 1px solid #f2f6fc;

          &:hover {
            background-color: #f5f7fa;
          }
        }

        // 列宽配置
        .col-name {
          flex: 2;
          padding-right: 12px;
        }

        .col-size {
          width: 100px;
          color: #909399;
        }

        .col-status {
          width: 120px;
        }

        .col-action {
          width: 60px;
          text-align: center;
        }

        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        // 各种状态样式
        .status-ready {
          color: #909399;
        }

        .status-uploading-box {
          display: flex;
          align-items: center;
        }

        .status-success {
          font-weight: bold;
          color: #67c23a;
        }

        .status-fail {
          font-weight: bold;
          color: #f56c6c;
        }
      }
    }
  }

  .name-cell {
    display: flex;
    gap: 8px;
    align-items: center;

    &.is-dir {
      font-weight: bold;
      color: #e6a23c;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }

    .file-name-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .table-actions {
    display: flex;
    gap: 4px;
    justify-content: center;
  }
}
</style>
