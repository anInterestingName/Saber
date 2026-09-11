<template>
  <el-dialog
    v-model="visible"
    class="form-dialog"
    append-to-body
    align-center
    :width="dialogWidth"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    :before-close="handleBeforeClose"
  >
    <template #header="{ titleId, titleClass }">
      <div class="form-dialog__header">
        <div class="form-dialog__title-row">
          <span :id="titleId" :class="[titleClass, 'form-dialog__title']">{{ title }}</span>
          <div v-if="$slots.status" class="form-dialog__status"><slot name="status" /></div>
        </div>
        <div v-if="subtitle" class="form-dialog__subtitle">{{ subtitle }}</div>
      </div>
    </template>

    <div v-loading="loading" class="form-dialog__body">
      <slot v-if="!failed" />
      <slot v-else name="failed" :retry="handleRetry">
        <el-result status="error" title="内容加载失败" sub-title="旧内容已清空，请重新加载后继续">
          <template #extra>
            <el-button type="primary" :disabled="loading" @click="handleRetry">
              重新加载
            </el-button>
          </template>
        </el-result>
      </slot>
    </div>

    <template #footer>
      <div class="form-dialog__footer">
        <div class="form-dialog__footer-extra"><slot name="footer-extra" /></div>
        <div class="form-dialog__buttons">
          <el-button :disabled="submitting" @click="handleCancel">
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
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
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

const confirmingClose = ref(false);
const modeTitle: { [key in CrudMode]: string } = {
  add: '新增',
  edit: '编辑',
  view: '查看',
};
const title = computed(() => `${modeTitle[props.mode]}${props.entityName}`);
const dialogWidth = computed(() => props.width ?? `var(--saber-dialog-size-${props.size})`);
const visible = computed({
  get: () => props.modelValue,
  set: value => {
    if (!value && props.submitting) return;
    emit('update:modelValue', value);
  },
});

const confirmClose = async () => {
  if (props.submitting || confirmingClose.value) return false;
  if (!props.dirty) return true;

  confirmingClose.value = true;
  try {
    await ElMessageBox.confirm('当前修改尚未保存，确定放弃吗？', '放弃未保存修改', {
      type: 'warning',
      confirmButtonText: '放弃修改',
      cancelButtonText: '继续编辑',
    });
    return true;
  } catch {
    return false;
  } finally {
    confirmingClose.value = false;
  }
};

const handleCancel = async () => {
  if (!(await confirmClose())) return;
  emit('cancel');
  visible.value = false;
};

const handleBeforeClose = async (done: () => void) => {
  if (!(await confirmClose())) return;
  emit('cancel');
  done();
};

const handleRetry = () => {
  if (!props.loading) emit('retry');
};
</script>

<style lang="scss">
.form-dialog {
  display: flex;
  max-height: calc(100vh - 32px);
  max-width: calc(100vw - 32px);
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--el-border-radius-base);
  background: var(--saber-surface-overlay);
  box-shadow: var(--saber-shadow-overlay);
}

.form-dialog .el-dialog__header {
  display: flex;
  min-height: var(--saber-overlay-header-height);
  flex: 0 0 auto;
  align-items: center;
  padding: 12px var(--saber-overlay-body-padding);
  border-bottom: 1px solid var(--saber-border);
  margin-right: 0;
}

.form-dialog__header {
  min-width: 0;
  padding-right: 32px;
}

.form-dialog__title-row,
.form-dialog__status {
  display: flex;
  min-width: 0;
  align-items: center;
}

.form-dialog__title-row {
  flex-wrap: wrap;
  gap: var(--saber-space-2);
}

.form-dialog__title {
  color: var(--saber-text-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0;
}

.form-dialog__subtitle {
  margin-top: 2px;
  color: var(--saber-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.form-dialog .el-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: var(--saber-overlay-body-padding);
  overflow: auto;
}

.form-dialog .el-dialog__footer {
  min-height: var(--saber-overlay-footer-height);
  flex: 0 0 auto;
  padding: 14px var(--saber-overlay-body-padding);
  border-top: 1px solid var(--saber-border);
}

.form-dialog__body {
  min-height: 96px;
}

.form-dialog__footer {
  display: flex;
  min-height: var(--saber-control-height);
  align-items: center;
  justify-content: space-between;
  gap: var(--saber-space-4);
}

.form-dialog__footer-extra,
.form-dialog__buttons {
  display: flex;
  align-items: center;
  gap: var(--saber-space-2);

  .el-button + .el-button {
    margin-left: 0;
  }
}

@media (max-width: 767px) {
  .form-dialog .el-dialog__header,
  .form-dialog .el-dialog__body,
  .form-dialog .el-dialog__footer {
    padding-right: var(--saber-space-4);
    padding-left: var(--saber-space-4);
  }
}
</style>
