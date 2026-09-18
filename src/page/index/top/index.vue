<template>
  <div class="saber-top" :class="{ 'saber-top--mixed': isMixed }">
    <logo v-if="isMixed" force-expanded />
    <div class="top-bar__left">
      <sidebar-toggle
        v-if="setting.collapse && !isHorizontal && isMobile && sidebarVisible"
        variant="header"
      />
    </div>
    <div class="top-bar__title">
      <top-menu ref="topMenu" v-if="isMixed"></top-menu>
      <top-search v-if="setting.search" variant="header"></top-search>
    </div>
    <user-actions placement="header" />
  </div>
</template>
<script>
import { mapState } from 'pinia';
import topMenu from './top-menu.vue';
import topSearch from './top-search.vue';
import logo from '../logo.vue';
import userActions from '../user-actions.vue';
import sidebarToggle from '../sidebar/toggle.vue';
import { useCommonStore } from '@/store/common';
export default {
  components: {
    topMenu,
    topSearch,
    logo,
    userActions,
    sidebarToggle,
  },
  name: 'top',
  props: {
    sidebarVisible: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {};
  },
  filters: {},
  created() {},
  computed: {
    ...mapState(useCommonStore, ['setting', 'isHorizontal', 'isMixed', 'isMobile']),
  },
};
</script>

<style lang="scss" scoped></style>
