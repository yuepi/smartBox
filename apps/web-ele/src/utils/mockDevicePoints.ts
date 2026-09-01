// utils/mockDevicePoints.ts

interface DevicePoint {
  lng: number;
  lat: number;
  name: string;
  value: number;
  status: 'full' | 'offline' | 'online';
}

/**
 * 在河北省范围内生成随机设备点
 * @param count 设备数量
 * @returns 设备点数组
 */
export function generateMockDevicePoints(count: number = 524): DevicePoint[] {
  // 河北省各地市中心坐标及覆盖半径（经度/纬度偏移范围）
  const cities = [
    // 石家庄
    {
      center: { lng: 114.502_461, lat: 38.045_474 },
      radius: { lng: 0.3, lat: 0.25 },
      weight: 0.2,
    },
    // 保定
    {
      center: { lng: 115.494_81, lat: 38.886_565 },
      radius: { lng: 0.3, lat: 0.25 },
      weight: 0.12,
    },
    // 唐山
    {
      center: { lng: 118.183_451, lat: 39.650_522 },
      radius: { lng: 0.3, lat: 0.25 },
      weight: 0.1,
    },
    // 廊坊
    {
      center: { lng: 116.713_502, lat: 39.524_226 },
      radius: { lng: 0.2, lat: 0.18 },
      weight: 0.08,
    },
    // 邯郸
    {
      center: { lng: 114.490_686, lat: 36.611_273 },
      radius: { lng: 0.3, lat: 0.25 },
      weight: 0.1,
    },
    // 张家口
    {
      center: { lng: 114.884_091, lat: 40.811_901 },
      radius: { lng: 0.4, lat: 0.3 },
      weight: 0.06,
    },
    // 沧州
    {
      center: { lng: 116.858_349, lat: 38.310_611 },
      radius: { lng: 0.3, lat: 0.25 },
      weight: 0.08,
    },
    // 衡水
    {
      center: { lng: 115.686_229, lat: 37.738_868 },
      radius: { lng: 0.2, lat: 0.18 },
      weight: 0.06,
    },
    // 邢台
    {
      center: { lng: 114.561_092, lat: 37.059_419 },
      radius: { lng: 0.25, lat: 0.2 },
      weight: 0.08,
    },
    // 秦皇岛
    {
      center: { lng: 119.608_569, lat: 39.936_968 },
      radius: { lng: 0.2, lat: 0.18 },
      weight: 0.05,
    },
    // 承德
    {
      center: { lng: 117.939_152, lat: 40.976_204 },
      radius: { lng: 0.3, lat: 0.25 },
      weight: 0.04,
    },
    // 定州（保定市代管）
    {
      center: { lng: 114.9904, lat: 38.5163 },
      radius: { lng: 0.15, lat: 0.12 },
      weight: 0.03,
    },
  ];

  // 状态权重
  const statusWeights = {
    online: 0.88, // 88% 在线
    full: 0.08, // 8% 满箱
    offline: 0.04, // 4% 离线
  };

  // 生成设备编号前缀
  const prefixes = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
  ];
  const usedNames = new Set<string>();

  const points: DevicePoint[] = [];

  // 根据权重分配设备到各城市
  const getCityByWeight = () => {
    const rand = Math.random();
    let cumulative = 0;
    for (const city of cities) {
      cumulative += city.weight;
      if (rand <= cumulative) {
        return city;
      }
    }
    return cities[cities.length - 1];
  };

  const getRandomStatus = (): 'full' | 'offline' | 'online' => {
    const rand = Math.random();
    if (rand < statusWeights.online) return 'online';
    if (rand < statusWeights.online + statusWeights.full) return 'full';
    return 'offline';
  };

  const generateUniqueName = (): string => {
    let name = '';
    let attempts = 0;
    do {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = String(Math.floor(Math.random() * 1_000_000_000)).padStart(
        9,
        '0',
      );
      name = `${prefix}${suffix}`;
      attempts++;
      if (attempts > 1000) break;
    } while (usedNames.has(name));
    usedNames.add(name);
    return name;
  };

  for (let i = 0; i < count; i++) {
    const city = getCityByWeight();
    const lngOffset = (Math.random() - 0.5) * city.radius.lng * 2;
    const latOffset = (Math.random() - 0.5) * city.radius.lat * 2;
    const lng = city.center.lng + lngOffset;
    const lat = city.center.lat + latOffset;
    const status = getRandomStatus();
    // 投递量：在线设备 5-200 次，满箱设备 80-300 次，离线设备 0-50 次
    let value = 0;
    if (status === 'online') {
      value = Math.floor(Math.random() * 195 + 5);
    } else if (status === 'full') {
      value = Math.floor(Math.random() * 220 + 80);
    } else {
      value = Math.floor(Math.random() * 50);
    }

    points.push({
      lng: Number(lng.toFixed(6)),
      lat: Number(lat.toFixed(6)),
      name: generateUniqueName(),
      value,
      status,
    });
  }

  return points;
}
