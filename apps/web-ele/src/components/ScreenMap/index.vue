<script setup lang="ts">
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

const statusColorMap = {
  online: '#4c65d4',
  offline: '#6b7280',
  full: '#f59e0b',
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
  // 延迟让 DOM 尺寸更新完成后，通知高德地图重新计算画布尺寸
  setTimeout(() => {
    if (map) {
      map.resize();
      map.setFitView();
    }
  }, 200);
};

// 获取当前位置
const getCurrentLocation = (): Promise<{ lat: number; lng: number; }> => {
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
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60_000,
      }
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
      console.log('📍 使用当前位置作为地图中心:', center);
    } catch {
      console.warn('⚠️ 获取位置失败，使用默认中心:', defaultCenter);
    }


    map = new AMapObj.Map(mapContainer.value, {
      zoom: defaultZoom,
      center: [center.lng, center.lat],
      viewMode: '2D',
      mapStyle: 'amap://styles/82ace86db0cd03ac02e4a5d1790eaeef',
      //  mapStyle: 'amap://styles/darkblue',
      showIndoorMap: false,
      features: ['bg', 'road', 'building', 'point'],
    });

    // 初始化点位数据
    const dataPoints = props.points?.length ? props.points : generateMockPoints(500);
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
      const color = statusColorMap[data.status as keyof typeof statusColorMap] || '#4c65d4';

      // 清理了无用标签，Pin 结构极简且标准
      const pinContent = `
        <div class="custom-map-pin" style="--pin-color: ${color};">
          <div class="pin-head"></div>
          <div class="pin-inner-dot"></div>
          <div class="pin-shadow"></div>
        </div>
      `;
      ctx.marker.setContent(pinContent);
      ctx.marker.setOffset(new AMapObj.Pixel(-17, -56));

      // 点击弹窗
      ctx.marker.on('click', () => {
        const infoContent = `
          <div style="padding:8px 12px;font-size:13px;color:#333;">
            <div style="font-weight:bold;margin-bottom:4px;">${data.name || '设备'}</div>
            <div>投递量：${data.value || 0} 次</div>
            <div>状态：${data.status === 'online' ? '在线' : (data.status === 'full' ? '满箱' : '离线')}</div>
          </div>
        `;
        const infoWindow = new AMapObj.InfoWindow({
          content: infoContent,
          offset: new AMapObj.Pixel(0, -56),
        });
        infoWindow.open(map, data.lnglat);
      });
    },

    renderClusterMarker: (ctx: any) => {
      const count = ctx.count;
      const factor = Math.min(count / 100, 1);
      const size = Math.floor(48 + factor * 24);

      const content = `
        <div class="custom-cluster-node" style="width: ${size}px; height: ${size}px; line-height: ${size}px;">
          <span class="cluster-count">${count}</span>
        </div>
      `;

      ctx.marker.setContent(content);
      ctx.marker.setOffset(new AMapObj.Pixel(-size / 2, -size / 2));
    }
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

// 生成 500+ 随机测试点位
const generateMockPoints = (count = 500): DevicePoint[] => {
  const points: DevicePoint[] = [];
  const baseLng = 116.397_428;
  const baseLat = 39.909_23;
  const statuses: ('full' | 'offline' | 'online')[] = ['online', 'offline', 'full'];

  for (let i = 0; i < count; i++) {
    // 在北京周边随机生成坐标
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
  { deep: true }
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
    <div ref="mapContainer" class="map-container" :style="{ height: height || '400px' }">
      <!-- 全屏按钮 -->
      <div class="fullscreen-btn" @click="toggleFullscreen">
        <el-icon :size="20">
          <FullScreen v-if="!isFullscreen" />
          <Close v-else />
        </el-icon>
        <span>{{ isFullscreen ? '退出全屏' : '全屏' }}</span>
      </div>

      <!-- 图例组件放到地图容器内部，方便全屏时一同展示 -->
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
}

.map-container {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
}

.fullscreen-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 100;
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 6px 12px;
  font-size: 12px;
  color: #d1d5db;
  cursor: pointer;
  user-select: none;
  background: rgb(0 0 0 / 60%);
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 6px;
  backdrop-filter: blur(4px);
  transition: all 0.2s;
}

.fullscreen-btn:hover {
  color: #fff;
  background: rgb(0 0 0 / 80%);
  border-color: rgb(34 211 238 / 30%);
}

.fullscreen-btn:active {
  transform: scale(0.95);
}

.map-legend {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 100;
  display: flex;
  gap: 12px;
  padding: 6px 14px;
  font-size: 12px;
  color: #d1d5db;
  pointer-events: none;
  background: rgb(0 0 0 / 60%);
  border-radius: 20px;
  backdrop-filter: blur(4px);
}

.legend-item {
  display: flex;
  gap: 4px;
  align-items: center;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.online {
  background: #4c65d4;
}

.dot.full {
  background: #f59e0b;
}

.dot.offline {
  background: #6b7280;
}

/* 全屏样式 */
.map-container:fullscreen {
  width: 100vw;
  height: 100vh;
  background: #0a0a0f;
  border-radius: 0;
}

.map-container:fullscreen .fullscreen-btn {
  top: 20px;
  right: 20px;
}

.map-container:fullscreen .map-legend {
  right: 30px;
  bottom: 30px;
}

:deep(.custom-map-pin) {
  position: relative;
  width: 34px;
  height: 56px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

:deep(.custom-map-pin:hover) {
  transform: scale(1.12);
}

:deep(.custom-map-pin .pin-head) {
  position: absolute;
  top: 0;
  left: 0;
  width: 34px;
  height: 34px;
  background-color: var(--pin-color);
  border: 2px solid #fff;
  border-radius: 50% 50% 0;
  box-shadow:
    0 0 16px var(--pin-color),
    inset 0 0 8px rgb(255 255 255 / 40%);
  transform: rotate(45deg);
  transform-origin: 50% 50%;
}

:deep(.custom-map-pin .pin-inner-dot) {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  width: 14px;
  height: 14px;
  pointer-events: none;
  background-color: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgb(0 0 0 / 30%);
}

:deep(.custom-map-pin .pin-shadow) {
  position: absolute;
  bottom: -3px;
  left: 50%;
  z-index: -1;
  width: 22px;
  height: 6px;
  background: rgb(0 0 0 / 55%);
  border-radius: 50%;
  filter: blur(2px);
  transform: translateX(-50%);
}

:deep(.custom-cluster-node) {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 1px 3px rgb(0 0 0 / 50%);
  cursor: pointer;
  background: radial-gradient(circle, rgb(14 165 233 / 95%) 0%, rgb(3 105 161 / 85%) 100%);
  border: 3px solid #7dd3fc;
  border-radius: 50%;
  box-shadow:
    0 0 20px rgb(56 189 248 / 80%),
    inset 0 0 12px rgb(255 255 255 / 40%);
  transition: transform 0.2s ease;
}


:deep(.custom-cluster-node)::before {
  position: absolute;
  inset: -8px;
  z-index: -1;
  content: '';
  background: rgb(56 189 248 / 25%);
  border: 1px solid rgb(125 211 252 / 40%);
  border-radius: 50%;
  animation: cluster-pulse 2.5s infinite ease-in-out;
}

:deep(.custom-cluster-node:hover) {
  transform: scale(1.1);
}

@keyframes cluster-pulse {
  0% {
    opacity: 0.6;
    transform: scale(0.95);
  }

  50% {
    opacity: 1;
    transform: scale(1.15);
  }

  100% {
    opacity: 0.6;
    transform: scale(0.95);
  }
}
</style>
