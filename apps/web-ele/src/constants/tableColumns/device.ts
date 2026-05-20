// constants/tableColumns/device.ts
import type { TableColumnConfig } from './types';

// ========== 设备管理 ==========
export const DEVICE_STORAGE_KEY = 'device_table_columns';

export const defaultDeviceColumns: TableColumnConfig[] = [
  // { key: 'deviceId', label: '设备ID', visible: true, width: 80, align: 'center' },
  { key: 'deviceName', label: '设备名称', visible: true, minWidth: 180, align: 'left', fixed: true, showOverflowTooltip: true },
  { key: 'deviceNo', label: '设备编号', visible: true, width: 150, align: 'center' },
  { key: 'qrCode', label: '面贴编号', visible: true, width: 250, align: 'center', showOverflowTooltip: true },
  { key: 'deviceAddress', label: '设备地址', visible: true, minWidth: 200, align: 'center', showOverflowTooltip: true },
  { key: 'detailAddress', label: '详细地址', visible: false, minWidth: 200, align: 'center',showOverflowTooltip: true},
  // { key: 'merchantId', label: '所属商户ID', visible: false, width: 100, align: 'center' },
  // { key: 'deptId', label: '小区ID', visible: false, width: 100, align: 'center' },
  { key: 'deviceConfigId', label: '绑定设备配置ID', visible: false, width: 120, align: 'center' },
  { key: 'provinceCode', label: '省份编码', visible: false, width: 100, align: 'center' },
  { key: 'provinceName', label: '省份名称', visible: false, width: 100, align: 'center' },
  { key: 'cityCode', label: '城市编码', visible: false, width: 100, align: 'center' },
  { key: 'cityName', label: '城市名称', visible: false, width: 100, align: 'center' },
  { key: 'districtCode', label: '区县编码', visible: false, width: 100, align: 'center' },
  { key: 'districtName', label: '区县名称', visible: false, width: 100, align: 'center' },
  { key: 'longitude', label: '经度', visible: false, width: 120, align: 'center' },
  { key: 'latitude', label: '纬度', visible: false, width: 120, align: 'center' },
  { key: 'deviceBrand', label: '设备品牌', visible: false, width: 100, align: 'center' },
  { key: 'deviceHatchType', label: '设备类型', visible: true, width: 100, align: 'center' },
  { key: 'isVirtualHatch', label: '是否虚拟多仓', visible: false, width: 100, align: 'center' },
  { key: 'lockType', label: '锁类型', visible: false, width: 100, align: 'center' },
  { key: 'compressor', label: '是否压缩机', visible: false, width: 100, align: 'center' },
  { key: 'compressorNum', label: '压缩次数', visible: false, width: 100, align: 'center' },
  { key: 'iccid', label: '流量卡号', visible: false, width: 150, align: 'center' },
  { key: 'hardwareVersion', label: '硬件版本', visible: false, width: 120, align: 'center' },
  { key: 'softwareVersion', label: '软件版本', visible: false, width: 120, align: 'center' },
  { key: 'signal', label: '信号强度', visible: false, width: 100, align: 'center' },
  { key: 'volume', label: '设备音量', visible: false, width: 100, align: 'center' },
  { key: 'logo', label: '图标地址', visible: false, width: 150, align: 'center' },
  { key: 'customerPhone', label: '客服电话', visible: false, width: 120, align: 'center' },
  { key: 'onlineStatus', label: '在线状态', visible: true, width: 100, align: 'center' },
  { key: 'onlineTime', label: '上线时间', visible: true, width: 160, align: 'center' },
  { key: 'offTime', label: '离线时间', visible: true, width: 160, align: 'center' },
  { key: 'lastHeartTime', label: '最后心跳', visible: false, width: 160, align: 'center' },
  { key: 'expireTime', label: '过期时间', visible: false, width: 160, align: 'center' },
  { key: 'status', label: '状态', visible: true, width: 100, align: 'center' },
  { key: 'radiusKm', label: '范围距离(km)', visible: false, width: 100, align: 'center' },
  // { key: 'devicePackageId', label: '绑定计费套餐ID', visible: false, width: 120, align: 'center' },
  { key: 'createTime', label: '创建时间', visible: false, width: 160, align: 'center' },
];

// ========== 计费套餐 ==========
export const PACKAGE_STORAGE_KEY = 'package_table_columns';

export const defaultPackageColumns: TableColumnConfig[] = [
  { key: 'devicePackageId', label: '套餐ID', visible: true, width: 80, align: 'center' },
  { key: 'packageName', label: '套餐名称', visible: true, minWidth: 180, align: 'left',fixed: true },
  { key: 'packageType', label: '计费类型', visible: true, width: 120, align: 'center' },
  { key: 'unitPrice', label: '回收单价', visible: true, width: 140, align: 'right' },
  { key: 'status', label: '状态', visible: true, width: 100, align: 'center' },
];

