<template>
  <div
    class="auth-shell"
    :class="{
      'is-dark': isDark,
      'auth-shell--workspace': props.workspace,
      'auth-shell--card': props.variant === 'card',
    }"
  >
    <section
      v-if="props.variant === 'split'"
      class="auth-visual"
      :aria-label="t('auth.platformName')"
    >
      <div class="auth-brand auth-brand--desktop">
        <img class="auth-brand__mark" src="/img/staratlas-mark.svg" alt="" />
        <div class="auth-brand__text">
          <strong>星图</strong>
          <span>staratlas</span>
        </div>
      </div>

      <div class="auth-visual__content">
        <div v-if="!props.workspace" class="auth-visual__scene">
          <img src="/主体背景图.png" alt="" />
        </div>
        <div class="auth-copy" :class="{ 'auth-copy--workspace': props.workspace }">
          <span v-if="props.workspace" class="auth-copy__lead">{{ t('auth.brandLead') }}</span>
          <h2>{{ t(props.workspace ? 'auth.brandTitle' : 'login.slogan') }}</h2>
          <p>{{ t(props.workspace ? 'auth.brandDetail' : 'login.sloganDetail') }}</p>
          <div v-if="props.workspace" class="auth-copy__symbol" aria-hidden="true">
            <el-icon><Grid /></el-icon>
          </div>
        </div>
      </div>

      <footer class="auth-copyright">© {{ currentYear }} 星图 staratlas</footer>
    </section>

    <section class="auth-panel">
      <header class="auth-panel__header">
        <div class="auth-toolbar">
          <top-lang show-label />
          <span class="auth-toolbar__divider"></span>
          <button
            class="auth-toolbar__button"
            type="button"
            :aria-label="t(isDark ? 'auth.lightTheme' : 'auth.darkTheme')"
            :title="t(isDark ? 'auth.lightTheme' : 'auth.darkTheme')"
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
      </header>

      <main class="auth-panel__content">
        <slot></slot>
      </main>
      <footer v-if="props.variant === 'card'" class="auth-card-footer">
        {{ t('auth.platformName') }}
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { Grid, Moon, Sunny } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import topLang from '@/page/index/top/top-lang.vue';
import { useCommonStore } from '@/store/common';
import { applyTheme } from '@/utils/theme';
import type { ThemeMode } from '@/types/setting';

const props = withDefaults(defineProps<{ variant?: 'split' | 'card'; workspace?: boolean }>(), {
  variant: 'split',
  workspace: false,
});
const commonStore = useCommonStore();
const { setting } = storeToRefs(commonStore);
const { t } = useI18n();
const currentYear = new Date().getFullYear();
const isDark = computed(() => setting.value.theme === 'dark');

const setThemeMode = (theme: ThemeMode) => {
  commonStore.setSetting({ theme });
  applyTheme(setting.value);
};

const toggleTheme = () => {
  setThemeMode(isDark.value ? 'light' : 'dark');
};

onMounted(() => {
  applyTheme(setting.value);
});
</script>

<style scoped>
.auth-panel {
  min-width: 0;
}
.auth-panel__header {
  display: contents;
}
.auth-shell--workspace,
.auth-shell--card {
  --auth-accent: var(--el-color-primary);
  --auth-accent-hover: var(--el-color-primary-dark-2);
  --auth-muted: var(--saber-text-secondary);
  min-height: 0;
  overflow-y: auto;
}
.auth-shell--workspace .auth-visual {
  flex-basis: 42%;
  min-height: 100%;
  background-image: none;
}
.auth-shell--workspace .auth-visual__content {
  align-items: flex-start;
}
.auth-copy--workspace {
  width: min(100%, 340px);
  margin: 0;
  text-align: left;
}
.auth-copy--workspace h2 {
  margin-top: var(--saber-space-4);
  font-size: 36px;
  line-height: 1.4;
  font-weight: 500;
}
.auth-copy--workspace p {
  max-width: 280px;
  margin-top: var(--saber-space-5);
}
.auth-copy__lead {
  color: var(--auth-muted);
  font-size: 13px;
}
.auth-copy__symbol {
  display: flex;
  width: 60px;
  height: 60px;
  align-items: center;
  justify-content: center;
  margin-top: var(--saber-space-7);
  border-radius: var(--saber-radius-overlay);
  color: var(--auth-accent);
  background: var(--auth-panel);
  font-size: 28px;
}
.auth-shell--workspace .auth-panel {
  min-height: 100%;
  flex-direction: column;
  overflow: visible;
}
.auth-shell--workspace .auth-panel__content {
  width: min(calc(100% - 64px), 440px);
  padding: var(--saber-space-7) 0 var(--saber-space-9);
}
.auth-shell--workspace .auth-panel__header,
.auth-shell--card .auth-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--saber-space-4);
  flex: none;
}
.auth-shell--workspace .auth-panel__header {
  padding: var(--saber-space-6) var(--saber-space-7);
}
.auth-shell--workspace .auth-toolbar,
.auth-shell--card .auth-toolbar {
  position: static;
  order: 1;
  margin-left: auto;
  flex: none;
}
.auth-shell--workspace .auth-brand--mobile,
.auth-shell--card .auth-brand--mobile {
  position: static;
  order: 0;
}
.auth-shell--card {
  flex-direction: column;
  align-items: center;
  padding: var(--saber-space-6);
  background: var(--saber-surface-muted);
}
.auth-shell--card .auth-panel {
  flex: none;
  flex-direction: column;
  width: min(100%, 520px);
  margin: auto;
  padding: var(--saber-space-6);
  border: 1px solid var(--saber-border);
  border-radius: var(--saber-radius-overlay);
  overflow: visible;
  box-shadow: var(--saber-shadow);
}
.auth-shell--card .auth-brand--mobile {
  display: flex;
}
.auth-shell--card .auth-brand__mark {
  width: 42px;
  height: 42px;
}
.auth-shell--card .auth-brand__text strong {
  font-size: 20px;
}
.auth-shell--card .auth-panel__content {
  width: 100%;
  margin: 0;
  padding: var(--saber-space-7) 0 0;
}
.auth-card-footer {
  margin-top: var(--saber-space-6);
  color: var(--auth-muted);
  font-size: 12px;
  text-align: center;
}
@media (max-width: 992px) {
  .auth-shell--workspace .auth-panel__header {
    padding: var(--saber-space-5) var(--saber-space-6);
  }
  .auth-shell--workspace .auth-panel__content {
    width: min(calc(100% - 48px), 440px);
  }
}
@media (max-width: 520px) {
  .auth-shell--card {
    padding: var(--saber-space-4);
  }
  .auth-shell--card .auth-panel {
    padding: var(--saber-space-5);
  }
  .auth-shell--workspace .auth-panel__header,
  .auth-shell--card .auth-panel__header {
    gap: var(--saber-space-2);
  }
  .auth-shell--workspace .auth-panel__content {
    width: calc(100% - 40px);
  }
}
</style>
