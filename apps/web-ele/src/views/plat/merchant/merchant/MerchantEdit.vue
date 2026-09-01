<script lang="ts" setup>
import type { Merchant } from '#/api/system/merchant';

import { getPlatMenuListApi } from '#/api/system/menu';
import {
  addPlatMerchantApi,
  editPlatMerchantApi,
  getPlatMerchantDetailApi,
} from '#/api/system/merchant';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

// --- 状态 ---
const visible = ref(false);
const title = ref('');
const loading = ref(false);
const activeTab = ref('basic');
const formRef = ref();
const location = ref<null | { lat: number; lng: number }>(null);
const areaCodes = ref('');
const menuTreeRef = ref();
const menuTreeData = ref<any[]>([]);
const menuLoading = ref(false);
const logoList = computed({
  get: () => {
    if (!formData.value.logo) return [];
    return [formData.value.logo];
  },
  set: (val: string[]) => {
    formData.value.logo = val.length > 0 ? val[0] : '';
  },
});

const formData = ref<Partial<Merchant>>({
  status: 0,
  merchantMenuIds: [],
  provinceCode: '',
  cityCode: '',
  districtCode: '',
});

const formRules = reactive({
  merchantName: [
    { required: true, message: '请输入商户名称', trigger: 'blur' },
  ],
});

// --- 辅助函数 ---
function parseAreaCodes(codes: string): {
  cityCode: string;
  districtCode: string;
  provinceCode: string;
} {
  if (!codes) return { provinceCode: '', cityCode: '', districtCode: '' };
  const parts = codes.split(',').filter(Boolean);
  return {
    provinceCode: parts[0] || '',
    cityCode: parts[1] || '',
    districtCode: parts[2] || '',
  };
}

function buildAreaCodes(
  provinceCode?: string,
  cityCode?: string,
  districtCode?: string,
): string {
  return [provinceCode, cityCode, districtCode].filter(Boolean).join(',');
}

function buildMenuTree(menuList: any[], parentId: number = 0): any[] {
  const tree: any[] = [];
  for (const menu of menuList) {
    if (menu.parentId === parentId) {
      const children = buildMenuTree(menuList, menu.menuId);
      if (children.length > 0) menu.children = children;
      tree.push(menu);
    }
  }
  return tree;
}

// --- 加载菜单 ---
async function loadMenuTree() {
  try {
    menuLoading.value = true;
    const res = await getPlatMenuListApi({ platformType: 1 });
    menuTreeData.value = buildMenuTree(res || []);
    await nextTick();

    if (menuTreeRef.value && formData.value.merchantMenuIds?.length) {
      const checkedIds = formData.value.merchantMenuIds;
      const leafKeys: any[] = [];
      const findLeafIds = (nodes: any[]) => {
        nodes.forEach((node) => {
          if (!node.children || node.children.length === 0) {
            if (checkedIds.includes(node.menuId)) leafKeys.push(node.menuId);
          } else {
            findLeafIds(node.children);
          }
        });
      };
      findLeafIds(menuTreeData.value);
      menuTreeRef.value.setCheckedKeys(leafKeys);
    }
  } catch {
    ElMessage.error('加载菜单权限失败');
  } finally {
    menuLoading.value = false;
  }
}

// --- 打开弹窗 ---
async function open(row?: Merchant) {
  visible.value = true;
  activeTab.value = 'basic';

  if (row?.merchantId) {
    title.value = '编辑商户';
    try {
      const res = await getPlatMerchantDetailApi(row.merchantId);
      formData.value = res || {};
      if (res.longitude && res.latitude) {
        location.value = { lng: res.longitude, lat: res.latitude };
      }
      if (res.provinceCode || res.cityCode || res.districtCode) {
        areaCodes.value = buildAreaCodes(
          res.provinceCode,
          res.cityCode,
          res.districtCode,
        );
      }
    } catch {
      ElMessage.error('获取商户信息失败');
    }
  } else {
    title.value = '新增商户';
    formData.value = {
      status: 0,
      merchantMenuIds: [],
      provinceCode: '',
      cityCode: '',
      districtCode: '',
    };
    location.value = null;
    areaCodes.value = '';
  }

  await loadMenuTree();
}

// --- 地图选点 ---
function handleMapChange(info: any) {
  if (info) {
    formData.value.longitude = info.lng;
    formData.value.latitude = info.lat;
    formData.value.detailAddress = info.address;
    areaCodes.value = info.areaCodes;
    if (info.areaCodes) {
      const codes = parseAreaCodes(info.areaCodes);
      formData.value.provinceCode = codes.provinceCode;
      formData.value.cityCode = codes.cityCode;
      formData.value.districtCode = codes.districtCode;
    }
    formData.value.province = info.province;
    formData.value.city = info.city;
    formData.value.district = info.district;
  } else {
    formData.value.longitude = undefined;
    formData.value.latitude = undefined;
    formData.value.detailAddress = '';
    areaCodes.value = '';
    formData.value.provinceCode = '';
    formData.value.cityCode = '';
    formData.value.districtCode = '';
  }
}

