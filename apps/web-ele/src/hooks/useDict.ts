// hooks/useDict.ts
import type { DictDataOption } from '#/api/system/dict/dictData';

import { ref } from 'vue';
import type { Ref } from 'vue';

import { getDictDataByCodeApi } from '#/api/system/dict/dictData';
import { useDictStore } from '#/store/modules/dict';

// 正在请求中的字典（用于去重）
const pendingRequests = new Map<string, Promise<DictDataOption[]>>();

function getTagTypeByValue(value: number): DictDataOption['elTagType'] {
  const typeMap: Record<number, any> = {
    0: 'success',
    1: 'danger',
    2: 'warning',
  };
  return typeMap[value] || 'info';
}

/**
 * 批量获取字典数据
 * @param dictCodes 字典编码列表
 * @returns 包含各字典数据的对象
 * 
 * @example
 * const { user_status, order_status } = useDicts(['user_status', 'order_status']);
 * // user_status.value 是字典选项数组
 */
export function useDicts<T extends string>(dictCodes: T[]): Record<T, Ref<DictDataOption[]>> {
  const dictStore = useDictStore();
  const result = {} as Record<T, Ref<DictDataOption[]>>;

  dictCodes.forEach((code) => {
    // 1. 每个人来，都得到一个独立的、属于自己组件的响应式 ref
    const options = ref<DictDataOption[]>([]);
    result[code] = options;

    // 2. 检查 Pinia 缓存
    const cached = dictStore.getDict(code);
    if (cached) {
      options.value = cached;
      return; // 命中了就直接返回，不走下面的异步逻辑
    }
    
    let fetchPromise = pendingRequests.get(code);

    if (!fetchPromise) {
      // 如果全局还没有人请求这个 code，则发起真正的 API 请求
      fetchPromise = getDictDataByCodeApi(code)
        .then((res) => {
          if (res && Array.isArray(res)) {
            const dictOptions = res.map((item) => ({
              label: item.itemLabel,
              value: item.itemValue,
              elTagType: getTagTypeByValue(item.itemValue),
              elTagClass: item.listClass,
            }));
            // 同步到 Pinia 供下次使用
            dictStore.setDict(code, dictOptions);
            return dictOptions;
          }
          return [] as DictDataOption[];
        })
        .catch(() => [] as DictDataOption[])
        .finally(() => {
          // 请求一旦结束，不论成功失败，从请求锁中移除
          pendingRequests.delete(code);
        });

      pendingRequests.set(code, fetchPromise);
    }

    fetchPromise.then((data) => {
      options.value = data;
    });
  });

  return result;
}

/**
 * 获取单个字典数据
 * @param dictCode 字典编码
 * @returns 字典选项的响应式数据
 * 
 * @example
 * const statusOptions = useDict('user_status');
 * // statusOptions.value 就是字典选项数组
 */
export function useDict(dictCode: string): Ref<DictDataOption[]> {
  return useDicts([dictCode])[dictCode];
}
