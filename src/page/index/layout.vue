<template>
  <router-view #="{ Component }">
    <keep-alive :include="keepAliveNames">
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useTagsStore } from '@/store/tags';

const { keepAliveNames } = storeToRefs(useTagsStore());
</script>
