// store/modules/dict.ts
import { defineStore } from 'pinia';
import type { DictDataOption } from '#/api/system/dict/dictData';

interface DictState {
  dictMap: Map<string, DictDataOption[]>;
}

export const useDictStore = defineStore('dict', {
  state: (): DictState => ({
    dictMap: new Map(),
  }),
  
  actions: {
    /**
     * 获取字典
     */
    getDict(dictCode: string): DictDataOption[] | null {
      if (!dictCode) return null;
      return this.dictMap.get(dictCode) || null;
    },
    
    /**
     * 设置字典
     */
    setDict(dictCode: string, options: DictDataOption[]): boolean {
      if (!dictCode) return false;
      this.dictMap.set(dictCode, options);
      return true;
    },
    
    /**
     * 删除字典
     */
    removeDict(dictCode: string): boolean {
      if (!dictCode) return false;
      return this.dictMap.delete(dictCode);
    },
    
    /**
     * 清空所有字典
     */
    clearDict(): void {
      this.dictMap.clear();
    },
  },
});
