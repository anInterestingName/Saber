<template>
  <el-drawer
    v-model="visible"
    class="detail-drawer"
    append-to-body
    :direction="direction"
    :size="drawerSize"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    :before-close="handleBeforeClose"
    @close="emit('close')"
  >
    <template #header="{ titleId, titleClass }">
      <div class="detail-drawer__header">
        <div class="detail-drawer__title-row">
          <span :id="titleId" :class="[titleClass, 'detail-drawer__title']">{{ title }}</span>
          <div v-if="$slots.status" class="detail-drawer__status"><slot name="status" /></div>
        </div>
        <div v-if="subtitle" class="detail-drawer__subtitle">{{ subtitle }}</div>
      </div>
    </template>

    <div v-loading="loading" class="detail-drawer__body">
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

    <template v-if="$slots.footer" #footer>
      <div class="detail-drawer__footer">
        <slot name="footer" :close="handleCancel" />
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessageBox } from 'element-plus';

type DrawerDirection = 'rtl' | 'ltr' | 'ttb' | 'btt';
type DrawerSize = 'md' | 'lg' | 'xl';

interface DetailDrawerProps {
  modelValue: boolean;
  title: string;
  subtitle?: string;
  loading?: boolean;
  failed?: boolean;
  submitting?: boolean;
  dirty?: boolean;
  size?: DrawerSize | string | number;
  direction?: DrawerDirection;
  destroyOnClose?: boolean;
}

const props = withDefaults(defineProps<DetailDrawerProps>(), {
  subtitle: undefined,
  loading: false,
  failed: false,
  submitting: false,
  dirty: false,
  size: 'md',
  direction: 'rtl',
  destroyOnClose: true,
});

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  retry: [];
  cancel: [];
  close: [];
}>();

const confirmingClose = ref(false);
const semanticSizes: DrawerSize[] = ['md', 'lg', 'xl'];
const drawerSize = computed(() =>
  typeof props.size === 'string' && semanticSizes.includes(props.size as DrawerSize)
    ? `var(--saber-drawer-size-${props.size})`
    : props.size
);
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

<style scoped lang="scss">
:global(.detail-drawer.el-drawer) {
  max-width: 100vw;
  background: var(--saber-surface-overlay);
  box-shadow: var(--saber-shadow-drawer);
}

:global(.detail-drawer .el-drawer__header) {
  display: flex;
  min-height: var(--saber-overlay-header-height);
  flex: 0 0 auto;
  align-items: center;
  padding: 12px var(--saber-overlay-body-padding);
  border-bottom: 1px solid var(--saber-border);
  margin-bottom: 0;
  color: var(--saber-text-primary);
}

.detail-drawer__header {
  min-width: 0;
  padding-right: 32px;
}

.detail-drawer__title-row,
.detail-drawer__status {
  display: flex;
  min-width: 0;
  align-items: center;
}

.detail-drawer__title-row {
  flex-wrap: wrap;
  gap: var(--saber-space-2);
}

.detail-drawer__title {
  color: var(--saber-text-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0;
}

.detail-drawer__subtitle {
  margin-top: 2px;
  color: var(--saber-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

:global(.detail-drawer .el-drawer__body) {
  min-height: 0;
  padding: 0;
  overflow: auto;
}

.detail-drawer__body {
  min-height: 160px;
  padding: var(--saber-overlay-body-padding);
}

:global(.detail-drawer .el-drawer__footer) {
  min-height: var(--saber-overlay-footer-height);
  flex: 0 0 auto;
  padding: 14px var(--saber-overlay-body-padding);
  border-top: 1px solid var(--saber-border);
}

.detail-drawer__footer {
  display: flex;
  min-height: var(--saber-control-height);
  align-items: center;
  justify-content: flex-end;
  gap: var(--saber-space-2);

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

@media (max-width: 767px) {
  :global(.detail-drawer.el-drawer) {
    width: 100% !important;
  }

  :global(.detail-drawer .el-drawer__header),
  :global(.detail-drawer .el-drawer__footer),
  .detail-drawer__body {
    padding-right: var(--saber-space-4);
    padding-left: var(--saber-space-4);
  }
}
</style>
