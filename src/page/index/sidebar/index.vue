<template>
  <el-scrollbar class="saber-menu">
    <div v-if="menu&&menu.length==0&&!isHorizontal"
         class="saber-sidebar--tip">{{$t('menuTip')}}</div>
    <el-menu unique-opened
             :default-active="activeMenu"
             :mode="setting.sidebar"
             :collapse="!isMobile&&isCollapse">
      <sidebar-item :menu="menu"></sidebar-item>
    </el-menu>
  </el-scrollbar>
  <sidebar-toggle v-if="setting.collapse && !isHorizontal && !isMobile" variant="edge" />
</template>

<script>
import { mapState } from 'pinia';
import sidebarItem from "./sidebarItem.vue";
import sidebarToggle from './toggle.vue';
import { useCommonStore } from '@/store/common';
import { useTagsStore } from '@/store/tags';
import { useUserStore } from '@/store/user';
export default {
  name: "sidebar",
  components: { sidebarItem, sidebarToggle },
  inject: ["index"],
  created () {
    this.index.openMenu()
  },
  computed: {
    ...mapState(useCommonStore, ['isHorizontal', 'setting', 'isCollapse', 'isMobile']),
    ...mapState(useUserStore, ['menu']),
    ...mapState(useTagsStore, {
      tag: store => store.currentTag,
    }),
    activeMenu () {
      const route = this.$route;
      const { meta, path } = route;
      if (meta.activeMenu) {
        return meta.activeMenu;
      }
      return path;
    }
  }
};
</script>
<style lang="scss" scoped>
</style>
