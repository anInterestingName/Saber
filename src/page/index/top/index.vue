<template>
  <div class="saber-top">
    <div class="top-bar__left">
      <div
        class="saber-breadcrumb"
        :class="[{ 'saber-breadcrumb--active': isCollapse }]"
        v-if="setting.collapse && !isHorizontal"
      >
        <i class="icon-navicon" @click="setCollapse"></i>
      </div>
    </div>
    <div class="top-bar__title">
      <top-menu ref="topMenu" v-if="setting.menu"></top-menu>
      <top-search class="top-bar__item" v-if="setting.search"></top-search>
    </div>
    <div class="top-bar__right">
      <div v-if="setting.lock" class="top-bar__item">
        <top-lock></top-lock>
      </div>
      <div class="top-bar__item">
        <top-lang></top-lang>
      </div>
      <div class="top-bar__item" v-if="setting.fullscreen">
        <top-full></top-full>
      </div>
      <div class="top-bar__item" v-if="setting.debug">
        <top-logs></top-logs>
      </div>
      <div class="top-user">
        <img class="top-bar__img" :src="userInfo.avatar" />
        <el-dropdown>
          <span class="el-dropdown-link">
            {{ userInfo.userName }}
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item>
                <router-link to="/">{{ $t('navbar.dashboard') }}</router-link>
              </el-dropdown-item>
              <el-dropdown-item>
                <router-link to="/info/index">{{ $t('navbar.userinfo') }}</router-link>
              </el-dropdown-item>
              <el-dropdown-item @click="logout" divided>{{ $t('navbar.logOut') }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <top-setting></top-setting>
      </div>
    </div>
  </div>
</template>
<script>
import { mapActions, mapState } from 'pinia';
import topLock from './top-lock.vue';
import topMenu from './top-menu.vue';
import topSearch from './top-search.vue';
import topLogs from './top-logs.vue';
import topLang from './top-lang.vue';
import topFull from './top-full.vue';
import topSetting from '../setting.vue';
import { useCommonStore } from '@/store/common';
import { useLogsStore } from '@/store/logs';
import { useTagsStore } from '@/store/tags';
import { useUserStore } from '@/store/user';
export default {
  components: {
    topLock,
    topMenu,
    topSearch,
    topLogs,
    topLang,
    topFull,
    topSetting,
  },
  name: 'top',
  data() {
    return {};
  },
  filters: {},
  created() {},
  computed: {
    ...mapState(useCommonStore, [
      'setting',
      'isCollapse',
      'isHorizontal',
    ]),
    ...mapState(useUserStore, {
      userInfo: store => store.userInfo || {},
    }),
    ...mapState(useTagsStore, {
      tagWel: store => store.homeTag,
      tagList: store => store.tagList,
      tag: store => store.currentTag,
    }),
    ...mapState(useLogsStore, {
      logsLen: store => store.logCount,
      logsFlag: store => store.isEmpty,
    }),
  },
  methods: {
    ...mapActions(useCommonStore, ['toggleCollapse']),
    ...mapActions(useUserStore, ['LogOut']),
    setCollapse() {
      this.toggleCollapse();
    },
    logout() {
      this.$confirm(this.$t('logoutTip'), this.$t('tip'), {
        confirmButtonText: this.$t('submitText'),
        cancelButtonText: this.$t('cancelText'),
        type: 'warning',
      }).then(() => {
        this.LogOut().then(() => {
          this.$router.push({ path: '/login' });
        });
      });
    },
  },
};
</script>

<style lang="scss" scoped></style>
