<template>
  <basic-container class="search-panel">
    <el-form
      class="search-panel__form"
      :model="model"
      :label-width="labelWidth"
      @submit.prevent="emit('search')"
    >
      <div ref="contentRef" class="search-panel__content">
        <el-row :gutter="gutter">
          <slot :expanded="expanded" />
          <el-col
            v-bind="actionCol"
            class="search-panel__actions"
            data-search-panel-actions
          >
            <slot name="extra-actions" :expanded="expanded" />
            <el-button :icon="RefreshLeft" :disabled="loading" @click="emit('reset')">
              重置
            </el-button>
            <el-button type="primary" :icon="Search" :loading="loading" native-type="submit">
              查询
            </el-button>
            <el-button
              v-if="canExpand"
              class="search-panel__toggle"
              type="primary"
              text
              :aria-expanded="expanded"
              @click="toggleExpanded"
            >
              {{ expanded ? '收起' : '展开' }}
              <el-icon>
                <ArrowUp v-if="expanded" />
                <ArrowDown v-else />
              </el-icon>
            </el-button>
          </el-col>
        </el-row>
      </div>
    </el-form>
  </basic-container>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ArrowDown, ArrowUp, RefreshLeft, Search } from '@element-plus/icons-vue';

interface SearchPanelProps {
  model: object;
  labelWidth?: string | number;
  gutter?: number;
  defaultExpanded?: boolean;
  loading?: boolean;
  actionCol?: ResponsiveCol;
}

interface ResponsiveCol {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

const props = withDefaults(defineProps<SearchPanelProps>(), {
  labelWidth: 80,
  gutter: 24,
  defaultExpanded: false,
  loading: false,
  actionCol: () => ({ xs: 24, sm: 12, md: 6 }),
});

const emit = defineEmits<{
  search: [];
  reset: [];
  expandChange: [expanded: boolean];
}>();

const contentRef = ref<HTMLElement>();
const expanded = ref(props.defaultExpanded);
const canExpand = ref(false);
const collapsedFieldCount = ref(0);
let resizeObserver: ResizeObserver | undefined;
let mutationObserver: MutationObserver | undefined;
let animationFrameId: number | undefined;

const getLayoutElements = () => {
  const row = contentRef.value?.querySelector<HTMLElement>(':scope > .el-row');
  const actions = row?.querySelector<HTMLElement>(':scope > [data-search-panel-actions]');
  const fields = row
    ? Array.from(row.children).filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && !element.hasAttribute('data-search-panel-actions'),
      )
    : [];

  return { row, actions, fields };
};

const applyFieldVisibility = () => {
  const { fields } = getLayoutElements();

  fields.forEach((field, index) => {
    const collapsed = canExpand.value && !expanded.value && index >= collapsedFieldCount.value;
    field.toggleAttribute('data-search-panel-collapsed', collapsed);
  });
};

const measureCapacity = () => {
  const { row, actions, fields } = getLayoutElements();
  if (!row || !actions || fields.length === 0) {
    canExpand.value = false;
    collapsedFieldCount.value = fields.length;
    return;
  }

  fields.forEach(field => field.removeAttribute('data-search-panel-collapsed'));

  const rowWidth = row.getBoundingClientRect().width;
  const actionsWidth = actions.getBoundingClientRect().width;
  const availableWidth = actionsWidth >= rowWidth - 1 ? rowWidth : rowWidth - actionsWidth;
  let usedWidth = 0;
  let visibleCount = 0;

  for (const field of fields) {
    const fieldWidth = field.getBoundingClientRect().width;
    if (visibleCount > 0 && usedWidth + fieldWidth > availableWidth + 1) break;

    usedWidth += fieldWidth;
    visibleCount += 1;
  }

  collapsedFieldCount.value = Math.max(visibleCount, 1);
  canExpand.value = collapsedFieldCount.value < fields.length;

  if (!canExpand.value) expanded.value = false;
  applyFieldVisibility();
};

const scheduleMeasure = () => {
  if (animationFrameId !== undefined) cancelAnimationFrame(animationFrameId);

  animationFrameId = requestAnimationFrame(() => {
    animationFrameId = undefined;
    measureCapacity();
  });
};

const toggleExpanded = () => {
  expanded.value = !expanded.value;
  applyFieldVisibility();
  emit('expandChange', expanded.value);
};

onMounted(() => {
  void nextTick(() => {
    scheduleMeasure();

    if (contentRef.value) {
      resizeObserver = new ResizeObserver(scheduleMeasure);
      resizeObserver.observe(contentRef.value);
    }

    const { row } = getLayoutElements();
    if (row) {
      mutationObserver = new MutationObserver(scheduleMeasure);
      mutationObserver.observe(row, { childList: true });
    }

    window.addEventListener('resize', scheduleMeasure);
  });
});

watch(
  () => [props.gutter, props.actionCol],
  () => void nextTick(scheduleMeasure),
  { deep: true },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  mutationObserver?.disconnect();
  window.removeEventListener('resize', scheduleMeasure);
  if (animationFrameId !== undefined) cancelAnimationFrame(animationFrameId);
});
</script>

<style scoped lang="scss">
.search-panel {
  :deep(.basic-container__card) {
    border: 0;
    border-radius: 6px;
    box-shadow: none;
    background: var(--saber-surface);
  }

  :deep(.el-card__body) {
    padding: 20px 24px;
  }
}

.search-panel__form {
  :deep(.el-row) {
    row-gap: 20px;
  }

  :deep(.el-form-item) {
    margin-bottom: 0;
  }

  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper) {
    box-shadow: 0 0 0 1px var(--saber-border) inset;
  }

  :deep([data-search-panel-collapsed]) {
    display: none !important;
  }
}

.search-panel__actions {
  display: flex;
  margin-left: auto;
  justify-content: flex-end;
  align-items: center;
  white-space: nowrap;
  gap: 8px;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.search-panel__toggle {
  padding-right: 0;

  .el-icon {
    margin-left: 4px;
  }
}

@media (max-width: 767px) {
  .search-panel {
    :deep(.el-card__body) {
      padding: 16px;
    }
  }

  .search-panel__actions {
    justify-content: flex-start;
    gap: 6px;
  }
}
</style>
