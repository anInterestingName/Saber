<template>
  <el-menu class="top-menu" mode="horizontal" text-color="#333">
    <template v-for="(item, index) in items" :key="index">
      <el-menu-item :index="item.id + ''" @click="openMenu(item)">
        <template #title>
          <i :class="item.source" style="padding-right: 5px"></i>
          <span>{{ item.name }}</span>
        </template>
      </el-menu-item>
    </template>
  </el-menu>
</template>

<script>
import { mapActions, mapState } from 'pinia';
import { useUserStore } from '@/store/user';

export default {
  name: 'top-menu',
  data() {
    return {
      items: [],
    };
  },
  inject: ['index'],
  created() {
    this.getMenu();
  },
  computed: {
    ...mapState(useUserStore, ['menu']),
  },
  methods: {
    ...mapActions(useUserStore, ['GetTopMenu']),
    openMenu(item) {
      this.index.openMenu(item);
    },
    getMenu() {
      this.GetTopMenu().then(res => {
        this.items = res;
      });
    },
  },
};
</script>
