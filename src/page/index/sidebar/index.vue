<template>
  <el-scrollbar class="saber-menu">
    <div v-if="menu&&menu.length==0&&!isHorizontal"
         class="saber-sidebar--tip">{{$t('menuTip')}}</div>
    <el-menu unique-opened
             :default-active="activeMenu"
             :mode="setting.sidebar"
             :collapse="getScreen(isCollapse)">
      <sidebar-item :menu="menu"></sidebar-item>
    </el-menu>
  </el-scrollbar>
</template>

<script>
import { mapState } from 'pinia';
import sidebarItem from "./sidebarItem.vue";
import { useCommonStore } from '@/store/common';
import { useTagsStore } from '@/store/tags';
import { useUserStore } from '@/store/user';
export default {
  name: "sidebar",
  components: { sidebarItem },
  inject: ["index"],
  created () {
    this.index.openMenu()
  },
  computed: {
    ...mapState(useCommonStore, ['isHorizontal', 'setting', 'isCollapse']),
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

