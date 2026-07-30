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
  online: '#22d3ee',
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

const loadMap = async () => {
  try {
    AMapObj = await AMapLoader.load({
      key: 'a2f1a77c9013204bd92f42e88da34657',
      version: '2.0',
      plugins: ['AMap.MarkerCluster'],
    });

    map = new AMapObj.Map(mapContainer.value, {
      zoom: defaultZoom,
      center: [defaultCenter.lng, defaultCenter.lat],
      viewMode: '2D',
      mapStyle: 'amap://styles/darkblue',
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
    
    // 【修改点】：单点渲染 —— 从小圆点变成“地图扎针 (Pin)”
    renderMarker: (ctx: any) => {
      const data = ctx.data[0];
      const color = statusColorMap[data.status as keyof typeof statusColorMap] || '#22d3ee';
      
      // 使用 CSS border 技巧绘制经典的水滴定位针样式
      const pinContent = `
        <div class="custom-map-pin" style="--pin-color: ${color};">
          <div class="pin-head">
            <div class="pin-inner-dot"></div>
          </div>
          <div class="pin-tail"></div>
        </div>
      `;
      
      ctx.marker.setContent(pinContent);
      // 将 Marker 的锚点偏移对准“针尖”位置（下中对齐）
      ctx.marker.setOffset(new AMapObj.Pixel(-12, -32));

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
          offset: new AMapObj.Pixel(0, -32),
        });
        infoWindow.open(map, data.lnglat);
      });
    },

    // 聚合簇依然保留科技感数字球
    renderCluster: (ctx: any) => {
      const count = ctx.count;
      const factor = Math.min(count / 100, 1);
      const size = 34 + factor * 16;

      const content = `
        <div style="
          width: ${size}px;
          height: ${size}px;
          line-height: ${size}px;
          background: rgba(14, 116, 144, 0.85);
          border: 2px solid #38bdf8;
          border-radius: 50%;
          color: #fff;
          font-weight: bold;
          font-size: 13px;
          text-align: center;
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.6);
          cursor: pointer;
        ">${count}</div>
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

/* 自定义扎在地图上的定位针 (Map Pin) */
:deep(.custom-map-pin) {
  position: relative;
  width: 24px;
  height: 32px;
  cursor: pointer;
}

/* 头部圆圈 */
:deep(.custom-map-pin .pin-head) {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: var(--pin-color);
  border: 2px solid #fff;
  border-radius: 50% 50% 50% 0;
  box-shadow: 0 0 10px var(--pin-color);
  transform: rotate(-45deg);
}

/* 针头内部小白点 */
:deep(.custom-map-pin .pin-inner-dot) {
  width: 8px;
  height: 8px;
  background-color: #fff;
  border-radius: 50%;
}

/* 针尖投射下的微弱阴影（增加立体扎根感） */
:deep(.custom-map-pin)::after {
  position: absolute;
  bottom: -2px;
  left: 50%;
  width: 12px;
  height: 4px;
  content: '';
  background: rgb(0 0 0 / 40%);
  border-radius: 50%;
  filter: blur(1px);
  transform: translateX(-50%);
}
</style>
