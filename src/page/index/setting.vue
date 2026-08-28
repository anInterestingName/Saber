<template>
  <el-tooltip content="界面设置" placement="left">
    <el-button
      class="app-setting-trigger"
      :style="show ? { right: drawerSize } : undefined"
      type="primary"
      :icon="Setting"
      aria-label="打开界面设置"
      @click="show = true"
    />
  </el-tooltip>

  <el-drawer
    v-model="show"
    append-to-body
    class="app-setting-drawer"
    title="界面设置"
    :size="drawerSize"
  >
    <div class="app-setting">
      <section class="app-setting__section">
        <h3 class="app-setting__title">整体风格设置</h3>
        <div class="app-setting__choices app-setting__choices--theme">
          <el-tooltip
            v-for="item in themeOptions"
            :key="item.value"
            :content="item.label"
            placement="top"
          >
            <button
              type="button"
              class="app-setting__choice"
              :class="{ 'is-active': themeMode === item.value }"
              :aria-label="item.label"
              :aria-pressed="themeMode === item.value"
              @click="setThemeMode(item.value)"
            >
              <span
                class="app-setting__theme-preview"
                :class="`app-setting__theme-preview--${item.value}`"
              >
                <i class="app-setting__theme-sidebar" />
                <i class="app-setting__theme-header" />
                <i class="app-setting__theme-content" />
                <el-icon v-if="themeMode === item.value" class="app-setting__check">
                  <Check />
                </el-icon>
              </span>
            </button>
          </el-tooltip>
        </div>

        <h3 class="app-setting__title app-setting__title--spaced">主题色</h3>
        <div class="app-setting__swatches">
          <el-tooltip
            v-for="item in primaryColorOptions"
            :key="item.value"
            :content="item.label"
            placement="top"
          >
            <button
              type="button"
              class="app-setting__swatch"
              :class="{ 'is-active': setting.colorPrimary === item.value }"
              :style="{ '--swatch-color': item.value }"
              :aria-label="item.label"
              :aria-pressed="setting.colorPrimary === item.value"
              @click="setPrimaryColor(item.value)"
            >
              <el-icon v-if="setting.colorPrimary === item.value"><Check /></el-icon>
            </button>
          </el-tooltip>
        </div>
      </section>

      <el-divider />

      <section class="app-setting__section">
        <h3 class="app-setting__title">导航模式</h3>
        <div class="app-setting__choices app-setting__choices--layout">
          <el-tooltip
            v-for="item in layoutOptions"
            :key="item.value"
            :content="item.label"
            placement="top"
          >
            <button
              type="button"
              class="app-setting__choice"
              :class="{ 'is-active': setting.layout === item.value }"
              :aria-label="item.label"
              :aria-pressed="setting.layout === item.value"
              @click="setLayout(item.value)"
            >
              <span
                class="app-setting__layout-preview"
                :class="`app-setting__layout-preview--${item.value}`"
              >
                <i class="app-setting__layout-header" />
                <i class="app-setting__layout-sidebar" />
                <i class="app-setting__layout-content" />
                <el-icon v-if="setting.layout === item.value" class="app-setting__check">
                  <Check />
                </el-icon>
              </span>
            </button>
          </el-tooltip>
        </div>
      </section>

      <el-divider />

      <section class="app-setting__section">
        <h3 class="app-setting__title">界面显示</h3>
        <div class="app-setting__switches">
          <div v-for="item in displayOptions" :key="item.key" class="app-setting__switch-row">
            <span>{{ item.label }}</span>
            <el-switch
              :model-value="setting[item.key]"
              @change="value => updateSetting(item.key, value)"
            />
          </div>
        </div>
      </section>

      <el-divider />

      <section class="app-setting__section">
        <h3 class="app-setting__title">工具栏</h3>
        <div class="app-setting__switches">
          <div v-for="item in toolOptions" :key="item.key" class="app-setting__switch-row">
            <span>{{ item.label }}</span>
            <el-switch
              :model-value="setting[item.key]"
              @change="value => updateSetting(item.key, value)"
            />
          </div>
        </div>
      </section>

      <div class="app-setting__footer">
        <el-button :icon="RefreshLeft" @click="resetSetting">恢复默认设置</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { Check, RefreshLeft, Setting } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { applyTheme, primaryColorOptions } from '@/utils/theme';
