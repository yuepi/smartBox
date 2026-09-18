<script lang="ts" setup>
import type { HomeCategory } from '#/api/system/homeCategory';
import type { HomeItem, SkuCombo } from '#/api/system/housekeeping';

import { reactive, ref, watch } from 'vue';

import {
  addHomeItemApi,
  editHomeItemApi,
  getHomeItemDetailApi,
  getHomeItemCategoriesApi,
} from '#/api/system/housekeeping';
import UploadImage from '#/components/UploadImage/index.vue';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const submitLoading = ref(false);
const isEdit = ref(false);
const formRef = ref();

const categoryTreeOptions = ref<HomeCategory[]>([]);
const imageFileList = ref<string[]>([]);
const dimInputValue = reactive<Record<number, string>>({});

// 表单响应式数据定义
const formData = reactive<HomeItem>({
  homeItemId: undefined,
  categoryId: undefined,
  itemName: '',
  unit: 'time',
  description: '',
  imageUrls: [],
  sort: 1,
  status: 0,
  skuDimList: [],
  skuComboList: [],
  optionGroupList: [],
});

const rules = {
  itemName: [{ required: true, message: '请输入服务名称', trigger: 'blur' }],
  categoryId: [
    { required: true, message: '请选择所属分类', trigger: 'change' },
  ],
  unit: [{ required: true, message: '请选择收费单位', trigger: 'change' }],
};

// 计费方式通俗化配置
const unitOptions = [
  { label: '按次计费', value: 'time' },
  { label: '按台计费', value: 'pcs' },
  { label: '按小时计费', value: 'hour' },
];

function handleListToTree(list: HomeCategory[], parentId = 0): HomeCategory[] {
  const tree: HomeCategory[] = [];
  for (const item of list) {
    if (item.parentId === parentId) {
      const children = handleListToTree(list, item.categoryId);
      if (children.length > 0) item.children = children;
      tree.push(item);
    }
  }
  return tree;
}

watch(
  imageFileList,
  (val) => {
    formData.imageUrls = val || [];
  },
  { deep: true },
);

async function loadCategories() {
  try {
    const list = await getHomeItemCategoriesApi();
    categoryTreeOptions.value =
      Array.isArray(list) && list.length > 0
        ? list[0]?.children
          ? list
          : handleListToTree(list, 0)
        : [];
  } catch {
    categoryTreeOptions.value = [];
  }
}

// ---------------- 动态生成不同规格的价格组合 ----------------
function generateSkuCombos() {
  const validDims = (formData.skuDimList || []).filter(
    (d) => d.dimName && d.valueList && d.valueList.length > 0,
  );

  if (validDims.length === 0) {
    formData.skuComboList = [];
    return;
  }

  const cartesian = (args: any[][]): any[][] => {
    return args.reduce<any[][]>(
      (a, b) => a.flatMap((d) => b.map((e) => [d, e].flat())),
      [[]],
    );
  };

  const dimValues = validDims.map((d) => d.valueList.map((v) => v.valueName));
  const combinations = cartesian(dimValues);

  const oldMap = new Map<string, SkuCombo>();
  (formData.skuComboList || []).forEach((item) => {
    const key = item.comboName;
    if (key) oldMap.set(key, item);
  });

  formData.skuComboList = combinations.map((combo, idx) => {
    const comboName = combo.join(' / ');
    const existing = oldMap.get(comboName);
    return {
      comboId: existing?.comboId,
      comboName,
      price: existing?.price ?? 0,
      marketPrice: existing?.marketPrice ?? 0,
      stock: existing?.stock ?? 0,
      sort: idx + 1,
      status: 0,
      // 首次新增尚无数据库ID，名称按维度顺序传入，由服务端落库后解析。
      dimValueNames: combo,
    };
  });
}

function addSkuDim() {
  formData.skuDimList = formData.skuDimList || [];
  formData.skuDimList.push({
    dimName: '',
    required: 1,
    sort: formData.skuDimList.length + 1,
    status: 0,
    valueList: [],
  });
}

function removeSkuDim(index: number) {
  formData.skuDimList?.splice(index, 1);
  generateSkuCombos();
}

function addDimValue(dimIndex: number) {
  const val = dimInputValue[dimIndex]?.trim();
  if (!val) return;
  const dim = formData.skuDimList![dimIndex];
  if (!dim) return;
  if (!dim.valueList) dim.valueList = [];
  if (!dim.valueList.some((v) => v.valueName === val)) {
    dim.valueList.push({
      valueName: val,
      sort: dim.valueList.length + 1,
      status: 0,
    });
    generateSkuCombos();
  }
  dimInputValue[dimIndex] = '';
}

function removeDimValue(dimIndex: number, valIndex: number) {
  formData.skuDimList?.[dimIndex]?.valueList.splice(valIndex, 1);
  generateSkuCombos();
}

