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
  center?: { lat: number; lng: number; };
  height?: string;
  points?: DevicePoint[];
  zoom?: number;
}>();

const mapContainer = ref<HTMLDivElement>();
const isFullscreen = ref(false);
let map: any;
let markers: any[] = [];

const defaultCenter = props.center || { lng: 116.397_428, lat: 39.909_23 };
const defaultZoom = props.zoom || 12;

const statusColorMap = {
  online: '#22d3ee',
  offline: '#6b7280',
  full: '#f59e0b',
};

// 进入全屏
const enterFullscreen = () => {
  const el = mapContainer.value;
  if (el && el.requestFullscreen) {
      el.requestFullscreen();
    }
};

// 退出全屏
const exitFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
};

// 切换全屏
const toggleFullscreen = () => {
  if (document.fullscreenElement) {
    exitFullscreen();
  } else {
    enterFullscreen();
  }
};

// 监听全屏变化
const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
  // 全屏后重新调整地图大小
  setTimeout(() => {
    if (map) {
      map.setFitView();
    }
  }, 300);
};

const loadMap = async () => {
  try {
    const AMap = await AMapLoader.load({
      key: 'a2f1a77c9013204bd92f42e88da34657',
      version: '2.0',
      plugins: ['AMap.MarkerCluster'],
    });

    map = new AMap.Map(mapContainer.value, {
      zoom: defaultZoom,
      center: [defaultCenter.lng, defaultCenter.lat],
      viewMode: '2D',
      mapStyle: 'amap://styles/dark',
      showIndoorMap: false,
      features: ['bg', 'road', 'building', 'point'],
    });

    if (props.points?.length) {
      addMarkers(props.points);
    }

    if (!props.points?.length) {
      addMockMarkers();
    }
  } catch (error) {
    console.error('地图加载失败：', error);
  }
};

const addMarkers = (points: DevicePoint[]) => {
  if (!map) return;
  if (markers.length > 0) {
    map.remove(markers);
    markers = [];
  }

  const amapMarkers = points.map((point) => {
    const status = point.status || 'online';
    const color = statusColorMap[status] || '#22d3ee';

    // @ts-ignore
    const marker = new AMap.Marker({
      position: [point.lng, point.lat],
      title: point.name || '',
     
      label: {
        content: `<div style="
          background: rgba(0,0,0,0.7);
          color: #fff;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          white-space: nowrap;
          border: 1px solid ${color};
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">${point.name || ''}</div>`,
        direction: 'top',
        offset: new AMap.Pixel(0, -8),
      },
    });

    marker.on('click', () => {
      const info = `
        <div style="padding:8px 12px;font-size:13px;">
          <div style="font-weight:bold;margin-bottom:4px;">${point.name || '设备'}</div>
          <div style="color:#666;">投递量：${point.value || 0} 次</div>
          <div style="color:#666;">状态：${status === 'online' ? '在线' : (status === 'full' ? '满箱' : '离线')}</div>
        </div>
      `;
      // @ts-ignore
      const infoWindow = new AMap.InfoWindow({
        content: info,
        offset: new AMap.Pixel(0, -30),
      });
      infoWindow.open(map, [point.lng, point.lat]);
    });

    return marker;
  });

  markers = amapMarkers;
  map.add(markers);

  if (points.length > 0) {
    map.setFitView(markers, false, [60, 60, 60, 60]);
  }
};

// 模拟数据
const addMockMarkers = () => {
  const mockPoints: DevicePoint[] = [
    { lng: 116.397_428, lat: 39.909_23, name: '阳光花园', value: 156, status: 'online' },
    { lng: 116.420_428, lat: 39.929_23, name: '翠湖苑', value: 132, status: 'online' },
    { lng: 116.380_428, lat: 39.899_23, name: '龙湖花园', value: 98, status: 'online' },
    { lng: 116.440_428, lat: 39.919_23, name: '滨江新城', value: 87, status: 'full' },
    { lng: 116.360_428, lat: 39.939_23, name: '南山花园', value: 76, status: 'online' },
    { lng: 116.450_428, lat: 39.889_23, name: '东湖苑', value: 65, status: 'offline' },
    { lng: 116.340_428, lat: 39.909_23, name: '西郊花园', value: 54, status: 'online' },
    { lng: 116.470_428, lat: 39.929_23, name: '北苑小区', value: 43, status: 'online' },
    { lng: 116.310_428, lat: 39.899_23, name: '南湖花园', value: 32, status: 'full' },
    { lng: 116.500_428, lat: 39.909_23, name: '中心花园', value: 21, status: 'online' },
  ];
  addMarkers(mockPoints);
};

watch(
  () => props.points,
  (newPoints) => {
    if (map && newPoints?.length) {
      addMarkers(newPoints);
    }
  },
  { deep: true }
);

onMounted(() => {
  loadMap();
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onBeforeUnmount(() => {
  if (map) {
    map.destroy();
    map = null;
  }
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
});

defineExpose({
  addMarkers,
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
          <FullScreenExit v-else />
        </el-icon>
        <span>{{ isFullscreen ? '退出全屏' : '全屏' }}</span>
      </div>
    </div>

    <!-- 图例 -->
    <div class="map-legend">
      <span class="legend-item"><span class="dot online"></span>在线</span>
      <span class="legend-item"><span class="dot full"></span>满箱</span>
      <span class="legend-item"><span class="dot offline"></span>离线</span>
    </div>
  </div>
</template>

<style scoped>
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
  display: flex;
  gap: 12px;
  padding: 6px 14px;
  font-size: 12px;
  color: #d1d5db;
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
  background: #22d3ee;
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
</style>
