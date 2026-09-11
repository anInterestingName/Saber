<template>
  <button
    type="button"
    class="saber-sidebar-toggle"
    :class="`saber-sidebar-toggle--${variant}`"
    :aria-label="label"
    :aria-expanded="isExpanded"
    @click="toggle"
    @keydown.enter.prevent="toggle"
    @keydown.space.prevent="toggle"
  >
    <el-icon><component :is="icon" /></el-icon>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { ArrowLeft, ArrowRight, Expand, Fold } from '@element-plus/icons-vue';
import { useCommonStore } from '@/store/common';

type ToggleVariant = 'edge' | 'header';

const props = defineProps<{
  variant: ToggleVariant;
}>();

const commonStore = useCommonStore();
const { isCollapse, isMobileMenuOpen } = storeToRefs(commonStore);

const isExpanded = computed(() => {
  return props.variant === 'edge' ? !isCollapse.value : isMobileMenuOpen.value;
});
const label = computed(() => `${isExpanded.value ? '收起' : '展开'}菜单`);
const icon = computed(() => {
  if (props.variant === 'header') {
    return isExpanded.value ? Fold : Expand;
  }
  return isExpanded.value ? ArrowLeft : ArrowRight;
});

const toggle = () => {
  if (props.variant === 'edge') {
    commonStore.toggleCollapse();
    return;
  }
  commonStore.toggleMobileMenu();
};
</script>
