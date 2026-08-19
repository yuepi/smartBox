<script lang="ts" setup>
import type { Device } from '#/api/device/device'
import type { DeviceConfig } from '#/api/device/deviceConfig'
import type { DevicePackage } from '#/api/device/devicePackage'
import type { Qrcode } from '#/api/device/qrCode'
import type { Dept } from '#/api/system/dept'

import { addDeviceApi, editDeviceApi, getDeviceDetailApi } from '#/api/device/device'
import { getDeviceConfigListApi } from '#/api/device/deviceConfig'
import { getDevicePackageListApi } from '#/api/device/devicePackage'
import { getQrcodeListApi } from '#/api/device/qrCode'
import { getMerchantDeptListApi } from '#/api/system/dept'

// --- Emits ---
const emit = defineEmits<{
  (e: 'success'): void
}>()

const { device_brand, device_hatch_type } = useDicts(['device_brand', 'device_hatch_type'])

// --- 弹窗状态（内部管理） ---
const visible = ref(false)
const formTitle = ref('')

const formData = ref<Partial<Device>>({
  status: 0,
  deviceBrand: undefined,
  deviceHatchType: undefined,
  isVirtualHatch: 0,
  lockType: 0,
  compressor: 0,
  volume: 50,
  devicePackageId: undefined,
  deviceConfigId: undefined,
  qrCode: undefined,
})

// --- 其他状态 ---
const formRef = ref()
const formSubmitting = ref(false)
const location = ref<null | { lat: number; lng: number }>(null)
const areaCodes = ref('')
const qrcodeLoading = ref(false)

// 下拉选项
const deviceConfigOptions = ref<DeviceConfig[]>([])
const deptOptions = ref<Dept[]>([])
const qrcodeOptions = ref<Qrcode[]>([])
const devicePackageOptions = ref<DevicePackage[]>([])

// 表单校验规则
const formRules = reactive({
  deviceName: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  deviceNo: [{ required: true, message: '请输入设备编号', trigger: 'blur' }],
  deviceBrand: [{ required: true, message: '请选择设备品牌', trigger: 'change' }],
  deviceHatchType: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
  deptId: [{ required: true, message: '请选择所属部门', trigger: 'change' }],
  deviceConfigId: [{ required: true, message: '请选择设备配置', trigger: 'change' }],
  devicePackageId: [{ required: true, message: '请选择设备套餐', trigger: 'change' }],
  qrCode: [{ required: true, message: '请选择面贴编号', trigger: 'change' }],
})

// Logo 列表
const logoList = computed({
  get: () => {
    if (!formData.value.logo) return []
    return [formData.value.logo]
  },
  set: (val: string[]) => {
    formData.value.logo = val.length > 0 ? val[0] : ''
  },
})

// --- 解析区域编码 ---
function parseAreaCodes(codes: string): { cityCode: string; districtCode: string; provinceCode: string } {
  if (!codes) {
    return { provinceCode: '', cityCode: '', districtCode: '' }
  }
  const parts = codes.split(',').filter(Boolean)
  return {
    provinceCode: parts[0] || '',
    cityCode: parts[1] || '',
    districtCode: parts[2] || '',
  }
}

function buildAreaCodes(provinceCode?: string, cityCode?: string, districtCode?: string): string {
  const parts = [provinceCode, cityCode, districtCode].filter(Boolean)
  return parts.join(',')
}

// --- 加载选项 ---
async function loadOptions() {
  try {
    const [configRes, deptRes, packageRes, qrcodeRes] = await Promise.all([
      getDeviceConfigListApi({ status: 0 }),
      getMerchantDeptListApi({ status: 0 }),
      getDevicePackageListApi({ status: 0 }),
      getQrcodeListApi({
        qrcodeType: 0,
        status: 0,
        bindFlag: 0,
        pageSize: 1000,
      }),
    ])
    deviceConfigOptions.value = configRes || []
    deptOptions.value = deptRes || []
    devicePackageOptions.value = packageRes || []
    qrcodeOptions.value = qrcodeRes || []
  } catch (error) {
    console.error(error)
  }
}

