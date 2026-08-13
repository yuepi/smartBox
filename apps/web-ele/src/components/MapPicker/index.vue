<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

import AMapLoader from "@amap/amap-jsapi-loader";


interface Location {
  lng: number;
  lat: number;
}

interface SearchResult {
  name: string;
  address: string;
  location: Location;
}

const props = defineProps<{
  defaultCenter?: Location;
  height?: string;
  modelValue?: Location;
  zoom?: number;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: Location | null): void;
  (e: "change", value: Location | null): void;
}>();

const mapContainer = ref<HTMLDivElement>();
const searchKeyword = ref("");
const searchResults = ref<SearchResult[]>([]);
const showResults = ref(false);
const locationLoading = ref(false);
let map: any;
let marker: any;
let search: any;
let geocoder: any;

const defaultZoom = props.zoom || 14;
const defaultCenter = props.defaultCenter || { lng: 116.397_428, lat: 39.909_23 };

// 加载高德地图
const loadMap = async () => {
  try {
    const AMap = await AMapLoader.load({
      key: "a2f1a77c9013204bd92f42e88da34657",
      version: "2.0",
      plugins: ["AMap.PlaceSearch", "AMap.Geocoder"],
    });

    geocoder = new AMap.Geocoder({
      city: "010",
      radius: 1000,
    });

    const center = props.modelValue
      ? [props.modelValue.lng, props.modelValue.lat]
      : [defaultCenter.lng, defaultCenter.lat];

    map = new AMap.Map(mapContainer.value, {
      zoom: defaultZoom,
      center,
      viewMode: "2D",
    });

    if (props.modelValue) {
      addMarker([props.modelValue.lng, props.modelValue.lat]);
    }

    search = new AMap.PlaceSearch({
      map,
      pageSize: 99,
      autoFitView: true,
    });

    map.on("click", (e: any) => {
      const { lng, lat } = e.lnglat;
      addMarker([lng, lat]);
      reverseGeocode(lng, lat);
      showResults.value = false;
    });
  } catch (error) {
    console.error("地图加载失败：", error);
    ElMessage.error("地图加载失败，请检查网络或Key配置");
  }
};

/**
 * 将高德的 6 位 adcode 转换为级联选择器需要的字符串路径
 */
function transformAdcodeToPath(adcode: string): string {
  if (!adcode || adcode.length !== 6) return "";
  const province = `${adcode.slice(0, 2)}0000`;
  const city = `${adcode.slice(0, 4)}00`;
  const district = adcode;
  return `${province},${city},${district}`;
}

/**
 * 逆地理编码：经纬度 -> 地址信息
 */
function reverseGeocode(lng: number, lat: number) {
  if (!geocoder) return;
  geocoder.getAddress([lng, lat], (status: string, result: any) => {
    if (status === "complete" && result.regeocode) {
      const { addressComponent, formattedAddress } = result.regeocode;
      const areaPath = transformAdcodeToPath(addressComponent.adcode);

      const location = {
        lng,
        lat,
        address: formattedAddress,
        areaCodes: areaPath,
        province: addressComponent.province,
        city: addressComponent.city,
        district: addressComponent.district,
      };

      emit("update:modelValue", location);
      emit("change", location);
    }
  });
}

// --- 🌟 定位到当前位置 ---
async function handleGetLocation() {
  if (!navigator.geolocation) {
    ElMessage.warning("您的浏览器不支持定位功能");
    return;
  }

  locationLoading.value = true;
  const loadingInstance = ElLoading.service({
    text: "正在获取位置...",
  });

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      });
    });

    const { latitude, longitude } = position.coords;

    // 移动地图到当前位置
    if (map) {
      map.setCenter([longitude, latitude]);
      map.setZoom(16);
    }

    // 添加标记
    addMarker([longitude, latitude]);

    // 逆地理编码获取地址
    reverseGeocode(longitude, latitude);

  } catch (error: any) {
    console.error("定位失败:", error);
    const errorMessages: Record<number, string> = {
      1: "用户拒绝了定位请求",
      2: "无法获取位置信息",
      3: "定位请求超时",
    };
    const message = errorMessages[error.code] || "定位失败，请检查GPS或网络";
    ElMessage.error(message);
  } finally {
    locationLoading.value = false;
    loadingInstance.close();
  }
}

// 搜索地点
const handleSearch = () => {
  if (!searchKeyword.value.trim()) {
    ElMessage.warning("请输入搜索关键词");
    return;
  }

  if (!search) {
    ElMessage.error("搜索功能未初始化");
    return;
  }

  search.search(searchKeyword.value, (status: string, result: any) => {
    if (status === "complete" && result.poiList.pois.length > 0) {
      searchResults.value = result.poiList.pois.map((poi: any) => ({
        name: poi.name,
        address: poi.address,
        location: {
          lng: poi.location.lng,
          lat: poi.location.lat,
        },
      }));
      showResults.value = true;
    } else {
      searchResults.value = [];
      showResults.value = false;
      ElMessage.warning("未找到相关地点");
    }
  });
};

