<template>
  <auth-layout>
    <div class="auth-form-header">
      <h1>{{ activeName === 'register' ? $t('login.registerTitle') : $t('login.welcome') }}</h1>
      <p>{{ activeName === 'register' ? $t('login.registerHint') : $t('login.welcomeHint') }}</p>
    </div>

    <div
      class="auth-mode-switch"
      :class="{ 'is-registration-enabled': registrationEnabled }"
      role="tablist"
      :aria-label="$t('login.title')"
    >
      <button
        type="button"
        role="tab"
        :disabled="registerSubmitting"
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
        :disabled="registerSubmitting"
        :aria-selected="activeName === 'face'"
        :class="{ 'is-active': activeName === 'face' }"
        @click="activeName = 'face'"
      >
        <el-icon><View /></el-icon>
        <span>{{ $t('login.faceLogin') }}</span>
      </button>
      <button
        v-if="registrationEnabled"
        type="button"
        role="tab"
        :disabled="registerSubmitting"
        :aria-selected="activeName === 'register'"
        :class="{ 'is-active': activeName === 'register' }"
        @click="activeName = 'register'"
      >
        <el-icon><EditPen /></el-icon>
        <span>{{ $t('login.register') }}</span>
      </button>
    </div>

    <div
      class="auth-form-stage"
      :class="{ 'is-face': activeName === 'face', 'is-register': activeName === 'register' }"
    >
      <user-login
        v-if="activeName === 'user'"
        :registration-enabled="registrationEnabled"
        :prefill="loginPrefill"
        @register="activeName = 'register'"
      />
      <face-login v-else-if="activeName === 'face'"></face-login>
      <register-form
        v-else
        :config="registrationConfig"
        @back="activeName = 'user'"
        @success="handleRegisterSuccess"
        @submitting-change="registerSubmitting = $event"
      />
    </div>

    <third-login v-if="activeName !== 'register'"></third-login>
  </auth-layout>
</template>

<script>
import { EditPen, User, View } from '@element-plus/icons-vue';
import AuthLayout from '@/components/auth-layout/main.vue';
import { getRegisterConfig } from '@/api/user';
import { validateNull } from '@/utils/validate';
import faceLogin from './facelogin.vue';
import registerForm from './register.vue';
import thirdLogin from './thirdlogin.vue';
import userLogin from './userlogin.vue';

const DEFAULT_TENANT_ID = '000000';

export default {
  name: 'login',
  components: {
    AuthLayout,
    User,
    View,
    EditPen,
    userLogin,
    registerForm,
    thirdLogin,
    faceLogin,
  },
  data() {
    return {
      activeName: 'user',
      socialForm: {},
      registrationEnabled: false,
      registrationConfig: {
        enabled: false,
        defaultTenantId: DEFAULT_TENANT_ID,
        captchaEnabled: true,
        accountMinLength: 4,
        accountMaxLength: 32,
        passwordMinLength: 8,
        passwordMaxLength: 64,
      },
      loginPrefill: null,
      registerSubmitting: false,
    };
  },
  created() {
    this.loadRegistrationConfig();
  },
  watch: {
    $route() {
      const params = this.$route.query;
      this.socialForm = params;
      if (!validateNull(this.socialForm.state)) {
        const loading = this.$loading({
          lock: true,
          text: `${this.socialForm.state === 'WX' ? '微信' : 'QQ'}登录中,请稍后。。。`,
        });
        setTimeout(() => {
          loading.close();
        }, 2000);
      }
    },
  },
  methods: {
    loadRegistrationConfig() {
      getRegisterConfig()
        .then(response => {
          const result = response.data;
          if (result.success && result.data) {
            this.registrationConfig = {
              ...this.registrationConfig,
              ...result.data,
              defaultTenantId: String(result.data.defaultTenantId || DEFAULT_TENANT_ID),
            };
            this.registrationEnabled = result.data.enabled === true && result.data.captchaEnabled !== false;
          }
        })
        .catch(() => {
          this.registrationEnabled = false;
        });
    },
    handleRegisterSuccess(data) {
      this.registerSubmitting = false;
      this.loginPrefill = {
        tenantId: String(data.tenantId || DEFAULT_TENANT_ID),
        username: data.account,
      };
      this.activeName = 'user';
    },
  },
};
</script>
