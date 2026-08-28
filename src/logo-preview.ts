import { createApp } from 'vue';
import { createStore } from 'vuex';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import LogoPreview from '@/logo-preview.vue';
import { applyTheme } from '@/utils/theme';
import 'styles/common.scss';

const store = createStore({
  state: { isCollapse: false },
  getters: { isCollapse: state => state.isCollapse },
  mutations: { SET_COLLAPSE: state => (state.isCollapse = !state.isCollapse) },
});

applyTheme({ theme: 'light', colorPrimary: '#722ed1' });
createApp(LogoPreview).use(store).use(ElementPlus).mount('#app');
