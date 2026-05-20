import { requestClient } from '#/api/request';
import { useDictStore } from '#/store/modules/dict';
/**
 * 获取字典数据
 */
export const useDict = (...args: string[]): { [key: string]: DictDataOption[] } => {
  const res = ref<{
    [key: string]: DictDataOption[];
  }>({});

  args.forEach(async (dictType) => {
    res.value[dictType] = [];
    const dicts = useDictStore().getDict(dictType);
    console.log(dicts);
    if (dicts) {
      res.value[dictType] = dicts;
    } else {
      const backData = await requestClient.get(`/tool/dict/main/data?code=${dictType}`);
      res.value[dictType] = backData.map((p: any): DictDataOption => ({ label: p.label, value: p.value, elTagType: p.shsty, elTagClass: p.shsty }));
      console.log(res.value[dictType]);
      useDictStore().setDict(dictType, res.value[dictType]);
    }
  });
  return res.value;
};
