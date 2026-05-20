import type { Member, MemberApiParams, MemberApiResponse } from './types';

import { computed, defineComponent, ref, watchEffect } from 'vue';

import { http } from '@/utils/http';

export default defineComponent({
  name: 'MemberSelect',
  props: {
    modelValue: {
      type: Array,
      default: () => [],
    },
    multiple: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      type: String,
      default: '请选择人员',
    },
    deptId: {
      type: String,
      default: '',
    },
  },
  setup(props, { emit }) {
    const members = ref([] as Member[]);
    const data = computed({
      get: () => (props.multiple ? props.modelValue : props.modelValue[0]),
      set: (value) => {
        if (props.readonly) return;
        emit('update:modelValue', Array.isArray(value) ? value : [value]);
      },
    });

    // 数据获取
    watchEffect(() => {
      const deptId = props.deptId || 'list';
      // http.get<MemberApiResponse, MemberApiParams>(`/member/${deptId}`).then((res) => {
      //   members.value = res.data ?? [];
      // });
      members.value = [
        { id: '111', name: '测试1' },
        { id: '222', name: '测试2' },
        {
          id: '333',
          name: '测试3',
        },
      ] as any;
    });

    return () => (
      <el-select disabled={props.disabled} multiple={props.multiple} placeholder={props.placeholder} readonly={props.readonly} v-model={data.value}>
        {members.value.map((item) => (
          <el-option label={item.name} value={item.id} />
        ))}
      </el-select>
    );
  },
});
