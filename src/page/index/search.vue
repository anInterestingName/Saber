<template>
  <div class="saber-menu-search" @click.self="handleEsc">
    <div class="saber-menu-search__title">菜单搜索</div>
    <div class="saber-menu-search__content">
      <div class="saber-menu-search__form">
        <el-input :placeholder="$t('search')" v-model="value" @keydown.esc="handleEsc">
          <template #append>
            <el-button aria-label="搜索">
              <el-icon><Search /></el-icon>
            </el-button>
          </template>
        </el-input>
      </div>
      <div class="saber-menu-search__list">
        <el-scrollbar class="saber-menu-search__scrollbar">
          <div
            class="saber-menu-search__item"
            v-for="(item, index) in menus"
            :key="index"
            @click="handleSelect(item)"
          >
            <i :class="[item[iconKey], 'saber-menu-search__item-icon']"></i>
            <span class="saber-menu-search__item-title">{{ item[labelKey] }}</span>
            <div class="saber-menu-search__item-path">
              {{ item[pathKey] }}
            </div>
          </div>
        </el-scrollbar>
      </div>
    </div>
  </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';
import { validateNull } from '@/utils/validate';
import { Search } from '@element-plus/icons-vue';
import { useCommonStore } from '@/store/common';
import { useUserStore } from '@/store/user';
export default {
  components: { Search },
  data() {
    return {
      value: '',
      menus: [],
      menuList: [],
    };
  },
  created() {
    this.getMenuList();
  },
  watch: {
    value() {
      this.querySearch();
    },
    menu() {
      this.getMenuList();
    },
  },
  computed: {
    labelKey() {
      return this.website.menu.label;
    },
    pathKey() {
      return this.website.menu.path;
    },
    iconKey() {
      return this.website.menu.icon;
    },
    childrenKey() {
      return this.website.menu.children;
    },
    ...mapState(useUserStore, ['menu']),
  },
  methods: {
    ...mapActions(useCommonStore, ['setSearch']),
    handleEsc() {
      this.setSearch(false);
    },
    getMenuList() {
      const findMenu = list => {
        for (let i = 0; i < list.length; i++) {
          const ele = Object.assign({}, list[i]);
          if (validateNull(ele[this.childrenKey])) {
            this.menuList.push(ele);
          } else {
            findMenu(ele[this.childrenKey]);
          }
        }
      };
      this.menuList = [];
      findMenu(this.menu);
      this.menus = this.menuList;
    },
    querySearch() {
      var restaurants = this.menuList;
      var queryString = this.value;
      this.menus = queryString ? this.menuList.filter(this.createFilter(queryString)) : restaurants;
    },
    createFilter(queryString) {
      return restaurant => {
        return restaurant[this.labelKey].toLowerCase().indexOf(queryString.toLowerCase()) === 0;
      };
    },
    handleSelect(item) {
      this.value = '';
      this.$router.push({
        path: item[this.pathKey],
        query: item.query,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.saber-menu-search {
  padding-top: var(--saber-space-9);
  width: 100%;
  height: 100%;
  color: var(--saber-text-primary);
  background-color: var(--saber-surface);
  z-index: 1024;
  &__title {
    margin-bottom: var(--saber-space-8);
    text-align: center;
    font-size: 28px;
    font-weight: bold;
    letter-spacing: 0;
  }
  &__form {
    margin: 0 auto var(--saber-space-9) auto;
    width: 50%;
    text-align: center;
  }
  &__scrollbar {
    height: 400px;
  }
  &__list {
    box-sizing: border-box;
    padding: var(--saber-space-5) var(--saber-space-7);
    margin: 0 auto;
    width: 70%;
    border-radius: var(--saber-radius-xs);
    border: 1px solid var(--saber-border);
    background-color: var(--saber-surface-elevated);
    overflow: hidden;
    color: var(--saber-text-primary);
    transition: 0.3s;
    box-shadow: var(--saber-shadow-popover);
  }
  &__item {
    padding: var(--saber-space-2) 0;
    border-bottom: 1px dashed var(--saber-border);
    &-icon {
      margin-right: var(--saber-space-2);
      font-size: 18px;
    }
    &-title {
      font-size: 20px;
      font-weight: 500;
      color: var(--saber-text-primary);
    }
    &-path {
      line-height: 30px;
      color: var(--saber-text-secondary);
    }
  }
}
</style>