import type { AppSetting, LayoutMode, ThemeMode } from '@/types/setting';

type BooleanSettingKey = 'tag' | 'collapse' | 'search' | 'fullscreen' | 'lock' | 'debug';

interface SettingOption {
  label: string;
  key: BooleanSettingKey;
}

const store = useStore();
const show = ref(false);
const viewportWidth = ref(window.innerWidth);

const setting = computed<AppSetting>(() => store.getters.setting);
const themeMode = computed<ThemeMode>(() => setting.value.theme);
const drawerSize = computed(() => `${Math.min(viewportWidth.value, 320)}px`);

const themeOptions: Array<{ label: string; value: ThemeMode }> = [
  { label: '明亮', value: 'light' },
  { label: '暗黑', value: 'dark' },
];

const layoutOptions: Array<{ label: string; value: LayoutMode }> = [
  { label: '侧边', value: 'side' },
  { label: '顶部', value: 'top' },
  { label: '混合', value: 'mix' },
];

const displayOptions: SettingOption[] = [
  { label: '导航标签', key: 'tag' },
  { label: '菜单折叠', key: 'collapse' },
  { label: '菜单搜索', key: 'search' },
];

const toolOptions: SettingOption[] = [
  { label: '屏幕全屏', key: 'fullscreen' },
  { label: '屏幕锁定', key: 'lock' },
  { label: '日志调试', key: 'debug' },
];

const setThemeMode = (mode: ThemeMode) => {
  store.commit('SET_SETTING', { theme: mode });
  applyTheme(store.getters.setting);
};

const setPrimaryColor = (colorPrimary: string) => {
  store.commit('SET_SETTING', { colorPrimary });
  applyTheme(store.getters.setting);
};

const setLayout = (layout: LayoutMode) => {
  store.commit('SET_LAYOUT', layout);
};

const updateSetting = (key: BooleanSettingKey, value: string | number | boolean) => {
  store.commit('SET_SETTING', { [key]: Boolean(value) });
};

const resetSetting = () => {
  store.commit('RESET_SETTING');
  applyTheme(store.getters.setting);
  ElMessage.success('已恢复默认设置');
};

const updateViewportWidth = () => {
  viewportWidth.value = window.innerWidth;
};

onMounted(() => window.addEventListener('resize', updateViewportWidth));
onBeforeUnmount(() => window.removeEventListener('resize', updateViewportWidth));
</script>

<style lang="scss">
.app-setting-trigger {
  position: fixed;
  top: 42%;
  right: 0;
  z-index: 2048;
  width: 44px;
  height: 44px;
  border-radius: 4px 0 0 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
  transition: right 0.3s;
}

.app-setting-drawer {
  background: var(--saber-surface);
  box-shadow: var(--saber-shadow-drawer);

  .el-drawer__header {
    height: 56px;
    padding: 0 20px;
    margin: 0;
    color: var(--saber-text-primary);
    border-bottom: 1px solid var(--saber-border);
  }

  .el-drawer__title {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0;
  }

  .el-drawer__body {
    padding: 0;
  }
}