// --- 加载未绑定的二维码 ---
async function loadQrcodeList() {
  try {
    qrcodeLoading.value = true
    const res = await getQrcodeListApi({
      qrcodeType: 0,
      status: 0,
      bindFlag: 0,
      pageSize: 1000,
    })
    qrcodeOptions.value = res || []
  } catch (error) {
    console.error('加载二维码列表失败：', error)
  } finally {
    qrcodeLoading.value = false
  }
}

// --- 加载编辑数据 ---
async function loadEditData(deviceId: number) {
  try {
    const res = await getDeviceDetailApi(deviceId)
    formData.value = res || {}

    if (res.longitude && res.latitude) {
      location.value = { lng: res.longitude, lat: res.latitude }
    }

    if (res.provinceCode || res.cityCode || res.districtCode) {
      areaCodes.value = buildAreaCodes(res.provinceCode, res.cityCode, res.districtCode)
    }
  } catch {
    ElMessage.error('获取设备信息失败')
  }
}

// --- 地图选点变化 ---
const handleMapChange = (info: any) => {
  if (info) {
    formData.value.longitude = info.lng
    formData.value.latitude = info.lat
    formData.value.detailAddress = info.address

    if (info.areaCodes) {
      areaCodes.value = info.areaCodes
      const { provinceCode, cityCode, districtCode } = parseAreaCodes(info.areaCodes)
      formData.value.provinceCode = provinceCode
      formData.value.cityCode = cityCode
      formData.value.districtCode = districtCode
    }
  } else {
    formData.value.longitude = undefined
    formData.value.latitude = undefined
    formData.value.detailAddress = ''
    areaCodes.value = ''
    formData.value.provinceCode = ''
    formData.value.cityCode = ''
    formData.value.districtCode = ''
  }
}

// --- 区域选择变化 ---
const handleAreaChange = (codes: string) => {
  if (codes) {
    const { provinceCode, cityCode, districtCode } = parseAreaCodes(codes)
    formData.value.provinceCode = provinceCode
    formData.value.cityCode = cityCode
    formData.value.districtCode = districtCode
  } else {
    formData.value.provinceCode = ''
    formData.value.cityCode = ''
    formData.value.districtCode = ''
  }
}

// --- 重置表单 ---
function resetForm() {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  formData.value = {
    status: 0,
    deviceBrand: undefined,
    deviceHatchType: undefined,
    isVirtualHatch: 0,
    lockType: 0,
    compressor: 0,
    volume: 50,
    devicePackageId: undefined,
    deviceConfigId: undefined,
    qrCode: undefined,
  }
  location.value = null
  areaCodes.value = ''
}

// --- 暴露给父组件的 open 方法 ---
async function open(row?: Device | null) {
  visible.value = true
  await loadOptions()
  await loadQrcodeList()

  if (row?.deviceId) {
    formTitle.value = '编辑设备'
    await loadEditData(row.deviceId)
  } else {
    formTitle.value = '新增设备'
    resetForm()
  }
}

// --- 提交表单 ---
async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) {
      ElMessage.warning('请完善表单信息')
      return
    }

    if (areaCodes.value) {
      const { provinceCode, cityCode, districtCode } = parseAreaCodes(areaCodes.value)
      formData.value.provinceCode = provinceCode
      formData.value.cityCode = cityCode
      formData.value.districtCode = districtCode
    }

    formSubmitting.value = true
    try {
      const api = formData.value.deviceId ? editDeviceApi : addDeviceApi
      await api(formData.value)
      ElMessage.success(formData.value.deviceId ? '修改成功' : '新增成功')
      visible.value = false
      emit('success')
    } catch {
      ElMessage.error('操作失败')
    } finally {
      formSubmitting.value = false
    }
  })
}

// --- 关闭弹窗 ---
function handleClose() {
  resetForm()
  visible.value = false
}

// --- 暴露方法 ---
defineExpose({ open })
</script>

