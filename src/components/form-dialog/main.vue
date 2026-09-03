<template>
  <el-dialog
    v-model="visible"
    class="form-dialog"
    append-to-body
    align-center
    :width="width"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    :before-close="handleBeforeClose"
    :title="title"
  >
    <div v-loading="loading" class="form-dialog__body">
      <slot />
    </div>
    <template #footer>
      <div class="form-dialog__footer">
        <div class="form-dialog__footer-extra">
          <slot name="footer-extra" />
        </div>
        <div class="form-dialog__buttons">
          <el-button :disabled="submitting" @click="handleCancel">
            {{ mode === 'view' ? '关闭' : '取消' }}
          </el-button>
          <el-button
            v-if="mode !== 'view'"
            type="primary"
            :loading="submitting"
            :disabled="submitting || confirmDisabled"
            @click="emit('confirm')"
          >
            确定
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CrudMode } from '@/types/crud';

interface FormDialogProps {
  modelValue: boolean;
  mode: CrudMode;
  entityName: string;
  submitting?: boolean;
  loading?: boolean;
  confirmDisabled?: boolean;
  width?: string | number;
  destroyOnClose?: boolean;
}

const props = withDefaults(defineProps<FormDialogProps>(), {
  submitting: false,
  loading: false,
  confirmDisabled: false,
  width: 640,
  destroyOnClose: false,
});

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
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
  set: value => {
    if (!value && props.submitting) return;
    emit('update:modelValue', value);
  },
});

const handleCancel = () => {
  if (props.submitting) return;
  emit('cancel');
  visible.value = false;
};

const handleBeforeClose = (done: () => void) => {
  if (props.submitting) return;
  emit('cancel');
  done();
};
</script>

<style lang="scss">
.form-dialog {
  display: flex;
  max-height: calc(100vh - 32px);
  flex-direction: column;
  max-width: calc(100vw - 32px);
  overflow: hidden;
  border-radius: 6px;
  background: var(--saber-surface-elevated);
}

.form-dialog .el-dialog__header {
  flex: 0 0 auto;
  padding: 18px 24px;
  border-bottom: 1px solid var(--saber-border);
  margin-right: 0;
}

.form-dialog .el-dialog__title {
  color: var(--saber-text-primary);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
}

.form-dialog .el-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 24px;
  overflow: auto;
}

.form-dialog .el-dialog__footer {
  flex: 0 0 auto;
  padding: 14px 24px;
  border-top: 1px solid var(--saber-border);
}

.form-dialog__body {
  min-height: 96px;
}

.form-dialog__footer {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.form-dialog__footer-extra,
.form-dialog__buttons {
  display: flex;
  align-items: center;
  gap: 8px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

@media (max-width: 767px) {
  .form-dialog .el-dialog__header,
  .form-dialog .el-dialog__body,
  .form-dialog .el-dialog__footer {
    padding-right: 16px;
    padding-left: 16px;
  }
}
</style>