// ========== 仓口管理 ==========
export const HATCH_STORAGE_KEY = 'hatch_table_columns';

export const defaultHatchColumns: TableColumnConfig[] = [
  { key: 'deviceHatchId', label: '仓口ID', visible: true, width: 80, align: 'center' },
  { key: 'hatchName', label: '仓口名称', visible: true, minWidth: 140, align: 'left' },
  { key: 'hatchNo', label: '仓口编号', visible: true, width: 150, align: 'center' },
  { key: 'deviceId', label: '所属设备', visible: true, width: 150, align: 'center', showOverflowTooltip: true },
  { key: 'currentWeight', label: '当前重量(kg)', visible: true, width: 120, align: 'right' },
  { key: 'weightThreshold', label: '满仓阈值(kg)', visible: true, width: 120, align: 'right' },
  { key: 'hatchStatus', label: '仓口状态', visible: true, width: 100, align: 'center' },
  { key: 'lastCleanTime', label: '最后清运时间', visible: true, width: 160, align: 'center' },
  { key: 'status', label: '状态', visible: true, width: 100, align: 'center' },
];

// ========== 设备故障 ==========
export const FAULT_STORAGE_KEY = 'fault_table_columns';

export const defaultFaultColumns: TableColumnConfig[] = [
  { key: 'deviceFaultId', label: '故障ID', visible: true, width: 80, align: 'center' },
  { key: 'deviceNo', label: '设备编号', visible: true, minWidth: 140, align: 'left' },
  { key: 'faultCode', label: '故障编码', visible: true, width: 120, align: 'center' },
  { key: 'faultName', label: '故障名称', visible: true, minWidth: 150, align: 'left' },
  { key: 'faultRemark', label: '故障描述', visible: true, minWidth: 180, align: 'left' },
  { key: 'startTime', label: '发生时间', visible: true, width: 160, align: 'center' },
  { key: 'duration', label: '持续时长', visible: true, width: 100, align: 'center' },
  { key: 'faultStatus', label: '故障状态', visible: true, width: 100, align: 'center' },
  { key: 'dealUserName', label: '处理人', visible: true, width: 100, align: 'center' },
];


// ========== 设备配置 ==========
export const CONFIG_STORAGE_KEY = 'device_config_table_columns';

export const defaultConfigColumns: TableColumnConfig[] = [
  { key: 'deviceConfigId', label: '配置ID', visible: true, width: 80, align: 'center' },
  { key: 'configName', label: '配置名称', visible: true, minWidth: 150, align: 'left' },
  { key: 'deviceBrand', label: '设备品牌', visible: true, width: 120, align: 'center' },
  { key: 'deliverEndTimeout', label: '投递超时', visible: true, width: 100, align: 'center' },
  { key: 'recycleEndTimeout', label: '回收超时', visible: true, width: 100, align: 'center' },
  { key: 'deliverDoorMotorTimeout', label: '电机超时', visible: false, width: 100, align: 'center' },
  { key: 'deliverDoorHandStopCount', label: '夹手停止次数', visible: false, width: 120, align: 'center' },
  { key: 'deliverDoorHandOpenCount', label: '夹手开门次数', visible: false, width: 120, align: 'center' },
  { key: 'fanTempMax', label: '风扇温度上限', visible: false, width: 120, align: 'center' },
  { key: 'fanTempMin', label: '风扇温度下限', visible: false, width: 120, align: 'center' },
  { key: 'topLightType', label: '顶部灯光', visible: true, width: 100, align: 'center' },
  { key: 'topLightBrightness', label: '顶部亮度', visible: false, width: 100, align: 'center' },
  { key: 'outLightType', label: '箱外灯光', visible: false, width: 100, align: 'center' },
  { key: 'outLightBrightness', label: '箱外亮度', visible: false, width: 100, align: 'center' },
  { key: 'status', label: '状态', visible: true, width: 100, align: 'center' },
];


// ========== 包袋管理 ==========
export const BAG_STORAGE_KEY = 'bag_table_columns';

export const defaultBagColumns: TableColumnConfig[] = [
  // { key: 'deviceBagId', label: '包袋ID', visible: true, width: 80, align: 'center' },
  { key: 'bagNo', label: '包袋编号', visible: true, minWidth: 180, align: 'left' },
  { key: 'bagQrCode', label: '包袋二维码唯一编号', visible: true, minWidth: 180, align: 'left' },
  { key: 'deviceId', label: '绑定设备ID', visible: true, width: 100, align: 'center' },
  { key: 'hatchNo', label: '绑定仓口', visible: true, width: 150, align: 'center' },
  { key: 'bagStatus', label: '包袋状态', visible: true, width: 100, align: 'center' },
  { key: 'bindTime', label: '绑定时间', visible: true, width: 180, align: 'center' },
  { key: 'unbindTime', label: '解绑时间', visible: true, width: 180, align: 'center' },
  { key: 'status', label: '状态', visible: true, width: 100, align: 'center' },
];