<template>
  <el-dialog v-model="visible" :title="formTitle" width="1600px" top="5vh" append-to-body @close="handleClose">
    <el-row :gutter="20">
      <!-- 左侧：表单区域 -->
      <el-col :span="10">
        <el-form ref="formRef" :model="formData" :rules="formRules" label-width="110px" label-position="right">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="设备名称" prop="deviceName" required>
                <el-input v-model="formData.deviceName" placeholder="请输入设备名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="设备编号" prop="deviceNo" required>
                <el-input v-model="formData.deviceNo" placeholder="请输入设备编号" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="设备品牌" prop="deviceBrand" required>
                <el-select v-model="formData.deviceBrand" placeholder="请选择" style="width: 100%">
                  <el-option v-for="item in device_brand" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="设备类型" prop="deviceHatchType" required>
                <el-select v-model="formData.deviceHatchType" placeholder="请选择" style="width: 100%">
                  <el-option v-for="item in device_hatch_type" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="所属部门" prop="deptId" required>
                <el-tree-select
                  v-model="formData.deptId"
                  :data="deptOptions"
                  :props="{
                    value: 'deptId',
                    label: (data: any) => {
                      if (data.children && data.children.length > 0) {
                        return `${data.deptName} (不可选)`
                      }
                      return data.deptName
                    },
                    children: 'children',
                    disabled: (data: any) => {
                      return data.children && data.children.length > 0
                    },
                  }"
                  default-expand-all
                  placeholder="请选择所属部门"
                  clearable
                  check-strictly
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="设备配置" prop="deviceConfigId" required>
                <el-select v-model="formData.deviceConfigId" placeholder="请选择" clearable style="width: 100%">
                  <el-option
                    v-for="item in deviceConfigOptions"
                    :key="item.deviceConfigId"
                    :label="item.configName"
                    :value="item.deviceConfigId"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="设备套餐" prop="devicePackageId" required>
                <el-select v-model="formData.devicePackageId" placeholder="请选择设备套餐" clearable style="width: 100%">
                  <el-option
                    v-for="item in devicePackageOptions"
                    :key="item.devicePackageId"
                    :label="`${item.packageName}${item.unitPrice}元/kg`"
                    :value="item.devicePackageId"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="面贴编号" prop="qrCode" required>
                <el-select
                  v-model="formData.qrCode"
                  placeholder="请选择面贴编号"
                  clearable
                  filterable
                  :loading="qrcodeLoading"
                  style="width: 100%"
                >
                  <el-option
                    v-for="item in qrcodeOptions"
                    :key="item"
                    :label="item.qrcodeCode"
                    :value="item.qrcodeCode"
                  />
                </el-select>
                <div class="text-gray-400 text-xs mt-1">仅显示未绑定的设备二维码</div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="区域">
            <AreaCascader v-model="areaCodes" placeholder="请选择区域" @change="handleAreaChange" />
          </el-form-item>

          <el-form-item label="设备Logo">
            <UploadImage v-model="logoList" :limit="1" :file-size="5" :file-type="['png', 'jpg', 'jpeg']" />
            <div class="text-gray-400 text-xs mt-1">建议尺寸：200*200px，支持png、jpg、jpeg格式，大小不超过5MB</div>
          </el-form-item>

          <el-form-item label="详细地址">
            <el-input v-model="formData.detailAddress" placeholder="详细地址（门牌号/位置）" />
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

          <el-form-item label="客服电话">
            <el-input v-model="formData.customerPhone" placeholder="客服电话" />
          </el-form-item>

          <el-form-item label="状态">
            <el-radio-group v-model="formData.status">
              <el-radio :value="0">启用</el-radio>
              <el-radio :value="1">禁用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </el-col>

      <!-- 右侧：地图区域 -->
      <el-col :span="14">
        <div class="map-wrapper">
          <MapPicker v-model="location" height="550px" @change="handleMapChange" />
        </div>
      </el-col>
    </el-row>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="formSubmitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.map-wrapper {
  padding: 0 8px;
}
</style>
