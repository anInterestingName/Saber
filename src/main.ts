import { createApp } from 'vue';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import 'animate.css';
import dayjs from 'dayjs';
import website from './config/website';
import { createAppI18n, messages } from './lang/';
import { createAppRouter } from './router/';
import { pinia } from './store';
import { useCommonStore } from './store/common';
import { useUserStore } from './store/user';
import { setUnauthorizedHandler } from './axios';
import { setupPermissionGuards } from './permission';
import { createErrorPlugin } from './error';
import { getScreen } from './utils/util';
import { applyTheme } from './utils/theme';
import basicBlock from 'components/basic-block/main.vue';
import basicContainer from 'components/basic-container/main.vue';
import App from './App.vue';
import 'styles/common.scss';

const commonStore = useCommonStore(pinia);
const i18n = createAppI18n(commonStore.language);
const router = createAppRouter(pinia, i18n);
const userStore = useUserStore(pinia);

setUnauthorizedHandler(async () => {
  await userStore.FedLogOut();
  if (router.currentRoute.value.path !== '/login') {
    await router.replace('/login');
  }
});
setupPermissionGuards(router, pinia);
applyTheme(commonStore.setting);

const app = createApp(App);
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}
app.component('basicContainer', basicContainer);
app.component('basicBlock', basicBlock);
app.config.globalProperties.$dayjs = dayjs;
app.config.globalProperties.website = website;
app.config.globalProperties.getScreen = getScreen;
app.use(pinia);
app.use(createErrorPlugin(pinia));
app.use(i18n);
app.use(router);
app.use(ElementPlus, {
  locale: messages[commonStore.language],
});
app.mount('#app');
