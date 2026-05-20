// hooks/useDict.ts
import type { DictDataOption } from '#/api/system/dict/dictData';

import { ref, type Ref } from 'vue';

import { getDictDataByCodeApi } from '#/api/system/dict/dictData';
import { useDictStore } from '#/store/modules/dict';

// 正在请求中的字典（用于去重）
const pendingRequests = new Map<string, Promise<any>>();

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

  // 需要请求的字典编码
  const needFetchCodes: T[] = [];

  dictCodes.forEach(code => {
    // 创建响应式数据
    const options = ref<DictDataOption[]>([]);
    result[code] = options;

    // 先从 store 获取缓存
    const cached = dictStore.getDict(code);
    if (cached) {
      options.value = cached;
    } else {
      needFetchCodes.push(code);
    }
  });

  // 有需要请求的字典才发请求
  if (needFetchCodes.length > 0) {
    // 使用相同的请求标识，避免重复请求
    const requestKey = needFetchCodes.sort().join(',');
    
    if (!pendingRequests.has(requestKey)) {
      const promise = Promise.all(
        needFetchCodes.map(code => getDictDataByCodeApi(code))
      ).then((results) => {
        needFetchCodes.forEach((code, index) => {
          const res = results[index];
          if (res && Array.isArray(res)) {
            const dictOptions = res.map((item) => ({
              label: item.itemLabel,
              value: item.itemValue,
              elTagType: getTagTypeByValue(item.itemValue),
              elTagClass: item.listClass ,
            }));
            result[code].value = dictOptions;
            dictStore.setDict(code, dictOptions);
          } else {
            result[code].value = [];
          }
        });
      }).finally(() => {
        pendingRequests.delete(requestKey);
      });
      
      pendingRequests.set(requestKey, promise);
    }
    
    // 等待请求完成
    pendingRequests.get(requestKey)!.then(() => {
      // 数据已经在 then 中设置，这里不需要额外操作
    });
  }

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