// 选择搜索结果
const selectResult = (result: SearchResult) => {
  const location = result.location;
  addMarker([location.lng, location.lat]);
  map.setCenter([location.lng, location.lat]);
  map.setZoom(16);
  emit("update:modelValue", location);
  emit("change", location);
  showResults.value = false;
};

// 清空搜索
const handleClearSearch = () => {
  searchKeyword.value = "";
  searchResults.value = [];
  showResults.value = false;
};

// 添加/更新标记
const addMarker = (position: [number, number]) => {
  if (!map) return;
  if (marker) {
    marker.setPosition(position);
  } else {
    // @ts-ignore
    marker = new window.AMap.Marker({
      position,
      map,
    });
  }
};

// 清空位置
const clearLocation = () => {
  if (marker) {
    marker.setMap(null);
    marker = null;
  }
  emit("update:modelValue", null);
  emit("change", null);
};

// 定位到选中的位置
const centerToLocation = () => {
  if (!map || !props.modelValue) return;
  map.setCenter([props.modelValue.lng, props.modelValue.lat]);
  map.setZoom(16);
};

// 监听外部 modelValue 变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (!map) return;
    if (newValue) {
      addMarker([newValue.lng, newValue.lat]);
      map.setCenter([newValue.lng, newValue.lat]);
    } else {
      if (marker) {
        marker.setMap(null);
        marker = null;
      }
    }
  },
  { deep: true },
);

onMounted(() => {
  loadMap();
});

onBeforeUnmount(() => {
  if (map) {
    map.destroy();
    map = null;
  }
});
</script>

<template>
  <div class="map-picker">
    <!-- 搜索框 + 定位按钮 -->
    <div class="map-search">
      <el-input
v-model="searchKeyword" placeholder="搜索地点" clearable @keyup.enter="handleSearch"
        @clear="handleClearSearch"
>
        <template #prefix>
          <el-icon>
            <Search />
          </el-icon>
        </template>
        <template #append>
          <el-button @click="handleSearch">搜索</el-button>
        </template>
      </el-input>

      <!-- 🌟 定位按钮 -->
      <el-button
class="location-btn" icon="Location" :loading="locationLoading" circle title="定位到当前位置"
        @click="handleGetLocation"
/>

      <!-- 搜索结果列表 -->
      <div v-if="searchResults.length > 0" class="search-results-wrapper">
        <div class="search-results-header" @click="showResults = !showResults">
          <span>找到 {{ searchResults.length }} 个结果</span>
          <el-icon>
            <ArrowDown v-if="!showResults" />
            <ArrowUp v-if="showResults" />
          </el-icon>
        </div>
        <div v-show="showResults" class="search-results">
          <div v-for="(item, index) in searchResults" :key="index" class="result-item" @click="selectResult(item)">
            <div class="result-name">{{ item.name }}</div>
            <div class="result-address">{{ item.address }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 地图容器 -->
    <div ref="mapContainer" class="map-container" :style="{ height: props.height }"></div>

    <!-- 选中的位置信息 -->
    <div v-if="modelValue" class="mt-2 flex gap-2 text-sm text-gray-500">
      <div>经度：{{ modelValue.lng?.toFixed(6) }}</div>
      <div>纬度：{{ modelValue.lat?.toFixed(6) }}</div>
    </div>

    <!-- 操作按钮 -->
    <div class="mt-2 flex gap-2">
      <el-button size="small" @click="clearLocation">清空位置</el-button>
      <el-button v-if="modelValue" size="small" type="primary" @click="centerToLocation">
        查看位置
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.map-picker {
  position: relative;
  width: 100%;

  .map-search {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 100;
    display: flex;
    gap: 8px;
    width: 360px;

    .el-input {
      flex: 1;
    }

    .location-btn {
      flex-shrink: 0;
      background: white;
      border: 1px solid #dcdfe6;
      transition: all 0.2s;

      &:hover {
        background-color: #ecf5ff;
        border-color: #409eff;
      }

      &:active {
        transform: scale(0.95);
      }
    }

    .search-results-wrapper {
      position: absolute;
      top: 100%;
      right: 0;
      left: 0;
      z-index: 101;
      margin-top: 4px;
      background: white;
      border-radius: 4px;
      box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);

      .search-results-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        font-size: 13px;
        color: #606266;
        cursor: pointer;
        border-bottom: 1px solid #f0f0f0;
        transition: background-color 0.2s;

        &:hover {
          background-color: #f5f7fa;
        }
      }

      .search-results {
        max-height: 300px;
        overflow-y: auto;

        .result-item {
          padding: 10px 12px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          transition: background-color 0.2s;

          &:hover {
            background-color: #f5f7fa;
          }

          .result-name {
            margin-bottom: 4px;
            font-size: 14px;
            font-weight: 500;
            color: #303133;
          }

          .result-address {
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 12px;
            color: #909399;
            white-space: nowrap;
          }
        }
      }
    }
  }

  .map-container {
    width: 100%;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
  }
}
</style>
