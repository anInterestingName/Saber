<template>
  <section class="detail-section" :class="{ 'detail-section--divided': divided }">
    <header v-if="title || description || $slots.title" class="detail-section__header">
      <slot name="title">
        <h3 v-if="title" class="detail-section__title">{{ title }}</h3>
      </slot>
      <p v-if="description" class="detail-section__description">{{ description }}</p>
    </header>
    <dl class="detail-section__grid" :class="`detail-section__grid--${columns}`">
      <slot />
    </dl>
  </section>
</template>

<script setup lang="ts">
interface DetailSectionProps {
  title?: string;
  description?: string;
  columns?: 1 | 2 | 3;
  divided?: boolean;
}

withDefaults(defineProps<DetailSectionProps>(), {
  title: undefined,
  description: undefined,
  columns: 2,
  divided: true,
});
</script>

<style scoped lang="scss">
.detail-section {
  min-width: 0;
  container-type: inline-size;
}

.detail-section + .detail-section,
.detail-section--divided {
  margin-top: var(--saber-space-6);
  padding-top: var(--saber-space-6);
  border-top: 1px solid var(--saber-border);
}

.detail-section:first-child.detail-section--divided {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.detail-section__header {
  margin-bottom: var(--saber-space-4);
}

.detail-section__title {
  margin: 0;
  color: var(--saber-text-primary);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0;
}

.detail-section__description {
  margin: var(--saber-space-1) 0 0;
  color: var(--saber-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.detail-section__grid {
  display: grid;
  padding: 0;
  margin: 0;
  column-gap: var(--saber-space-6);
  grid-template-columns: minmax(0, 1fr);
}

.detail-section__grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.detail-section__grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@container (max-width: 760px) {
  .detail-section__grid--3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container (max-width: 520px) {
  .detail-section__grid--2,
  .detail-section__grid--3 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