// --- 区域选择 ---
function handleAreaChange(codes: string) {
  if (codes) {
    const { provinceCode, cityCode, districtCode } = parseAreaCodes(codes);
    formData.value.provinceCode = provinceCode;
    formData.value.cityCode = cityCode;
    formData.value.districtCode = districtCode;
  } else {
    formData.value.provinceCode = '';
    formData.value.cityCode = '';
    formData.value.districtCode = '';
  }
}

// --- 提交 ---
async function handleSubmit() {
  if (!formData.value.merchantName?.trim()) {
    ElMessage.warning('请输入商户名称');
    return;
  }

  if (menuTreeRef.value) {
    const checkedKeys = menuTreeRef.value.getCheckedKeys();
    const halfCheckedKeys = menuTreeRef.value.getHalfCheckedKeys();
    formData.value.merchantMenuIds = [...checkedKeys, ...halfCheckedKeys];
  }

  if (!formData.value.merchantMenuIds?.length) {
    ElMessage.warning('请选择商户菜单');
    return;
  }

  if (areaCodes.value) {
    const { provinceCode, cityCode, districtCode } = parseAreaCodes(
      areaCodes.value,
    );
    formData.value.provinceCode = provinceCode;
    formData.value.cityCode = cityCode;
    formData.value.districtCode = districtCode;
  }

  loading.value = true;
  try {
    const api = formData.value.merchantId
      ? editPlatMerchantApi
      : addPlatMerchantApi;
    await api(formData.value);
    ElMessage.success(formData.value.merchantId ? '修改成功' : '新增成功');
    visible.value = false;
    emit('success');
  } catch {
    ElMessage.error('操作失败');
  } finally {
    loading.value = false;
  }
}

// --- 重置 ---
function resetForm() {
  if (formRef.value) formRef.value.resetFields();
  location.value = null;
  logoList.value = [];
  areaCodes.value = '';
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="1400px"
    append-to-body
    @close="resetForm"
  >
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 基本信息 -->
      <el-tab-pane label="基本信息" name="basic">
        <el-row :gutter="20">
          <el-col :span="10">
            <el-form
              ref="formRef"
              :model="formData"
              :rules="formRules"
              label-width="100px"
              label-position="right"
            >
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="商户名称" prop="merchantName" required>
                    <el-input
                      v-model="formData.merchantName"
                      placeholder="请输入商户名称"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="商户编码">
                    <el-input
                      v-model="formData.merchantCode"
                      placeholder="请输入商户编码"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="联系人">
                    <el-input
                      v-model="formData.contact"
                      placeholder="请输入联系人"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="联系电话">
                    <el-input
                      v-model="formData.phone"
                      placeholder="请输入联系电话"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item label="商户Logo">
                <UploadImage
                  v-model="logoList"
                  :limit="1"
                  :file-size="5"
                  :file-type="['png', 'jpg', 'jpeg']"
                />
                <div class="text-gray-400 text-xs mt-1">
                  建议尺寸：200*200px，支持png、jpg、jpeg格式，大小不超过5MB
                </div>
              </el-form-item>

              <el-form-item label="区域">
                <AreaCascader
                  v-model="areaCodes"
                  placeholder="请选择区域"
                  @change="handleAreaChange"
                />
              </el-form-item>

              <el-form-item label="详细地址">
                <el-input
                  v-model="formData.detailAddress"
                  placeholder="请输入详细地址"
                />
              </el-form-item>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="经度">
                    <el-input-number
                      v-model="formData.longitude"
                      :precision="6"
                      :step="0.000001"
                      placeholder="经度"
                      :controls="false"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="纬度">
                    <el-input-number
                      v-model="formData.latitude"
                      :precision="6"
                      :step="0.000001"
                      placeholder="纬度"
                      :controls="false"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item label="状态">
                <el-radio-group v-model="formData.status">
                  <el-radio :value="0">启用</el-radio>
                  <el-radio :value="1">禁用</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-form>
          </el-col>

          <el-col :span="14">
            <div class="map-wrapper">
              <MapPicker
                v-model="location"
                height="500px"
                @change="handleMapChange"
              />
            </div>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 菜单权限 -->
      <el-tab-pane label="菜单权限" name="menu">
        <div class="menu-permission-wrapper">
          <div class="menu-tip">
            提示：勾选下方菜单，设置商户可访问的菜单权限
          </div>
          <el-tree
            ref="menuTreeRef"
            :data="menuTreeData"
            show-checkbox
            node-key="menuId"
            :props="{ label: 'menuName', children: 'children' }"
            :default-checked-keys="formData.merchantMenuIds"
            default-expand-all
            class="menu-tree"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.map-wrapper {
  padding: 0 8px;
}

.menu-permission-wrapper {
  min-height: 500px;
  padding: 16px;

  .menu-tip {
    padding: 8px 12px;
    margin-bottom: 16px;
    font-size: 12px;
    color: #909399;
    background-color: #f5f7fa;
    border-radius: 4px;
  }

  .menu-tree {
    max-height: 450px;
    padding: 12px;
    overflow-y: auto;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
  }
}
</style>