// ---------------- 附加服务/加价项逻辑 ----------------
function addOptionGroup() {
  formData.optionGroupList = formData.optionGroupList || [];
  formData.optionGroupList.push({
    optionName: '',
    optionType: 1, // 1=单选, 2=多选
    required: 0,
    sort: formData.optionGroupList.length + 1,
    status: 0,
    valueList: [],
  });
}

function removeOptionGroup(index: number) {
  formData.optionGroupList?.splice(index, 1);
}

function addOptionValue(groupIndex: number) {
  const group = formData.optionGroupList![groupIndex];
  if (!group) return;
  if (!group.valueList) group.valueList = [];
  group.valueList.push({
    valueName: '',
    priceDelta: 0,
    sort: group.valueList.length + 1,
    status: 0,
  });
}

function removeOptionValue(groupIndex: number, valIndex: number) {
  formData.optionGroupList?.[groupIndex]?.valueList.splice(valIndex, 1);
}

function resetForm() {
  Object.assign(formData, {
    homeItemId: undefined,
    categoryId: undefined,
    itemName: '',
    unit: 'time',
    description: '',
    imageUrls: [],
    sort: 1,
    status: 0,
    skuDimList: [],
    skuComboList: [],
    optionGroupList: [],
  });
  imageFileList.value = [];
  formRef.value?.clearValidate();
}

