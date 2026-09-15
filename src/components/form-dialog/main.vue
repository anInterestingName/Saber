<template>
  <app-dialog
    v-model="visible"
    class="form-dialog"
    :title="title"
    :subtitle="subtitle"
    :size="size"
    :width="width"
    :loading="loading"
    :failed="failed"
    :submitting="submitting"
    :dirty="dirty"
    :destroy-on-close="destroyOnClose"
    @retry="emit('retry')"
    @cancel="emit('cancel')"
  >
    <template v-if="$slots.status" #header-status><slot name="status" /></template>

    <slot />

    <template v-if="$slots.failed" #failed="{ retry }">
      <slot name="failed" :retry="retry" />
    </template>

    <template v-if="$slots['footer-extra']" #footer-extra>
      <slot name="footer-extra" />
    </template>

    <template #footer="{ cancel }">
      <el-button :disabled="submitting" @click="cancel">
        {{ mode === 'view' ? '关闭' : '取消' }}
      </el-button>
      <el-button
        v-if="mode === 'view' && canEdit"
        type="primary"
        :disabled="loading || failed || submitting"
        @click="emit('edit')"
      >
        编辑
      </el-button>
      <el-button
        v-else-if="mode !== 'view'"
        type="primary"
        :loading="submitting"
        :disabled="loading || failed || submitting || confirmDisabled"
        @click="emit('confirm')"
      >
        {{ mode === 'add' ? '创建' : '保存' }}
      </el-button>
    </template>
  </app-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppDialog from '@/components/app-dialog/main.vue';
import type { CrudMode } from '@/types/crud';

type DialogSize = 'sm' | 'md' | 'lg';

interface FormDialogProps {
  modelValue: boolean;
  mode: CrudMode;
  entityName: string;
  size?: DialogSize;
  subtitle?: string;
  submitting?: boolean;
  loading?: boolean;
  failed?: boolean;
  confirmDisabled?: boolean;
  dirty?: boolean;
  canEdit?: boolean;
  width?: string | number;
  destroyOnClose?: boolean;
}

const props = withDefaults(defineProps<FormDialogProps>(), {
  size: 'md',
  subtitle: undefined,
  submitting: false,
  loading: false,
  failed: false,
  confirmDisabled: false,
  dirty: false,
  canEdit: false,
  width: undefined,
  destroyOnClose: false,
});

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  retry: [];
  edit: [];
  confirm: [];
  cancel: [];
}>();

const modeTitle: { [key in CrudMode]: string } = {
  add: '新增',
  edit: '编辑',
  view: '查看',
};
const title = computed(() => `${modeTitle[props.mode]}${props.entityName}`);
const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});
</script>
