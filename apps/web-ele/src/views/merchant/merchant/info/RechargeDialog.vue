<script lang="ts" setup>
import QRCode from 'qrcode';

import { h5PayApi, nativePayApi } from '#/api/common/pay';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

// --- 状态 ---
const visible = ref(false);
const loading = ref(false);
const merchantId = ref(0);
const amount = ref(0);
const qrcodeUrl = ref('');
let closeTimer: null | ReturnType<typeof setTimeout> = null;

// --- 检测手机浏览器 ---
function isMobileDevice(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ['android', 'iphone', 'ipad', 'ipod', 'windows phone', 'mobile'].some(
    (k) => ua.includes(k),
  );
}

// --- 生成二维码 ---
async function generateQrcode(url: string) {
  if (!url) return;
  try {
    qrcodeUrl.value = await QRCode.toDataURL(url, { width: 200, margin: 2 });
  } catch {
    console.error('生成二维码失败');
  }
}

// --- 打开弹窗 ---
function open(id: number) {
  merchantId.value = id;
  amount.value = 0;
  qrcodeUrl.value = '';
  visible.value = true;
}

// --- 执行充值 ---
async function handleSubmit() {
  if (amount.value <= 0) {
    ElMessage.warning('请输入充值金额');
    return;
  }

  loading.value = true;
  try {
    const isMobile = isMobileDevice();

    if (isMobile) {
      const res = await h5PayApi({
        payAmount: amount.value,
        clientIp: '',
        merchantId: merchantId.value,
      });
      if (res?.h5Url) {
        window.location.href = res.h5Url;
      } else {
        ElMessage.error('获取支付链接失败');
      }
    } else {
      const res = await nativePayApi({ payAmount: amount.value });
      if (res?.codeUrl) {
        await generateQrcode(res.codeUrl);
        ElMessage.info('请使用微信扫码支付');
        closeTimer = setTimeout(() => {
          if (visible.value) {
            visible.value = false;
            ElMessage.info('支付窗口已关闭，可在充值订单中查看支付结果');
            emit('success');
          }
        }, 120_000);
      } else {
        ElMessage.error('获取支付二维码失败');
      }
    }
  } catch {
    ElMessage.error('充值失败');
  } finally {
    loading.value = false;
  }
}

// --- 关闭弹窗 ---
function handleClose() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  visible.value = false;
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    title="商户充值"
    width="400px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    append-to-body
    @close="handleClose"
  >
    <div class="recharge-dialog">
      <!-- 未生成二维码：显示表单 -->
      <div v-if="!qrcodeUrl" class="recharge-form">
        <el-form label-width="80px">
          <el-form-item label="充值金额">
            <el-input-number
              v-model="amount"
              :min="0.01"
              :precision="2"
              :step="10"
              placeholder="请输入充值金额"
              style="width: 200px"
            />
            <span class="ml-2">元</span>
          </el-form-item>
          <div class="text-gray-400 text-sm mt-2">提示：支持微信支付</div>
        </el-form>
      </div>

      <!-- 已生成二维码：显示二维码 -->
      <div v-else class="qrcode-content">
        <div class="flex justify-center mb-4">
          <img
            :src="qrcodeUrl"
            alt="支付二维码"
            style="width: 200px; height: 200px"
          />
        </div>
        <div class="text-center text-gray-500 text-sm">请使用微信扫码支付</div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">{{
        qrcodeUrl ? '关闭' : '取消'
      }}</el-button>
      <el-button
        v-if="!qrcodeUrl"
        type="primary"
        :loading="loading"
        @click="handleSubmit"
      >
        确认充值
      </el-button>
    </template>
  </el-dialog>
</template>
