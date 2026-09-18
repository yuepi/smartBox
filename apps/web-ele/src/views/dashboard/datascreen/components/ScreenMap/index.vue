<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import AMapLoader from '@amap/amap-jsapi-loader';

interface DevicePoint {
  lng: number;
  lat: number;
  name?: string;
  value?: number;
  status?: 'full' | 'offline' | 'online';
}

const props = defineProps<{
  center?: { lat: number; lng: number };
  height?: string;
  points?: DevicePoint[];
  zoom?: number;
}>();

const mapContainer = ref<HTMLDivElement>();
const isFullscreen = ref(false);

let AMapObj: any = null;
let map: any = null;
let cluster: any = null;

const defaultCenter = props.center || { lng: 116.397_428, lat: 39.909_23 };
const defaultZoom = props.zoom || 11;

// 状态颜色映射（发光亮色系）
const statusColorMap = {
  online: '#00f2ff', // 亮青
  full: '#ffb700',   // 亮黄
  offline: '#8c9ba5', // 灰蓝
};

// 全屏控制
const toggleFullscreen = () => {
  if (!mapContainer.value) return;
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
  } else {
    mapContainer.value.requestFullscreen?.();
  }
};

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
  setTimeout(() => {
    if (map) {
      map.resize();
      map.setFitView();
    }
  }, 200);
};

// 获取当前位置
const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持定位'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        });
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60_000,
      },
    );
  });
};

const loadMap = async () => {
  try {
    AMapObj = await AMapLoader.load({
      key: 'a2f1a77c9013204bd92f42e88da34657',
      version: '2.0',
      plugins: ['AMap.MarkerCluster'],
    });

    let center = defaultCenter;
    try {
      const location = await getCurrentLocation();
      center = location;
    } catch {
      console.warn('⚠️ 获取位置失败，使用默认中心:', defaultCenter);
    }

    map = new AMapObj.Map(mapContainer.value, {
      zoom: defaultZoom,
      center: [center.lng, center.lat],
      viewMode: '2D',
      mapStyle: 'amap://styles/darkblue',
      showIndoorMap: false,
      features: ['bg', 'road', 'building', 'point'],
    });

    const dataPoints = props.points?.length
      ? props.points
      : generateMockPoints(500);
    renderCluster(dataPoints);
  } catch (error) {
    console.error('地图加载失败：', error);
  }
};

const renderCluster = (points: DevicePoint[]) => {
  if (!map || !AMapObj) return;

  if (cluster) {
    cluster.setMap(null);
    cluster = null;
  }

  const clusterData = points.map((p) => ({
    lnglat: [p.lng, p.lat],
    name: p.name,
    value: p.value,
    status: p.status || 'online',
  }));

  cluster = new AMapObj.MarkerCluster(map, clusterData, {
    gridSize: 80,
    maxZoom: 15,
    renderMarker: (ctx: any) => {
      const data = ctx.data[0];
      const color =
        statusColorMap[data.status as keyof typeof statusColorMap] || '#00f2ff';

      // 替代原先 Pin 钉子结构：发光科技脉冲圆点
      const pointContent = `
        <div class="tech-map-dot" style="--dot-color: ${color};">
          <div class="dot-pulse"></div>
          <div class="dot-core"></div>
        </div>
      `;
      ctx.marker.setContent(pointContent);
      ctx.marker.setOffset(new AMapObj.Pixel(-18, -18));

      // 点击展开深色大屏风格弹窗
      ctx.marker.on('click', () => {
        const statusText =
          data.status === 'online'
            ? '在线'
            : (data.status === 'full'
            ? '满箱'
            : '离线');

        const infoContent = `
          <div class="tech-info-window">
            <div class="info-title">${data.name || '设备'}</div>
            <div class="info-body">
              <div class="info-item">
                <span class="label">投递量:</span>
                <span class="val">${data.value || 0} 次</span>
              </div>
              <div class="info-item">
                <span class="label">设备状态:</span>
                <span class="val status-${data.status}">${statusText}</span>
              </div>
            </div>
          </div>
        `;
        const infoWindow = new AMapObj.InfoWindow({
          content: infoContent,
          offset: new AMapObj.Pixel(0, -15),
          isCustom: true, // 使用自定义 DOM 彻底移除高德默认背景框与下箭头
        });
        infoWindow.open(map, data.lnglat);
      });
    },

    renderClusterMarker: (ctx: any) => {
      const count = ctx.count;
      const factor = Math.min(count / 100, 1);
      const size = Math.floor(40 + factor * 20);

      const content = `
        <div class="custom-cluster-node" style="width: ${size}px; height: ${size}px; line-height: ${size}px;">
          <span class="cluster-count">${count}</span>
        </div>
      `;

      ctx.marker.setContent(content);
      ctx.marker.setOffset(new AMapObj.Pixel(-size / 2, -size / 2));
    },
  });

  cluster.on('click', (e: any) => {
    if (e.clusterData && e.clusterData.length > 0) {
      const currentZoom = map.getZoom();
      map.setZoomAndCenter(currentZoom + 2, e.lnglat);
    }
  });

  if (points.length > 0) {
    map.setFitView(null, false, [60, 60, 60, 60]);
  }
};

const generateMockPoints = (count = 500): DevicePoint[] => {
  const points: DevicePoint[] = [];
  const baseLng = 116.397_428;
  const baseLat = 39.909_23;
  const statuses: ('full' | 'offline' | 'online')[] = [
    'online',
    'offline',
    'full',
  ];

  for (let i = 0; i < count; i++) {
    const lng = baseLng + (Math.random() - 0.5) * 0.4;
    const lat = baseLat + (Math.random() - 0.5) * 0.4;
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    points.push({
      lng,
      lat,
      name: `设备 #${i + 1}`,
      value: Math.floor(Math.random() * 200),
      status,
    });
  }
  return points;
};

