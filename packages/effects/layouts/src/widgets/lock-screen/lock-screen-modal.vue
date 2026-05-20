<script setup lang="ts">
import type { Recordable } from '@vben/types';

import { computed, reactive } from 'vue';

import { $t } from '@vben/locales';

import { useVbenForm, z } from '@vben-core/form-ui';
import { useVbenModal } from '@vben-core/popup-ui';
import { VbenAvatar, VbenButton } from '@vben-core/shadcn-ui';

interface Props {
  avatar?: string;
  text?: string;
}

defineOptions({
  name: 'LockScreenModal',
});

withDefaults(defineProps<Props>(), {
  avatar: '',
  text: '',
});

const emit = defineEmits<{
  submit: [Recordable<any>];
}>();

const [Form, { resetForm, validate, getValues, getFieldComponentRef }] =
  useVbenForm(
    reactive({
      commonConfig: {
        hideLabel: true,
        hideRequiredMark: true,
      },
      schema: computed(() => [
        {
          component: 'VbenInputPassword' as const,
          componentProps: {
            placeholder: $t('ui.widgets.lockScreen.placeholder'),
          },
          fieldName: 'lockScreenPassword',
          formFieldProps: { validateOnBlur: false },
          label: $t('authentication.password'),
          rules: z
            .string()
            .min(1, { message: $t('ui.widgets.lockScreen.placeholder') }),
        },
      ]),
      showDefaultActions: false,
    }),
  );

const [Modal] = useVbenModal({
  onConfirm() {
    handleSubmit();
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      resetForm();
    }
  },
  onOpened() {
    requestAnimationFrame(() => {
      getFieldComponentRef('lockScreenPassword')
        ?.$el?.querySelector('[name="lockScreenPassword"]')
        ?.focus();
    });
  },
});

async function handleSubmit() {
  const { valid } = await validate();
  const values = await getValues();
  if (valid) {
    emit('submit', values?.lockScreenPassword);
  }
}
</script>

<template>
  <Modal
    :footer="false"
    :fullscreen-button="false"
    :title="$t('ui.widgets.lockScreen.title')"
  >
    <div
      class="lock-screen-content mb-10 flex w-full flex-col items-center px-10"
      @keydown.enter.prevent="handleSubmit"
    >
      <div class="w-full">
        <div class="ml-2 flex w-full flex-col items-center">
          <VbenAvatar
            :src="avatar"
            class="size-20"
            dot-class="bottom-0 right-1 border-2 size-4 bg-green-500"
          />
          <div class="my-6 flex items-center font-medium text-foreground">
            {{ text }}
          </div>
        </div>
        <Form />
        <VbenButton class="mt-1 w-full" @click="handleSubmit">
          {{ $t('ui.widgets.lockScreen.screenButton') }}
        </VbenButton>
      </div>
    </div>
  </Modal>
</template>
<style scoped>
.lock-screen-content {
  padding: 20px !important;
  background-image: url('https://plus.unsplash.com/premium_vector-1697729510037-b7f652020cb1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZGVza3RvcCUyMHdhbGxwYXBlcnxlbnwwfHwwfHx8MA%3D%3D');
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  border-radius: 12px;
}
</style>
