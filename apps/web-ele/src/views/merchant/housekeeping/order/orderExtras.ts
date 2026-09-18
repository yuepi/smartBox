import type { HomeOrder } from '#/api/system/housekeeping';

/** 只读取下单快照；旧单缺失或损坏时提示待核对，不能用当前目录补写历史收费。 */
export function readOrderExtras(order?: HomeOrder) {
  try {
    const options = JSON.parse(order?.itemSnapshotJson || '{}').options;
    if (!Array.isArray(options)) return { items: [], complete: false };
    const items = options.filter((item): item is { optionName: string; valueName: string; priceDelta: number | string } =>
      !!item && typeof item === 'object' && typeof item.optionName === 'string' &&
      typeof item.valueName === 'string' &&
      (typeof item.priceDelta === 'number' || typeof item.priceDelta === 'string') &&
      String(item.priceDelta).trim() !== '' && Number.isFinite(Number(item.priceDelta)),
    );
    return { items, complete: items.length === options.length };
  } catch {
    return { items: [], complete: false };
  }
}
