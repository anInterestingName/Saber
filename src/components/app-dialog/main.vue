<template>
  <el-dialog
    v-model="visible"
    class="app-dialog"
    append-to-body
    align-center
    :width="dialogWidth"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal && !submitting"
    :close-on-press-escape="closeOnPressEscape && !submitting"
    :show-close="showClose && !submitting"
    :before-close="handleBeforeClose"
    @closed="emit('close')"
  >
    <template #header="{ titleId, titleClass }">
      <div class="app-dialog__header">
        <div class="app-dialog__title-row">
          <span :id="titleId" :class="[titleClass, 'app-dialog__title']">{{ title }}</span>
          <div v-if="$slots['header-status']" class="app-dialog__status">
            <slot name="header-status" />
          </div>
        </div>
        <div v-if="subtitle" class="app-dialog__subtitle">{{ subtitle }}</div>
      </div>
    </template>

    <div v-loading="loading" class="app-dialog__body">
      <slot v-if="!failed" />
      <slot v-else name="failed" :retry="handleRetry">
        <el-result status="error" title="内容加载失败" sub-title="旧内容已清空，请重新加载后继续">
          <template #extra>
            <el-button type="primary" :disabled="loading" @click="handleRetry">重新加载</el-button>
          </template>
        </el-result>
      </slot>
    </div>

    <template v-if="$slots.footer || $slots['footer-extra']" #footer>
      <div class="app-dialog__footer">
        <div class="app-dialog__footer-extra"><slot name="footer-extra" /></div>
        <div class="app-dialog__buttons"><slot name="footer" :cancel="handleCancel" /></div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useOverlayCloseGuard } from '@/composables/useOverlayCloseGuard';

type DialogSize = 'sm' | 'md' | 'lg';

interface AppDialogProps {
  modelValue: boolean;
  title: string;
  subtitle?: string;
  size?: DialogSize;
  width?: string | number;
  loading?: boolean;
  failed?: boolean;
  submitting?: boolean;
  dirty?: boolean;
  destroyOnClose?: boolean;
  showClose?: boolean;
  closeOnClickModal?: boolean;
  closeOnPressEscape?: boolean;
}

const props = withDefaults(defineProps<AppDialogProps>(), {
  subtitle: undefined,
  size: 'md',
  width: undefined,
  loading: false,
  failed: false,
  submitting: false,
  dirty: false,
  destroyOnClose: false,
  showClose: true,
  closeOnClickModal: true,
  closeOnPressEscape: true,
});

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  retry: [];
  cancel: [];
  close: [];
}>();

const { canClose } = useOverlayCloseGuard({
  submitting: () => props.submitting,
  dirty: () => props.dirty,
});
const dialogWidth = computed(() => props.width ?? `var(--saber-dialog-size-${props.size})`);
const visible = computed({
  get: () => props.modelValue,
  set: value => {
    if (!value && props.submitting) return;
    emit('update:modelValue', value);
  },
});

const handleCancel = async () => {
  if (!(await canClose())) return;
  emit('cancel');
  visible.value = false;
};

const handleBeforeClose = async (done: () => void) => {
  if (!(await canClose())) return;
  emit('cancel');
  done();
};

const handleRetry = () => {
  if (!props.loading) emit('retry');
};
</script>

<style lang="scss">
.app-dialog {
  display: flex;
  max-height: calc(100vh - 32px);
  max-width: calc(100vw - 32px);
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--saber-radius-overlay, var(--el-border-radius-base));
  background: var(--saber-surface-overlay);
  box-shadow: var(--saber-shadow-overlay);
}

.app-dialog .el-dialog__header {
  display: flex;
  min-height: var(--saber-overlay-header-height);
  flex: 0 0 auto;
  align-items: center;
  padding: var(--saber-space-3) var(--saber-overlay-body-padding);
  border-bottom: 1px solid var(--saber-border);
  margin-right: 0;
}

.app-dialog__header {
  min-width: 0;
  padding-right: var(--saber-space-7);
}

.app-dialog__title-row,
.app-dialog__status,
.app-dialog__footer,
.app-dialog__footer-extra,
.app-dialog__buttons {
  display: flex;
  min-width: 0;
  align-items: center;
}

.app-dialog__title-row {
  flex-wrap: wrap;
  gap: var(--saber-space-2);
}

.app-dialog__title {
  color: var(--saber-text-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0;
}

.app-dialog__subtitle {
  margin-top: var(--saber-space-1);
  color: var(--saber-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.app-dialog .el-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: var(--saber-overlay-body-padding);
  overflow: auto;
}

.app-dialog__body {
  min-height: 96px;
}

.app-dialog .el-dialog__footer {
  min-height: var(--saber-overlay-footer-height);
  flex: 0 0 auto;
  padding: var(--saber-space-3) var(--saber-overlay-body-padding);
  border-top: 1px solid var(--saber-border);
}

.app-dialog__footer {
  min-height: var(--saber-control-height);
  justify-content: space-between;
  gap: var(--saber-space-4);
}

.app-dialog__footer-extra,
.app-dialog__buttons {
  gap: var(--saber-space-2);
}

.app-dialog__footer-extra .el-button + .el-button,
.app-dialog__buttons .el-button + .el-button {
  margin-left: 0;
}

@media (max-width: 767px) {
  .app-dialog {
    max-width: calc(100vw - 24px);
  }

  .app-dialog .el-dialog__header,
  .app-dialog .el-dialog__body,
  .app-dialog .el-dialog__footer {
    padding-right: var(--saber-space-4);
    padding-left: var(--saber-space-4);
  }
}
</style>
