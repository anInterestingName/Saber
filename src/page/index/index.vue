<template>
  <div class="saber-shell"
       :class="{'saber-shell--collapsed':isCollapse,}">
    <div class="saber-layout"
         :class="{'saber-layout--horizontal':isHorizontal}">
      <div class="saber-sidebar"
           v-show="validSidebar">
        <!-- 左侧导航栏 -->
        <logo />
        <sidebar />
      </div>
      <div class="saber-main">
        <!-- 顶部导航栏 -->
        <top ref="top" />
        <!-- 顶部标签卡 -->
        <tags />
        <search class="saber-view"
                v-show="isSearch"></search>
        <!-- 主体视图层 -->
        <div id="saber-view"
             v-show="!isSearch"
             v-if="isRefresh">
          <router-view #="{ Component }">
            <keep-alive :include="$store.getters.tagsKeep">
              <component :is="Component" />
            </keep-alive>
          </router-view>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import index from '@/mixins/index'
import { validateNull } from 'utils/validate'
import { mapGetters } from "vuex";
import tags from "./tags.vue";
import search from "./search.vue";
import logo from "./logo.vue";
import top from "./top/index.vue";
import sidebar from "./sidebar/index.vue";
export default {
  mixins: [index],
  components: {
    top,
    logo,
    tags,
    search,
    sidebar
  },
  name: "index",
  provide () {
    return {
      index: this
    };
  },
  computed: {
    ...mapGetters(["isHorizontal", "isRefresh", "isLock", "isCollapse", "isSearch", "menu", "setting",]),
    validSidebar () {
      return !(
        (this.$route.meta || {}).menu === false || (this.$route.query || {}).menu === 'false'
      );
    }
  },
  props: [],
  methods: {
    //打开菜单
    openMenu (item = {}) {
      this.$store.dispatch("GetMenu", item.id).then(data => {
        if (data.length !== 0) {
          this.$router.$dynamicRouter.formatRoutes(data, true);
          if (!validateNull(item.path)) {
            this.$router.push({ path: item.path });
          }
        }
      });
    },
  }
};
</script>
