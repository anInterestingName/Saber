<template>
  <auth-layout>
    <div class="auth-form-header">
      <h1>{{ $t('login.welcome') }}</h1>
      <p>{{ $t('login.welcomeHint') }}</p>
    </div>

    <div class="auth-mode-switch" role="tablist" :aria-label="$t('login.title')">
      <button
        type="button"
        role="tab"
        :aria-selected="activeName === 'user'"
        :class="{ 'is-active': activeName === 'user' }"
        @click="activeName = 'user'"
      >
        <el-icon><User /></el-icon>
        <span>{{ $t('login.userLogin') }}</span>
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeName === 'face'"
        :class="{ 'is-active': activeName === 'face' }"
        @click="activeName = 'face'"
      >
        <el-icon><View /></el-icon>
        <span>{{ $t('login.faceLogin') }}</span>
      </button>
    </div>

    <div class="auth-form-stage" :class="{ 'is-face': activeName === 'face' }">
      <user-login v-if="activeName === 'user'"></user-login>
      <face-login v-else></face-login>
    </div>

    <third-login></third-login>
  </auth-layout>
</template>

<script>
import { User, View } from '@element-plus/icons-vue';
import AuthLayout from '@/components/auth-layout/main.vue';
import { validateNull } from '@/utils/validate';
import faceLogin from './facelogin.vue';
import thirdLogin from './thirdlogin.vue';
import userLogin from './userlogin.vue';

export default {
  name: 'login',
  components: {
    AuthLayout,
    User,
    View,
    userLogin,
    thirdLogin,
    faceLogin,
  },
  data() {
    return {
      activeName: 'user',
      socialForm: {},
    };
  },
  watch: {
    $route() {
      const params = this.$route.query;
      this.socialForm = params;
      if (!validateNull(this.socialForm.state)) {
        const loading = this.$loading({
          lock: true,
          text: `${this.socialForm.state === 'WX' ? '微信' : 'QQ'}登录中,请稍后。。。`,
          spinner: 'el-icon-loading',
        });
        setTimeout(() => {
          loading.close();
        }, 2000);
      }
    },
  },
};
</script>
