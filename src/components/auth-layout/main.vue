<template>
  <div class="auth-shell" :class="{ 'is-dark': isDark }">
    <section class="auth-visual" aria-label="星图品牌展示">
      <div class="auth-brand auth-brand--desktop">
        <img class="auth-brand__mark" src="/img/staratlas-mark.svg" alt="" />
        <div class="auth-brand__text">
          <strong>星图</strong>
          <span>staratlas</span>
        </div>
      </div>

      <div class="auth-visual__content">
        <div class="auth-visual__scene">
          <img src="/主体背景图.png" alt="" />
        </div>
        <div class="auth-copy">
          <h2>{{ t('login.slogan') }}</h2>
          <p>{{ t('login.sloganDetail') }}</p>
        </div>
      </div>

      <footer class="auth-copyright">© {{ currentYear }} 星图 staratlas</footer>
    </section>

    <section class="auth-panel">
      <div class="auth-toolbar">
        <top-lang show-label />
        <span class="auth-toolbar__divider"></span>
        <button
          class="auth-toolbar__button"
          type="button"
          :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
          :title="isDark ? '浅色模式' : '深色模式'"
          @click="toggleTheme"
        >
          <el-icon><Sunny v-if="isDark" /><Moon v-else /></el-icon>
        </button>
      </div>

      <div class="auth-brand auth-brand--mobile">
        <img class="auth-brand__mark" src="/img/staratlas-mark.svg" alt="" />
        <div class="auth-brand__text">
          <strong>星图</strong>
          <span>staratlas</span>
        </div>
      </div>

      <main class="auth-panel__content">
        <slot></slot>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { Moon, Sunny } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import topLang from '@/page/index/top/top-lang.vue';
import { applyTheme } from '@/utils/theme';
import type { AppSetting, ThemeMode } from '@/types/setting';

const store = useStore();
const { t } = useI18n();
const currentYear = new Date().getFullYear();
const setting = computed<AppSetting>(() => store.getters.setting);
const isDark = computed(() => setting.value.theme === 'dark');

const setThemeMode = (theme: ThemeMode) => {
  store.commit('SET_SETTING', { theme });
  applyTheme(store.getters.setting);
};

const toggleTheme = () => {
  setThemeMode(isDark.value ? 'light' : 'dark');
};

onMounted(() => {
  applyTheme(setting.value);
});
</script>
