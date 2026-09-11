<template>
  <section class="form-section" :class="{ 'form-section--divided': divided }">
    <header v-if="title || description || $slots.title" class="form-section__header">
      <slot name="title">
        <h3 v-if="title" class="form-section__title">{{ title }}</h3>
      </slot>
      <p v-if="description" class="form-section__description">{{ description }}</p>
    </header>
    <div class="form-section__content" :class="`form-section__content--${columns}`">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
interface FormSectionProps {
  title?: string;
  description?: string;
  columns?: 1 | 2 | 3;
  divided?: boolean;
}

withDefaults(defineProps<FormSectionProps>(), {
  title: undefined,
  description: undefined,
  columns: 2,
  divided: true,
});
</script>

<style scoped lang="scss">
.form-section {
  min-width: 0;
  container-type: inline-size;
}

.form-section + .form-section,
.form-section--divided {
  margin-top: var(--saber-space-6);
  padding-top: var(--saber-space-6);
  border-top: 1px solid var(--saber-border);
}

.form-section:first-child.form-section--divided {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.form-section__header {
  margin-bottom: var(--saber-space-4);
}

.form-section__title {
  margin: 0;
  color: var(--saber-text-primary);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0;
}

.form-section__description {
  margin: var(--saber-space-1) 0 0;
  color: var(--saber-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.form-section__content {
  display: grid;
  min-width: 0;
  column-gap: var(--saber-space-6);
  grid-template-columns: minmax(0, 1fr);

  :deep(.el-form-item) {
    min-width: 0;
  }
}

.form-section__content--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-section__content--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@container (max-width: 720px) {
  .form-section__content--2,
  .form-section__content--3 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
