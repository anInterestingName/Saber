<template>
  <template v-for="item in menu">
    <el-menu-item v-if="validateNull(item[childrenKey]) && validRoles(item)"
                  :index="getPath(item)"
                  @click="open(item)"
                  :key="item[labelKey]">
      <i :class="item[iconKey]"></i>
      <template #title>
        <span :alt="item[pathKey]">{{getTitle(item)}}</span>
      </template>
    </el-menu-item>
    <el-sub-menu v-else-if="!validateNull(item[childrenKey])&&validRoles(item)"
                 :index="getPath(item)"
                 :key="item[labelKey]">
      <template #title>
        <i :class="item[iconKey]"></i>
        <span>{{getTitle(item)}}</span>
      </template>
      <template v-for="(child,cindex) in item[childrenKey]"
                :key="child[labelKey]">
        <el-menu-item :index="getPath(child)"
                      @click="open(child)"
                      v-if="validateNull(child[childrenKey])">
          <i :class="child[iconKey]"></i>
          <template #title>
            <span>{{getTitle(child)}}</span>
          </template>
        </el-menu-item>
        <sidebar-item v-else
                      :menu="[child]"
                      :key="cindex"></sidebar-item>
      </template>
    </el-sub-menu>
  </template>
</template>
<script>
import { mapActions, mapState } from 'pinia';
import { validateNull } from 'utils/validate'
import website from '@/config/website'
import { useCommonStore } from '@/store/common';
import { useUserStore } from '@/store/user';
export default {
  name: "sidebarItem",
  data () {
    return {
      props: website.menu
    }
  },
  props: {
    menu: Array
  },
  computed: {
    ...mapState(useUserStore, ['roles']),
    labelKey () {
      return this.props.label
    },
    pathKey () {
      return this.props.path
    },
    queryKey () {
      return this.props.query
    },
    iconKey () {
      return this.props.icon
    },
    childrenKey () {
      return this.props.children
    }
  },
  methods: {
    ...mapActions(useCommonStore, ['closeMobileMenu']),
    validateNull,
    getPath (item) {
      return item[this.pathKey]
    },
    getTitle (item) {
      return this.$router.$dynamicRouter.generateTitle(item, this.props);
    },
    validRoles (item) {
      item.meta = item.meta || {};
      return item.meta.roles ? item.meta.roles.includes(this.roles) : true;
    },
    open (item) {
      this.$router.push({
        path: item[this.pathKey],
        query: item[this.queryKey]
      });
      this.closeMobileMenu();
    }
  }
};
</script>
