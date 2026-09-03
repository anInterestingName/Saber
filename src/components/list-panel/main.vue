<template>
  <basic-container class="list-panel" :class="{ 'list-panel--compact': compact }">
    <div v-if="title || $slots.actions || $slots.tools" class="list-panel__header">
      <h2 v-if="title" class="list-panel__title">{{ title }}</h2>
      <div class="list-panel__toolbar">
        <div v-if="$slots.actions" class="list-panel__actions">
          <slot name="actions" />
        </div>
        <div v-if="$slots.tools" class="list-panel__tools">
          <slot name="tools" />
        </div>
      </div>
    </div>
    <div class="list-panel__content">
      <slot />
    </div>
    <div v-if="$slots.footer" class="list-panel__footer">
      <slot name="footer" />
    </div>
  </basic-container>
</template>

<script setup lang="ts">
import BasicContainer from '@/components/basic-container/main.vue';

interface ListPanelProps {
  title: string;
  compact?: boolean;
}

withDefaults(defineProps<ListPanelProps>(), {
  compact: false,
});
</script>

<style scoped lang="scss">
.list-panel {
  :deep(.basic-container__card) {
    border: 0;
    border-radius: 6px;
    box-shadow: none;
    background: var(--saber-surface);
  }

  :deep(.el-card__body) {
    padding: 18px 24px 16px;
  }

  &--compact :deep(.el-card__body) {
    padding: 16px;
  }
}

.list-panel__header {
  display: flex;
  min-width: 0;
  min-height: 32px;
  margin-bottom: 16px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.list-panel__title {
  flex: 0 0 auto;
  margin: 0;
  color: var(--saber-text-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 32px;
  letter-spacing: 0;
}

.list-panel__toolbar,
.list-panel__actions,
.list-panel__tools {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.list-panel__content {
  min-width: 0;
  overflow: hidden;

  :deep(.el-table) {
    --el-table-border-color: var(--saber-border);
    --el-table-header-bg-color: var(--saber-surface-muted);
    --el-table-row-hover-bg-color: var(--saber-surface-muted);
    --el-table-tr-bg-color: var(--saber-surface);
    color: var(--saber-text-secondary);
  }

  :deep(.el-table::before),
  :deep(.el-table__inner-wrapper::before) {
    display: none;
  }

  :deep(.el-table th.el-table__cell) {
    padding: 12px 0;
    color: var(--saber-text-primary);
    font-weight: 600;
  }

  :deep(.el-table td.el-table__cell) {
    padding: 8px 0;
  }

  :deep(.el-table-fixed-column--left),
  :deep(.el-table-fixed-column--right) {
    background: var(--saber-surface);
  }

  :deep(.el-table__body tr:hover > .el-table-fixed-column--left),
  :deep(.el-table__body tr:hover > .el-table-fixed-column--right) {
    background: var(--saber-surface-muted);
  }

  :deep(.el-table__empty-block) {
    min-height: 160px;
  }
}

.list-panel__footer {
  min-height: 32px;
  margin-top: 18px;
}

@media (max-width: 767px) {
  .list-panel {
    :deep(.el-card__body) {
      padding: 16px;
    }
  }

  .list-panel__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .list-panel__toolbar,
  .list-panel__actions {
    width: 100%;
    justify-content: flex-start;
    gap: 6px;
  }

  .list-panel__footer {
    margin-top: 16px;
  }
}
</style>
