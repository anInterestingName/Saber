<template>
  <div class="avue-contail logo-preview" :class="{ 'avue--collapse': isCollapse }">
    <div class="avue-layout">
      <aside class="avue-sidebar">
        <Logo />
        <el-menu class="avue-menu" default-active="1">
          <el-menu-item index="1"><span>首页</span></el-menu-item>
          <el-menu-item index="2"><span>系统管理</span></el-menu-item>
        </el-menu>
      </aside>
      <section class="avue-main">
        <header class="avue-top">
          <el-button @click="toggleCollapse">{{ isCollapse ? '展开' : '折叠' }}</el-button>
          <el-button @click="toggleTheme">{{ isDark ? '切换明亮' : '切换暗黑' }}</el-button>
        </header>
        <main id="avue-view"><el-card><el-skeleton :rows="7" /></el-card></main>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import Logo from '@/page/index/logo.vue';
import { applyTheme } from '@/utils/theme';

const store = useStore();
const isDark = ref(false);
const isCollapse = computed(() => store.getters.isCollapse);

const toggleCollapse = () => store.commit('SET_COLLAPSE');
const toggleTheme = () => {
  isDark.value = !isDark.value;
  applyTheme({ theme: isDark.value ? 'dark' : 'light', colorPrimary: '#722ed1' });
};
</script>

<style scoped>
.logo-preview {
  min-height: 100vh;
}

.avue-top {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 16px;
}
</style>
