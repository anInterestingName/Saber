<template>
  <div
    class="saber-shell"
    :class="{
      'saber-shell--collapsed': isCollapse && !isMobile && !isHorizontal,
      'saber-shell--mobile-open': isMobile && isMobileMenuOpen && validSidebar,
    }"
  >
    <div
      class="saber-layout"
      :class="{
        'saber-layout--horizontal': isHorizontal,
        'saber-layout--side': layoutMode === 'side',
        'saber-layout--mix': layoutMode === 'mix',
        'saber-layout--sidebar-hidden': !validSidebar,
      }"
    >
      <top v-if="isMixed" ref="top" :sidebar-visible="validSidebar" />
      <div class="saber-sidebar" v-show="validSidebar">
        <!-- 左侧导航栏 -->
        <logo v-if="!isMixed" />
        <sidebar />
        <!-- 顶部导航模式（桌面）：搜索与账户工具与 Logo、菜单同处一行 -->
        <top v-if="isHorizontal && !isMobile" :sidebar-visible="validSidebar" />
      </div>
      <div class="saber-main">
        <!-- 顶部导航栏：移动端，以及侧边模式的移动端 -->
        <top v-if="isMobile && !isMixed" :sidebar-visible="validSidebar" />
        <!-- 顶部标签卡 -->
        <tags />
        <search class="saber-view" v-show="isSearch"></search>
        <!-- 主体视图层 -->
        <div id="saber-view" v-show="!isSearch" v-if="isRefresh">
          <router-view #="{ Component }">
            <keep-alive :include="tagsKeep">
              <component :is="Component" />
            </keep-alive>
          </router-view>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import index from '@/mixins/index';
import { validateNull } from 'utils/validate';
import { mapActions, mapState } from 'pinia';
import { useCommonStore } from '@/store/common';
import { useTagsStore } from '@/store/tags';
import { useUserStore } from '@/store/user';
import tags from './tags.vue';
import search from './search.vue';
import logo from './logo.vue';
import top from './top/index.vue';
import sidebar from './sidebar/index.vue';
export default {
  mixins: [index],
  components: {
    top,
    logo,
    tags,
    search,
    sidebar,
  },
  name: 'index',
  provide() {
    return {
      index: this,
    };
  },
  computed: {
    ...mapState(useCommonStore, [
      'isHorizontal',
      'isMixed',
      'layoutMode',
      'isRefresh',
      'isLock',
      'isCollapse',
      'isMobile',
      'isMobileMenuOpen',
      'isSearch',
      'setting',
    ]),
    ...mapState(useUserStore, ['menu']),
    ...mapState(useTagsStore, {
      tagsKeep: store => store.keepAliveNames,
    }),
    validSidebar() {
      return !(
        (this.$route.meta || {}).menu === false || (this.$route.query || {}).menu === 'false'
      );
    },
  },
  props: [],
  watch: {
    validSidebar(visible) {
      if (!visible) this.closeMobileMenu();
    },
  },
  mounted() {
    this.handleViewportChange();
    window.addEventListener('resize', this.handleViewportChange);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleViewportChange);
  },
  methods: {
    ...mapActions(useCommonStore, ['closeMobileMenu', 'setViewportWidth']),
    ...mapActions(useUserStore, ['GetMenu']),
    handleViewportChange() {
      this.setViewportWidth(window.innerWidth);
    },
    //打开菜单
    openMenu(item = {}) {
      this.GetMenu(item.id).then(data => {
        if (data.length !== 0) {
          this.$router.$dynamicRouter.formatRoutes(data, true);
          if (!validateNull(item.path)) {
            this.$router.push({ path: item.path });
          }
        }
      });
    },
  },
};
</script>
