import { ElMessage } from 'element-plus';

/**
 * 兼容 HTTP / HTTPS 及不同浏览器的通用文本复制工具函数
 * @param text 需要复制的文本内容
 * @param successMsg 复制成功时的提示文案（不传则不提示）
 */
export async function copyToClipboard(
  text: string,
  successMsg?: string,
): Promise<boolean> {
  if (text === undefined || text === null || text === '') {
    ElMessage.warning('内容为空，无法复制');
    return false;
  }

  let isSuccess;

  // 1. 优先使用现代原生 Clipboard API (仅 HTTPS / localhost 生效)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      isSuccess = true;
    } catch {
      isSuccess = fallbackCopy(text);
    }
  } else {
    // 2. HTTP 环境或降级使用 document.execCommand
    isSuccess = fallbackCopy(text);
  }

  if (isSuccess && successMsg) {
    ElMessage.success(successMsg);
  }

  return isSuccess;
}

// 降级兼容方案
function fallbackCopy(text: string): boolean {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.append(textArea);
  textArea.focus();
  textArea.select();

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
    ElMessage.error('复制失败，浏览器不支持');
  }

  textArea.remove();
  return success;
}

/**
 * 清理并格式化 VXE Table 行数据：
 * 1. 自动过滤 VXE Table 内部字段（如 _X_ROW_KEY）
 * 2. 智能解析嵌套的 JSON 字符串（处理转义斜杠 \）
 * 3. 容错处理被截断的不完整 JSON 字符串
 */
export function formatRowJson(data: any): string {
  if (!data || typeof data !== 'object') return String(data);

  try {
    // 1. 深拷贝，避免影响 Vue 响应式数据
    // eslint-disable-next-line unicorn/prefer-structured-clone
    const cloneData = JSON.parse(JSON.stringify(data));

    // 2. 过滤掉 VXE Table 自动生成的内部 Key
    delete cloneData._X_ROW_KEY;
    delete cloneData._X_ROW_INDEX;

    // 3. 遍历对象属性，递归反序列化嵌套的 JSON 字符串
    Object.keys(cloneData).forEach((key) => {
      const val = cloneData[key];

      if (typeof val === 'string') {
        const trimmed = val.trim();
        // 简单判断是否像 JSON 结构
        if (
          (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
          (trimmed.startsWith('[') && trimmed.endsWith(']'))
        ) {
          try {
            cloneData[key] = JSON.parse(trimmed);
          } catch {
            // 如果解析失败，可能是截断 JSON，尝试修复后解析
            cloneData[key] = tryParseTruncatedJson(trimmed);
          }
        }
      }
    });

    return JSON.stringify(cloneData, null, 2);
  } catch {
    return JSON.stringify(data, null, 2);
  }
}

/**
 * 尝试解析或清理不完整/带转义的 JSON 字符串
 */
function tryParseTruncatedJson(str: string): any {
  try {
    // 尝试去除手动转义符后再解析
    const unescaped = str.replaceAll(String.raw`\"`, '"').replaceAll('\\\\', '\\');
    return JSON.parse(unescaped);
  } catch {
    return str.replaceAll(String.raw`\"`, '"').replaceAll('\\\\', '\\');
  }
}
