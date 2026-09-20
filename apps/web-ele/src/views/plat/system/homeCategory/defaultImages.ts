import defaults from './defaultImages.json';

const images: Record<string, string> = defaults;

/** 未上传时显示随PC发布的系统默认图；自定义图始终优先，不把本机URL写入数据库。 */
export function categoryImage(category: { categoryName: string; imageUrl?: string }) {
  if (category.imageUrl) return category.imageUrl;
  const name = category.categoryName || '';
  const matched = Object.keys(images).filter(key => name.includes(key)).sort((a, b) => b.length - a.length)[0];
  const fallback = /维修|故障|漏水|疏通/.test(name) ? '上门维修'
    : /安装/.test(name) ? '上门安装'
      : /收纳|整理/.test(name) ? '整理收纳'
        : /清洗|家电/.test(name) ? '家电清洗'
          : /养护/.test(name) ? '家居养护' : '家政保洁';
  return `${import.meta.env.BASE_URL}images/home-category/${images[name] || images[matched || ''] || images[fallback]}`;
}
