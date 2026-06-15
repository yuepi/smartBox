// utils/date.ts

/**
 * 格式化时间为 YYYY-MM-DD HH:mm:ss
 */
function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 获取最近N天的时间范围
 * @param days 天数，如 7 表示最近7天
 * @returns { startTime, endTime }
 */
export function getRecentDays(days: number) {
  const now = new Date();
  const endTime = formatDateTime(now);
  
  const startDate = new Date();
  startDate.setDate(now.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  const startTime = formatDateTime(startDate);
  
  return { startTime, endTime };
}

/**
 * 获取今天的开始和结束
 */
export function getToday() {
  const now = new Date();
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  return {
    startTime: formatDateTime(startDate),
    endTime: formatDateTime(endDate),
  };
}

/**
 * 获取本月
 */
export function getThisMonth() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  startDate.setHours(0, 0, 0, 0);
  
  return {
    startTime: formatDateTime(startDate),
    endTime: formatDateTime(now),
  };
}
