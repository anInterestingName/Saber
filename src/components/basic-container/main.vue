<template>
  <div
    class="basic-container"
    :class="[
      `basic-container--${variant}`,
      `basic-container--padding-${padding}`,
      { 'basic-container--block': block },
    ]"
  >
    <el-card class="basic-container__card" shadow="never">
      <slot />
    </el-card>
  </div>
</template>

<script setup lang="ts">
type SurfaceVariant = 'plain' | 'subtle' | 'outlined';
type SurfacePadding = 'none' | 'sm' | 'md' | 'lg';

interface BasicContainerProps {
  variant?: SurfaceVariant;
  padding?: SurfacePadding;
  block?: boolean;
}

withDefaults(defineProps<BasicContainerProps>(), {
  variant: 'plain',
  padding: 'md',
  block: false,
});
</script>

<style lang="scss">
.basic-container {
  padding: 0 0 var(--saber-space-4);
  box-sizing: border-box;

  &--block {
    height: 100%;

    .basic-container__card {
      height: 100%;
    }
  }

  &__card {
    width: 100%;
    border: 0;
    border-radius: var(--saber-radius-surface, var(--el-border-radius-base));
    background: var(--saber-surface);
    box-shadow: none;
  }

  &--subtle &__card {
    background: var(--saber-surface-muted);
  }

  &--outlined &__card {
    border: 1px solid var(--saber-border);
  }

  &--padding-none .el-card__body {
    padding: 0;
  }

  &--padding-sm .el-card__body {
    padding: var(--saber-space-4);
  }

  &--padding-md .el-card__body {
    padding: var(--saber-space-6);
  }

  &--padding-lg .el-card__body {
    padding: var(--saber-space-7);
  }
}
</style>
