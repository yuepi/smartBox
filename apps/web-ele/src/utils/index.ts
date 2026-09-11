/**
 * @param {date} time 需要转换的时间
 * @param {String} fmt 需要转换的格式 如 yyyy-MM-dd、yyyy-MM-dd HH:mm:ss
 * @returns {String}
 */
export const formatTime = (
  time: Date | number | string,
  fmt: string,
): string => {
  if (!time) return '';
  const date = new Date(time);
  const o = {
    'M+': date.getMonth() + 1,
    'd+': date.getDate(),
    'H+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds(),
    'q+': Math.floor((date.getMonth() + 3) / 3),
    S: date.getMilliseconds(),
  };
  if (/(y+)/.test(fmt))
    fmt = fmt.replace(
      RegExp.$1,
      `${date.getFullYear()}`.slice(4 - RegExp.$1.length),
    );
  for (const k in o) {
    if (new RegExp(`(${k})`).test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        // @ts-expect-error: Unreachable code error
        RegExp.$1.length === 1 ? o[k] : `00${o[k]}`.slice(`${o[k]}`.length),
      );
    }
  }
  return fmt;
};


export * from './copy'
