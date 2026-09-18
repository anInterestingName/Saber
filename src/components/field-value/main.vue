<template>
  <div
    class="field-value"
    :class="[
      `field-value--span-${span}`,
      { 'field-value--multiline': multiline, 'field-value--masked': masked },
    ]"
  >
    <dt class="field-value__label">{{ label }}</dt>
    <dd class="field-value__content">
      <el-tooltip
        v-if="truncate && hasValue && !$slots.default"
        :content="displayValue"
        placement="top"
      >
        <span class="field-value__text field-value__text--truncate">{{ displayValue }}</span>
      </el-tooltip>
      <span v-else-if="!$slots.default" class="field-value__text">{{ displayValue }}</span>
      <div v-else class="field-value__slot">
        <slot :value="value" :display-value="displayValue" />
      </div>
      <el-tooltip v-if="copyable && hasValue" content="复制" placement="top">
        <el-button
          class="field-value__copy"
          type="primary"
          link
          :icon="CopyDocument"
          :aria-label="`复制${label}`"
          @click="copyValue"
        />
      </el-tooltip>
    </dd>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CopyDocument } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

type FieldValuePrimitive = string | number | boolean | null | undefined;

interface FieldValueProps {
  label: string;
  value?: FieldValuePrimitive;
  emptyText?: string;
  copyable?: boolean;
  masked?: boolean;
  multiline?: boolean;
  truncate?: boolean;
  span?: 1 | 2 | 3 | 'full';
}

const props = withDefaults(defineProps<FieldValueProps>(), {
  value: undefined,
  emptyText: '-',
  copyable: false,
  masked: false,
  multiline: false,
  truncate: false,
  span: 1,
});

const hasValue = computed(
  () => props.value !== undefined && props.value !== null && props.value !== ''
);
const displayValue = computed(() => (hasValue.value ? String(props.value) : props.emptyText));

const writeClipboard = async (value: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('copy failed');
};

const copyValue = async () => {
  if (!hasValue.value) return;
  try {
    await writeClipboard(String(props.value));
    ElMessage.success('已复制');
  } catch {
    ElMessage.error('复制失败，请手动复制');
  }
};
</script>

<style scoped lang="scss">
.field-value {
  display: grid;
  min-width: 0;
  padding: var(--saber-space-3) 0;
  border-bottom: 1px solid var(--saber-border);
  gap: var(--saber-space-2);
  grid-template-columns: minmax(96px, 32%) minmax(0, 1fr);
}

.field-value--span-2 {
  grid-column: span 2;
}

.field-value--span-3,
.field-value--span-full {
  grid-column: 1 / -1;
}

.field-value__label,
.field-value__content {
  min-width: 0;
  margin: 0;
  line-height: 1.6;
}

.field-value__label {
  color: var(--saber-text-secondary);
  font-weight: 500;
}

.field-value__content {
  display: flex;
  align-items: flex-start;
  color: var(--saber-text-primary);
  gap: var(--saber-space-1);
}

.field-value__text,
.field-value__slot {
  min-width: 0;
  overflow-wrap: anywhere;
}

.field-value__text--truncate {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-value--multiline .field-value__text,
.field-value--multiline .field-value__slot {
  white-space: pre-wrap;
}

.field-value--masked .field-value__text {
  font-family: monospace;
  letter-spacing: 0;
}

.field-value__copy {
  flex: 0 0 auto;
  width: var(--saber-control-height);
  height: var(--saber-control-height);
  padding: 0;
}

@container (max-width: 520px) {
  .field-value--span-2,
  .field-value--span-3,
  .field-value--span-full {
    grid-column: auto;
  }
}

@media (max-width: 479px) {
  .field-value {
    gap: var(--saber-space-1);
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
