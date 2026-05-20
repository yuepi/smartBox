<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

import AMapLoader from "@amap/amap-jsapi-loader";
import { ArrowDown, ArrowUp, Search } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

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
let map: any;
let marker: any;
let search: any;

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

    const geocoder = new AMap.Geocoder({
      city: "010", // 城市，默认全国
      radius: 1000, // 范围
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

    // 初始化搜索插件，显示10个结果
    search = new AMap.PlaceSearch({
      map: map,
      pageSize: 99,
      autoFitView: true,
    });

    map.on("click", (e: any) => {
      const { lng, lat } = e.lnglat;
      console.log(e);
      // 1. 添加标记
      addMarker([lng, lat]);

      // 2. 逆地理编码：经纬度 -> 详细地址信息
      geocoder.getAddress([lng, lat], (status: string, result: any) => {
        if (status === "complete" && result.regeocode) {
          console.log(result);

          const { addressComponent, formattedAddress } = result.regeocode;

          // 转换编码格式
          const areaPath = transformAdcodeToPath(addressComponent.adcode);

          const location = {
            lng,
            lat,
            address: formattedAddress,
            areaCodes: areaPath, // 这里的格式直接对应你的 AreaCascader v-model
            province: addressComponent.province,
            city: addressComponent.city,
            district: addressComponent.district,
          };

          console.log("转换后的位置信息：", location);

          // 更新数据
          emit("update:modelValue", location);
          emit("change", location);
        }
      });

      showResults.value = false;
    });
  } catch (error) {
    console.error("地图加载失败：", error);
    ElMessage.error("地图加载失败，请检查网络或Key配置");
  }
};

/**
 * 将高德的 6 位 adcode 转换为级联选择器需要的字符串路径
 * 例如: 110105 -> "110000,110100,110105"
 */
function transformAdcodeToPath(adcode: string): string {
  if (!adcode || adcode.length !== 6) return "";

  const province = adcode.slice(0, 2) + "0000";
  const city = adcode.slice(0, 4) + "00";
  const district = adcode;

  // 拼接成你 AreaCascader 需要的格式
  return `${province},${city},${district}`;
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
    console.log(status, result);
    if (status === "complete" && result.poiList.pois.length > 0) {
      // 转换搜索结果
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

  // 添加标记
  addMarker([location.lng, location.lat]);

  // 移动地图到该位置
  map.setCenter([location.lng, location.lat]);
  map.setZoom(16);

  // 更新位置
  emit("update:modelValue", location);
  emit("change", location);

  // 清空搜索框和结果列表
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
    <!-- 搜索框 -->
    <div class="map-search">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索地点"
        clearable
        @keyup.enter="handleSearch"
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
          <div
            v-for="(item, index) in searchResults"
            :key="index"
            class="result-item"
            @click="selectResult(item)"
          >
            <div class="result-name">{{ item.name }}</div>
            <div class="result-address">{{ item.address }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 地图容器 -->
    <div ref="mapContainer" class="map-container" :style="{ height: props.height }"></div>

    <!-- 选中的位置信息 -->
    <div v-if="modelValue" class="mt-2 text-sm text-gray-500 flex gap-2">
      <div>经度：{{ modelValue.lng?.toFixed(6) }}</div>
      <div>纬度：{{ modelValue.lat?.toFixed(6) }}</div>
    </div>

    <!-- 操作按钮 -->
    <div class="mt-2 flex gap-2">
      <el-button size="small" @click="clearLocation">清空位置</el-button>
      <el-button v-if="modelValue" size="small" type="primary" @click="centerToLocation">
        定位到该位置
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
    width: 320px;

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
