<template>
  <section class="list-panel" :class="{ 'list-panel--compact': compact }">
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
  </section>
</template>

<script setup lang="ts">
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
  min-width: 0;
  padding: var(--saber-space-5) var(--saber-space-6) var(--saber-space-4);
  background: var(--saber-surface);
}

.list-panel--compact {
  padding: var(--saber-space-4);
}

.list-panel__header {
  display: flex;
  min-width: 0;
  min-height: var(--saber-control-height);
  margin-bottom: var(--saber-space-4);
  align-items: center;
  justify-content: space-between;
  gap: var(--saber-space-4);
}

.list-panel__title {
  flex: 0 0 auto;
  margin: 0;
  color: var(--saber-text-primary);
  font-size: 18px;
  font-weight: 600;
  line-height: var(--saber-control-height);
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
  gap: var(--saber-space-2);

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.list-panel__content {
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-inline: contain;
  scrollbar-width: thin;

  :deep(.el-table) {
    min-width: 100%;
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
    padding: var(--saber-table-header-padding-y) 0;
    color: var(--saber-text-primary);
    font-weight: 600;
  }

  :deep(.el-table td.el-table__cell) {
    padding: var(--saber-table-cell-padding-y, var(--saber-space-2)) 0;
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
  min-height: var(--saber-control-height);
  margin-top: var(--saber-space-5);
}

@media (max-width: 767px) {
  .list-panel {
    padding: var(--saber-space-4);
  }

  .list-panel__header {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--saber-space-3);
  }

  .list-panel__toolbar,
  .list-panel__actions {
    width: 100%;
    justify-content: flex-start;
    gap: var(--saber-space-2);
  }

  .list-panel__footer {
    margin-top: var(--saber-space-4);
  }
}
</style>
