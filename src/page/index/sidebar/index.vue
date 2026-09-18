<template>
  <div class="saber-menu-shell">
    <!-- 顶部模式：菜单限定在固定区域内；区域装不下时用区域外的左右箭头移动 -->
    <button
      v-if="hasOverflow"
      type="button"
      class="saber-menu-arrow saber-menu-arrow--prev"
      :class="{ 'is-hidden': !canScrollPrev }"
      aria-label="向左移动菜单"
      @click="scrollMenu(-1)"
    >
      <el-icon><ArrowLeft /></el-icon>
    </button>

    <el-scrollbar ref="menuScrollbar" class="saber-menu">
      <div v-if="menu && menu.length == 0 && !isHorizontal" class="saber-sidebar--tip">
        {{ $t('menuTip') }}
      </div>
      <!-- key 跟随菜单形态：切换导航模式时重建实例，清掉 EP 内部残留的已展开子菜单状态 -->
      <el-menu
        :key="sidebarMode"
        unique-opened
        :default-active="activeMenu"
        :mode="sidebarMode"
        :ellipsis="false"
        menu-trigger="hover"
        :show-timeout="100"
        :hide-timeout="250"
        :collapse="!isMobile && isCollapse"
      >
        <sidebar-item :menu="menu"></sidebar-item>
      </el-menu>
    </el-scrollbar>

    <button
      v-if="hasOverflow"
      type="button"
      class="saber-menu-arrow saber-menu-arrow--next"
      :class="{ 'is-hidden': !canScrollNext }"
      aria-label="向右移动菜单"
      @click="scrollMenu(1)"
    >
      <el-icon><ArrowRight /></el-icon>
    </button>
  </div>
  <user-actions v-if="layoutMode === 'side'" placement="sidebar" />
  <sidebar-toggle v-if="setting.collapse && !isHorizontal && !isMobile" variant="edge" />
</template>

<script>
import { mapState } from 'pinia';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import sidebarItem from './sidebarItem.vue';
import sidebarToggle from './toggle.vue';
import userActions from '../user-actions.vue';
import { useCommonStore } from '@/store/common';
import { useTagsStore } from '@/store/tags';
import { useUserStore } from '@/store/user';
export default {
  name: 'sidebar',
  components: { ArrowLeft, ArrowRight, sidebarItem, sidebarToggle, userActions },
  inject: ['index'],
  data() {
    return {
      hasOverflow: false,
      canScrollPrev: false,
      canScrollNext: false,
    };
  },
  created() {
    this.index.openMenu();
    this.menuObserver = null;
  },
  mounted() {
    this.$nextTick(this.bindMenuScroll);
    window.addEventListener('resize', this.refreshMenuScroll);
  },
  beforeUnmount() {
    this.unbindMenuScroll();
    window.removeEventListener('resize', this.refreshMenuScroll);
  },
  watch: {
    menu() {
      this.$nextTick(this.refreshMenuScroll);
    },
    isHorizontal() {
      this.$nextTick(this.bindMenuScroll);
    },
  },
  computed: {
    ...mapState(useCommonStore, [
      'isHorizontal',
      'layoutMode',
      'setting',
      'sidebarMode',
      'isCollapse',
      'isMobile',
    ]),
    ...mapState(useUserStore, ['menu']),
    ...mapState(useTagsStore, {
      tag: store => store.currentTag,
    }),
    // 仅顶部导航（桌面）使用左右箭头移动菜单
    showMenuArrows() {
      return this.isHorizontal && !this.isMobile;
    },
    activeMenu() {
      const route = this.$route;
      const { meta, path } = route;
      if (meta.activeMenu) {
        return meta.activeMenu;
      }
      return path;
    },
  },
  methods: {
    menuWrap() {
      return this.$refs.menuScrollbar && this.$refs.menuScrollbar.wrapRef;
    },
    bindMenuScroll() {
      this.unbindMenuScroll();
      const wrap = this.menuWrap();
      if (!wrap) return;
      wrap.addEventListener('scroll', this.refreshMenuScroll, { passive: true });
      // 菜单数据与字体布局完成后宽度会再次变化，用 ResizeObserver 兜住首次测量误判
      if (typeof ResizeObserver !== 'undefined') {
        this.menuObserver = new ResizeObserver(this.refreshMenuScroll);
        this.menuObserver.observe(wrap);
        const menuEl = wrap.querySelector('.el-menu');
        if (menuEl) this.menuObserver.observe(menuEl);
      }
      this.refreshMenuScroll();
    },
    unbindMenuScroll() {
      const wrap = this.menuWrap();
      if (wrap) wrap.removeEventListener('scroll', this.refreshMenuScroll);
      if (this.menuObserver) {
        this.menuObserver.disconnect();
        this.menuObserver = null;
      }
    },
    refreshMenuScroll() {
      const wrap = this.menuWrap();
      if (!wrap || !this.showMenuArrows) {
        this.hasOverflow = false;
        this.canScrollPrev = false;
        this.canScrollNext = false;
        return;
      }
      const max = wrap.scrollWidth - wrap.clientWidth;
      // 无溢出（含亚像素误差）时不占用箭头位置
      this.hasOverflow = max > 2;
      if (!this.hasOverflow) {
        this.canScrollPrev = false;
        this.canScrollNext = false;
        return;
      }
      this.canScrollPrev = wrap.scrollLeft > 1;
      this.canScrollNext = wrap.scrollLeft < max - 1;
    },
    scrollMenu(direction) {
      const wrap = this.menuWrap();
      if (!wrap) return;
      const step = Math.max(180, Math.round(wrap.clientWidth * 0.7));
      const max = Math.max(wrap.scrollWidth - wrap.clientWidth, 0);
      const left = Math.min(Math.max(wrap.scrollLeft + direction * step, 0), max);
      wrap.scrollTo({ left, behavior: 'smooth' });
    },
  },
};
</script>
<style lang="scss" scoped></style>
