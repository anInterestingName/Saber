<template>
  <div class="saber-logo" :class="{ 'saber-logo--compact': isCompact }">
    <div class="saber-logo_brand" :aria-label="website.indexTitle">
      <img class="saber-logo_mark" src="/img/staratlas-mark.svg" alt="" />
      <span class="saber-logo_title">{{ website.indexTitle }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import website from '@/config/website';
import { useCommonStore } from '@/store/common';

const props = withDefaults(
  defineProps<{
    forceExpanded?: boolean;
  }>(),
  {
    forceExpanded: false,
  }
);

const { isCollapse, isHorizontal, isMobile } = storeToRefs(useCommonStore());
const isCompact = computed(() => {
  return !props.forceExpanded && !isHorizontal.value && !isMobile.value && isCollapse.value;
});
</script>
