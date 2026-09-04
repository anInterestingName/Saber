<template>
  <el-drawer
    v-model="visible"
    class="detail-drawer"
    append-to-body
    direction="rtl"
    :title="title"
    :size="size"
    :destroy-on-close="destroyOnClose"
    @close="emit('close')"
  >
    <div v-loading="loading" class="detail-drawer__body">
      <slot />
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface DetailDrawerProps {
  modelValue: boolean;
  title: string;
  loading?: boolean;
  size?: string | number;
  destroyOnClose?: boolean;
}

const props = withDefaults(defineProps<DetailDrawerProps>(), {
  loading: false,
  size: '640px',
  destroyOnClose: true,
});

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  close: [];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});
</script>

<style scoped lang="scss">
:global(.detail-drawer.el-drawer) {
  max-width: 100vw;
  background: var(--saber-surface-elevated);
}

:global(.detail-drawer .el-drawer__header) {
  min-height: 60px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--saber-border);
  margin-bottom: 0;
  color: var(--saber-text-primary);
}

:global(.detail-drawer .el-drawer__title) {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
}

:global(.detail-drawer .el-drawer__body) {
  min-height: 0;
  padding: 0;
  overflow: auto;
}

.detail-drawer__body {
  min-height: 160px;
  padding: 24px;
}

@media (max-width: 767px) {
  :global(.detail-drawer.el-drawer) {
    width: 100% !important;
  }

  :global(.detail-drawer .el-drawer__header),
  .detail-drawer__body {
    padding-right: 16px;
    padding-left: 16px;
  }
}
</style>