watch(
  () => props.points,
  (newPoints) => {
    if (map && newPoints?.length) {
      renderCluster(newPoints);
    }
  },
  { deep: true },
);

onMounted(() => {
  loadMap();
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onBeforeUnmount(() => {
  if (cluster) {
    cluster.setMap(null);
  }
  if (map) {
    map.destroy();
    map = null;
  }
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
});

defineExpose({
  renderCluster,
  toggleFullscreen,
});
</script>

<template>
  <div class="screen-map-wrapper">
    <div
      ref="mapContainer"
      class="map-container"
      :style="{ height: height || '100%' }"
    >
      <!-- 全屏控制 -->
      <!-- <div class="fullscreen-btn" @click="toggleFullscreen">
        <el-icon :size="16">
          <FullScreen v-if="!isFullscreen" />
          <Close v-else />
        </el-icon>
        <span>{{ isFullscreen ? '退出' : '全屏' }}</span>
      </div> -->

      <!-- 图例组件 -->
      <div class="map-legend">
        <span class="legend-item"><span class="dot online"></span>在线</span>
        <span class="legend-item"><span class="dot full"></span>满箱</span>
        <span class="legend-item"><span class="dot offline"></span>离线</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.screen-map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.fullscreen-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 100;
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 6px 12px;
  font-size: 13px;
  color: #a5f3fc;
  cursor: pointer;
  user-select: none;
  background: rgb(10 25 50 / 75%);
  border: 1px solid rgb(0 242 255 / 30%);
  border-radius: 4px;
  box-shadow: 0 0 10px rgb(0 242 255 / 20%);
  backdrop-filter: blur(6px);
  transition: all 0.2s;
}

.fullscreen-btn:hover {
  color: #fff;
  background: rgb(10 25 50 / 90%);
  border-color: rgb(0 242 255 / 70%);
  box-shadow: 0 0 15px rgb(0 242 255 / 40%);
}

.map-legend {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 100;
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  font-size: 12px;
  color: #d1d5db;
  pointer-events: none;
  background: rgb(10 25 50 / 75%);
  border: 1px solid rgb(0 242 255 / 20%);
  border-radius: 20px;
  backdrop-filter: blur(6px);
}

.legend-item {
  display: flex;
  gap: 6px;
  align-items: center;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.online {
  background: #00f2ff;
  box-shadow: 0 0 8px #00f2ff;
}

.dot.full {
  background: #ffb700;
  box-shadow: 0 0 8px #ffb700;
}

.dot.offline {
  background: #8c9ba5;
}

/* 全屏样式 */
.map-container:fullscreen {
  width: 100vw;
  height: 100vh;
  background: #0a0e1a;
}

/* 点位样式：科技风发光圆点（扩大尺寸） */
:deep(.tech-map-dot) {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;  /* 从 24px 放大到 36px */
  height: 36px; /* 从 24px 放大到 36px */
  cursor: pointer;
}

:deep(.tech-map-dot .dot-core) {
  width: 14px;  /* 从 8px 放大到 14px */
  height: 14px; /* 从 8px 放大到 14px */
  background-color: var(--dot-color);
  border: 2px solid #fff; /* 加厚白边 */
  border-radius: 50%;
  box-shadow: 0 0 12px var(--dot-color);
}

:deep(.tech-map-dot .dot-pulse) {
  position: absolute;
  inset: 0;
  background-color: var(--dot-color);
  border-radius: 50%;
  opacity: 0.4;
  animation: dot-glow 2s infinite ease-in-out;
}

@keyframes dot-glow {
  0% {
    opacity: 0.8;
    transform: scale(0.4);
  }

  100% {
    opacity: 0;
    transform: scale(1.5); /* 扩散圈变大 */
  }
}

/* 自定义科技感 InfoWindow 弹窗样式 */
:deep(.tech-info-window) {
  position: relative;
  min-width: 160px;
  padding: 10px 14px;
  color: #e0f2fe;
  background: rgb(8 21 41 / 85%);
  border: 1px solid rgb(0 242 255 / 40%);
  border-radius: 4px;
  box-shadow: 0 0 20px rgb(0 242 255 / 25%);
  backdrop-filter: blur(8px);

  /* 顶部发光装饰条 */
  &::before {
    position: absolute;
    top: 0;
    right: 10%;
    left: 10%;
    height: 2px;
    content: '';
    background: linear-gradient(90deg, transparent, #00f2ff, transparent);
  }

  .info-title {
    padding-bottom: 4px;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: bold;
    color: #00f2ff;
    border-bottom: 1px solid rgb(255 255 255 / 10%);
  }

  .info-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;

    .info-item {
      display: flex;
      gap: 12px;
      justify-content: space-between;

      .label {
        color: #94a3b8;
      }

      .val {
        font-weight: 500;
      }

      .status-online { color: #00f2ff; }

      .status-full { color: #ffb700; }

      .status-offline { color: #8c9ba5; }
    }
  }
}

/* 聚合点样式 */
:deep(.custom-cluster-node) {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 6px rgb(0 242 255 / 80%);
  cursor: pointer;
  background: radial-gradient(
    circle,
    rgb(0 242 255 / 90%) 0%,
    rgb(10 50 90 / 80%) 100%
  );
  border: 2px solid #00f2ff;
  border-radius: 50%;
  box-shadow: 0 0 15px rgb(0 242 255 / 60%);
  transition: transform 0.2s ease;
}

:deep(.custom-cluster-node:hover) {
  transform: scale(1.1);
}
</style>