async function open(row?: HomeItem) {
  visible.value = true;
  isEdit.value = !!row?.homeItemId;
  resetForm();
  loadCategories();

  if (isEdit.value && row?.homeItemId) {
    loading.value = true;
    try {
      const detail = await getHomeItemDetailApi(row.homeItemId);
      Object.assign(formData, detail);
      if (typeof detail.imageUrls === 'string') {
        imageFileList.value = (detail.imageUrls as string)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (Array.isArray(detail.imageUrls)) {
        imageFileList.value = detail.imageUrls;
      }
    } finally {
      loading.value = false;
    }
  }
}

async function handleSubmit() {
  if (submitLoading.value || loading.value) return;
  await formRef.value?.validate();
  submitLoading.value = true;
  try {
    const payload = { ...formData };
    if (isEdit.value) {
      await editHomeItemApi(payload);
      ElMessage.success('保存成功');
    } else {
      await addHomeItemApi(payload);
      ElMessage.success('创建服务项成功');
    }
    visible.value = false;
    emit('success');
  } finally {
    submitLoading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑服务项' : '新增服务项'"
    width="860px"
    append-to-body
    destroy-on-close
  >
    <el-form
      ref="formRef"
      v-loading="loading"
      :model="formData"
      :rules="rules"
      label-width="110px"
      class="max-h-[72vh] overflow-y-auto pr-3"
    >
      <!-- 基本信息 -->
      <div class="mb-3 border-b pb-1 font-bold text-gray-800">1. 基本信息</div>

      <el-form-item label="服务名称" prop="itemName">
        <el-input
          v-model="formData.itemName"
          placeholder="例如：柜式空调移机、挂机深度清洗"
        />
      </el-form-item>

      <div class="grid grid-cols-2 gap-2">
        <el-form-item label="服务分类" prop="categoryId">
          <el-tree-select
            v-model="formData.categoryId"
            :data="categoryTreeOptions"
            :props="{ label: 'categoryName', children: 'children' }"
            check-strictly
            node-key="categoryId"
            placeholder="请选择具体分类"
            class="w-full"
            clearable
            filterable
          />
        </el-form-item>

        <el-form-item label="收费单位" prop="unit">
          <el-select v-model="formData.unit" class="w-full">
            <el-option
              v-for="item in unitOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <el-form-item label="显示排序" prop="sort">
          <el-input-number v-model="formData.sort" :min="1" class="!w-full" />
        </el-form-item>

        <el-form-item label="展示状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :value="0">正常上架</el-radio>
            <el-radio :value="1">下架隐藏</el-radio>
          </el-radio-group>
        </el-form-item>
      </div>

      <el-form-item label="服务宣传图" prop="imageUrls">
        <UploadImage
          v-model="imageFileList"
          :limit="5"
          :file-size="5"
          :file-type="['png', 'jpg', 'jpeg']"
        />
      </el-form-item>

      <el-form-item label="服务详细说明" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="2"
          placeholder="例如：含拆机、运输、重新安装及抽真空全套服务"
        />
      </el-form-item>

      <!-- 规格配置 -->
      <div class="mb-2 mt-6 flex items-center justify-between border-b pb-1">
        <div>
          <span class="font-bold text-gray-800">2. 服务规格与定价</span>
          <span class="ml-2 text-xs text-gray-400"
            >比如：匹数、楼层、型号等属性</span
          >
        </div>
        <el-button
          type="primary"
          plain
          size="small"
          icon="Plus"
          @click="addSkuDim"
        >
          添加规格项
        </el-button>
      </div>

      <div
        v-for="(dim, index) in formData.skuDimList"
        :key="index"
        class="mb-3 rounded border border-gray-200 bg-gray-50 p-3"
      >
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold text-gray-600">规格名称：</span>
          <el-input
            v-model="dim.dimName"
            placeholder="如：空调匹数 / 服务楼层"
            class="!w-48"
            size="small"
            @blur="generateSkuCombos"
          />
          <el-checkbox
            v-model="dim.required"
            :true-value="1"
            :false-value="0"
            size="small"
          >
            用户下单时必选
          </el-checkbox>
          <el-button
            type="danger"
            link
            size="small"
            @click="removeSkuDim(index)"
            >删除此规格</el-button
          >
        </div>

        <div class="mt-2 flex flex-wrap items-center gap-2">
          <span class="text-xs text-gray-400">包含的选项：</span>
          <el-tag
            v-for="(val, vIdx) in dim.valueList"
            :key="vIdx"
            closable
            size="small"
            @close="removeDimValue(index, vIdx)"
          >
            {{ val.valueName }}
          </el-tag>
          <div class="flex items-center gap-1">
            <el-input
              v-model="dimInputValue[index]"
              placeholder="新增选项值"
              class="!w-32"
              size="small"
              @keyup.enter="addDimValue(index)"
            />
            <el-button size="small" @click="addDimValue(index)"
              >回车添加</el-button
            >
          </div>
        </div>
      </div>

      <!-- 组合价格表 -->
      <div
        v-if="formData.skuComboList && formData.skuComboList.length > 0"
        class="mt-4"
      >
        <div class="mb-1 text-xs font-bold text-gray-600">
          各规格组合价格明细：
        </div>
        <el-table :data="formData.skuComboList" border size="small">
          <el-table-column prop="comboName" label="规格组合" min-width="140" />
          <el-table-column label="实付价/到手价 (元)" width="150">
            <template #default="{ row }">
              <el-input-number
                v-model="row.price"
                :min="0"
                :precision="2"
                size="small"
                controls-position="right"
                class="!w-full"
              />
            </template>
          </el-table-column>
          <el-table-column label="原价/划线价 (元)" width="150">
            <template #default="{ row }">
              <el-input-number
                v-model="row.marketPrice"
                :min="0"
                :precision="2"
                size="small"
                controls-position="right"
                class="!w-full"
              />
            </template>
          </el-table-column>
          <el-table-column label="最大接单量 (0为不限)" width="160">
            <template #default="{ row }">
              <el-input-number
                v-model="row.stock"
                :min="0"
                size="small"
                controls-position="right"
                class="!w-full"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 附加项配置 -->
      <div class="mb-2 mt-6 flex items-center justify-between border-b pb-1">
        <div>
          <span class="font-bold text-gray-800">3. 附加服务 / 加价选项</span>
          <span class="ml-2 text-xs text-gray-400"
            >比如：加急费、高空作业费、打孔费等选填加价项</span
          >
        </div>
        <el-button
          type="primary"
          plain
          size="small"
          icon="Plus"
          @click="addOptionGroup"
        >
          添加加价组
        </el-button>
      </div>

      <div
        v-for="(group, gIdx) in formData.optionGroupList"
        :key="gIdx"
        class="mb-3 rounded border border-gray-200 bg-gray-50 p-3"
      >
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold text-gray-600">加价组名称：</span>
          <el-input
            v-model="group.optionName"
            placeholder="如：墙体打孔服务"
            class="!w-44"
            size="small"
          />

          <span class="text-xs text-gray-500">选择方式：</span>
          <el-select v-model="group.optionType" class="!w-28" size="small">
            <el-option :value="1" label="单选" />
            <el-option :value="2" label="多选" />
          </el-select>

          <el-checkbox
            v-model="group.required"
            :true-value="1"
            :false-value="0"
            size="small"
            >必选</el-checkbox
          >
          <el-button
            type="primary"
            link
            size="small"
            @click="addOptionValue(gIdx)"
            >添加选项</el-button
          >
          <el-button
            type="danger"
            link
            size="small"
            @click="removeOptionGroup(gIdx)"
            >删除组</el-button
          >
        </div>

        <div
          v-for="(val, vIdx) in group.valueList"
          :key="vIdx"
          class="mt-2 flex items-center gap-2 pl-4"
        >
          <span class="text-xs text-gray-400">选项：</span>
          <el-input
            v-model="val.valueName"
            placeholder="如：混凝土打孔"
            class="!w-40"
            size="small"
          />

          <span class="text-xs text-gray-500">加价金额：</span>
          <el-input-number
            v-model="val.priceDelta"
            :precision="2"
            size="small"
            controls-position="right"
            class="!w-32"
          />
          <span class="text-xs text-gray-400">元</span>

          <el-button
            type="danger"
            icon="Delete"
            circle
            size="small"
            link
            @click="removeOptionValue(gIdx, vIdx)"
          />
        </div>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
        提交保存
      </el-button>
    </template>
  </el-dialog>
</template>
