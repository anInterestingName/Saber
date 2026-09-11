<template>
  <section class="page-container">
    <header v-if="hasHeader" class="page-container__header">
      <div v-if="showBreadcrumb && hasBreadcrumb" class="page-container__breadcrumb">
        <slot name="breadcrumb">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.key">
              {{ item.label }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </slot>
      </div>

      <div class="page-container__heading">
        <div class="page-container__summary">
          <div
            v-if="resolvedTitle || $slots.title || $slots.status"
            class="page-container__title-row"
          >
            <slot name="title">
              <h1 v-if="resolvedTitle" class="page-container__title">{{ resolvedTitle }}</h1>
            </slot>
            <div v-if="$slots.status" class="page-container__status">
              <slot name="status" />
            </div>
          </div>
          <p v-if="description" class="page-container__description">{{ description }}</p>
        </div>
        <div v-if="$slots.actions" class="page-container__actions">
          <slot name="actions" />
        </div>
      </div>

      <div v-if="$slots.tabs" class="page-container__tabs">
        <slot name="tabs" />
      </div>
    </header>

    <div
      class="page-container__content"
      :class="{ 'page-container__content--padded': contentPadding }"
    >
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import type { RouteRecordNameGeneric } from 'vue-router';

interface PageContainerProps {
  title?: string;
  description?: string;
  showBreadcrumb?: boolean;
  contentPadding?: boolean;
}

interface BreadcrumbItem {
  key: string;
  label: string;
}

const props = withDefaults(defineProps<PageContainerProps>(), {
  title: undefined,
  description: undefined,
  showBreadcrumb: true,
  contentPadding: false,
});

const route = useRoute();
const slots = useSlots();
const { t, te } = useI18n();

const getI18nKey = (meta: object) => {
  if (!('i18n' in meta) || typeof meta.i18n !== 'string') return undefined;
  return meta.i18n;
};

const resolveRouteLabel = (name: RouteRecordNameGeneric | null | undefined, i18nKey?: string) => {
  if (i18nKey && te(`route.${i18nKey}`)) return t(`route.${i18nKey}`);
  return String(name ?? '').split(',')[0];
};

const resolvedTitle = computed(() => {
  if (props.title) return props.title;
  const queryTitle = Array.isArray(route.query.name) ? route.query.name[0] : route.query.name;
  return queryTitle || resolveRouteLabel(route.name, getI18nKey(route.meta));
});

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const items = route.matched
    .map((record, index) => ({
      key: `${record.path}-${index}`,
      label: resolveRouteLabel(record.name, getI18nKey(record.meta)),
    }))
    .filter(item => item.label);

  return items.filter((item, index) => item.label !== items[index - 1]?.label);
});

const hasBreadcrumb = computed(() => Boolean(slots.breadcrumb) || breadcrumbs.value.length > 1);
const hasHeader = computed(
  () =>
    (props.showBreadcrumb && hasBreadcrumb.value) ||
    Boolean(
      resolvedTitle.value ||
        props.description ||
        slots.title ||
        slots.status ||
        slots.actions ||
        slots.tabs
    )
);
</script>

<style scoped lang="scss">
.page-container {
  min-width: 0;
}

.page-container__header {
  padding: var(--saber-space-5) var(--saber-space-6) 0;
  border-bottom: 1px solid var(--saber-border);
  background: var(--saber-surface);
}

.page-container__breadcrumb {
  margin-bottom: var(--saber-space-3);
}

.page-container__heading,
.page-container__title-row,
.page-container__actions,
.page-container__status {
  display: flex;
  min-width: 0;
  align-items: center;
}

.page-container__heading {
  padding-bottom: var(--saber-space-5);
  justify-content: space-between;
  gap: var(--saber-space-6);
}

.page-container__summary {
  min-width: 0;
}

.page-container__title-row {
  flex-wrap: wrap;
  gap: var(--saber-space-2);
}

.page-container__title {
  margin: 0;
  color: var(--saber-text-primary);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0;
}

.page-container__description {
  max-width: 960px;
  margin: var(--saber-space-2) 0 0;
  color: var(--saber-text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.page-container__actions {
  flex: 0 0 auto;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--saber-space-2);

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.page-container__tabs {
  min-width: 0;

  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }
}

.page-container__content {
  min-width: 0;
}

.page-container__header + .page-container__content {
  padding-top: var(--saber-space-4);
}

.page-container__content--padded {
  padding: var(--saber-space-4);
}

@media (max-width: 767px) {
  .page-container__header {
    padding-right: var(--saber-space-4);
    padding-left: var(--saber-space-4);
  }

  .page-container__heading {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--saber-space-3);
  }

  .page-container__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