.app-setting {
  min-height: 100%;
  padding: 20px;
  box-sizing: border-box;
  color: var(--saber-text-primary);

  .el-divider {
    margin: 24px 0;
    border-color: var(--saber-border);
  }

  &__title {
    margin: 0 0 16px;
    font-size: 14px;
    font-weight: 600;
    line-height: 22px;
    letter-spacing: 0;

    &--spaced {
      margin-top: 22px;
    }
  }

  &__choices {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
  }

  &__choice {
    position: relative;
    width: 56px;
    padding: 0;
    background: transparent;
    border: 0;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.2s;

    &:hover {
      transform: translateY(-1px);
    }
  }

  &__check {
    position: absolute;
    right: 4px;
    bottom: 4px;
    color: var(--el-color-primary);
    font-size: 15px;
  }

  &__theme-preview,
  &__layout-preview {
    position: relative;
    display: block;
    width: 56px;
    height: 44px;
    overflow: hidden;
    background: #f5f5f5;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  &__theme-preview {
    &--light {
      background: #f5f5f5;

      .app-setting__theme-sidebar,
      .app-setting__theme-header {
        background: #ffffff;
      }

      .app-setting__theme-sidebar {
        border-right: 1px solid #e5e7eb;
      }

      .app-setting__theme-header {
        border-bottom: 1px solid #e5e7eb;
      }

      .app-setting__theme-content {
        background: #ffffff;
      }
    }

    &--dark {
      background: #0f1115;

      .app-setting__theme-sidebar {
        background: #171a21;
      }

      .app-setting__theme-header {
        background: #1d2028;
      }

      .app-setting__theme-content {
        background: #242832;
      }
    }
  }

  &__theme-sidebar,
  &__theme-header,
  &__theme-content,
  &__layout-header,
  &__layout-sidebar,
  &__layout-content {
    position: absolute;
    display: block;
  }

  &__theme-sidebar {
    top: 0;
    bottom: 0;
    left: 0;
    width: 24%;
  }

  &__theme-header {
    top: 0;
    right: 0;
    left: 24%;
    height: 20%;
  }

  &__theme-content {
    top: 30%;
    right: 8%;
    bottom: 10%;
    left: 32%;
    border-radius: 2px;
  }

  &__layout-preview {
    background: var(--saber-page-bg);
  }

  &__swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  &__swatch {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    color: #ffffff;
    background: var(--swatch-color);
    border: 0;
    border-radius: 3px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
      transform: translateY(-1px);
    }

    &.is-active {
      box-shadow: 0 0 0 2px var(--saber-surface), 0 0 0 4px var(--swatch-color);
    }
  }

  &__layout-header {
    top: 0;
    right: 0;
    left: 0;
    height: 14px;
    background: var(--saber-sidebar-bg);
    border-bottom: 1px solid var(--saber-border);
  }

  &__layout-sidebar {
    top: 0;
    bottom: 0;
    left: 0;
    width: 20px;
    background: var(--saber-sidebar-bg);
    border-right: 1px solid var(--saber-border);
  }

  &__layout-content {
    top: 24px;
    right: 8px;
    bottom: 8px;
    left: 29px;
    background: var(--saber-surface);
    border-radius: 2px;
  }

  &__layout-preview--top {
    .app-setting__layout-header {
      z-index: 1;
      height: 18px;
      background: var(--saber-sidebar-bg);
      border-bottom: 1px solid var(--saber-border);
    }

    .app-setting__layout-sidebar {
      display: none;
    }

    .app-setting__layout-content {
      top: 27px;
      left: 8px;
    }
  }

  &__layout-preview--mix {
    .app-setting__layout-header {
      z-index: 2;
      height: 16px;
      background: var(--saber-sidebar-bg);
      border-bottom: 1px solid var(--saber-border);
    }

    .app-setting__layout-sidebar {
      top: 16px;
      width: 18px;
      background: var(--saber-sidebar-bg);
      border-right: 1px solid #dcdfe6;
    }

    .app-setting__layout-content {
      top: 25px;
      left: 27px;
    }
  }

  &__switches {
    display: grid;
    gap: 16px;
  }

  &__switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 24px;
    font-size: 14px;
  }

  &__footer {
    padding-top: 28px;

    .el-button {
      width: 100%;
    }
  }
}
</style>
