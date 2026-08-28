<template>
  <div class="avue-logo">
    <transition name="fade" mode="out-in">
      <div
        v-if="isCompact"
        key="compact"
        class="avue-logo_brand avue-logo_brand--compact"
        :aria-label="website.indexTitle"
      >
        <img class="avue-logo_mark" src="/img/staratlas-mark.svg" alt="" />
      </div>
      <div v-else key="expanded" class="avue-logo_brand" :aria-label="website.indexTitle">
        <img class="avue-logo_mark" src="/img/staratlas-mark.svg" alt="" />
        <span class="avue-logo_title">{{ website.indexTitle }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import website from '@/config/website';
import { getScreen } from '@/utils/util';

const store = useStore();
const isCompact = computed(() => getScreen(store.getters.isCollapse));
</script>
