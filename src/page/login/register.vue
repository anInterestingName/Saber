<template>
  <el-form
    ref="registerForm"
    class="login-form register-form"
    status-icon
    :rules="registerRules"
    :model="registerForm"
    label-width="0"
    @submit.prevent="handleRegister"
  >
    <el-form-item prop="tenantId">
      <el-input v-model="registerForm.tenantId" :placeholder="t('login.tenantIdOptional')" autocomplete="off">
        <template #prefix><i class="icon-quanxian"></i></template>
      </el-input>
      <div class="register-field-hint">{{ t('login.tenantHint', { tenant: config.defaultTenantId || '000000' }) }}</div>
    </el-form-item>
    <el-form-item prop="account">
      <el-input v-model="registerForm.account" :placeholder="t('login.registerAccount')" autocomplete="off">
        <template #prefix><i class="icon-yonghu"></i></template>
      </el-input>
    </el-form-item>
    <el-form-item prop="name">
      <el-input v-model="registerForm.name" :placeholder="t('login.nicknameOptional')" autocomplete="off">
        <template #prefix><i class="icon-yonghu"></i></template>
      </el-input>
    </el-form-item>
    <el-form-item prop="password">
      <el-input
        v-model="registerForm.password"
        type="password"
        show-password
        :placeholder="t('login.registerPassword')"
        autocomplete="new-password"
      >
        <template #prefix><i class="icon-mima"></i></template>
      </el-input>
    </el-form-item>
    <el-form-item prop="confirmPassword">
      <el-input
        v-model="registerForm.confirmPassword"
        type="password"
        show-password
        :placeholder="t('login.confirmPassword')"
        autocomplete="new-password"
        @keyup.enter="handleRegister"
      >
        <template #prefix><i class="icon-mima"></i></template>
      </el-input>
    </el-form-item>
    <el-form-item prop="captchaCode" class="login-code">
      <el-input v-model="registerForm.captchaCode" :placeholder="t('login.code')" autocomplete="off">
        <template #prefix><i class="icon-yanzhengma"></i></template>
        <template #append>
          <div class="login-code-box">
            <img :src="registerForm.image" class="login-code-img" :alt="t('login.refreshCaptcha')" @click="refreshCode" />
          </div>
        </template>
      </el-input>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" :loading="submitting" class="login-submit" @click.prevent="handleRegister">
        {{ t('login.registerSubmit') }}
      </el-button>
    </el-form-item>
    <el-button class="register-back" link type="primary" :disabled="submitting" @click="$emit('back')">
      {{ t('login.backToLogin') }}
    </el-button>
  </el-form>
</template>

<script lang="ts">
import { ElMessage, type FormInstance } from 'element-plus';
import { defineComponent, type PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  getCaptcha,
  registerUser,
  type RegisterConfig,
  type RegisterPayload,
} from '@/api/user';
import { encrypt } from '@/utils/sm2';

const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const DEFAULT_TENANT_ID = '000000';
type ValidationCallback = (error?: Error) => void;

const normalizeTenantId = (tenantId?: string | null) => String(tenantId || '').trim();

export default defineComponent({
  name: 'registerForm',
  emits: ['back', 'success', 'submitting-change'],
  props: {
    config: {
      type: Object as PropType<RegisterConfig>,
      required: true,
    },
  },
  setup() {
    const { t } = useI18n();
    return { t };
  },
  data() {
    return {
      submitting: false,
      registerForm: {
        tenantId: normalizeTenantId(this.config.defaultTenantId) || DEFAULT_TENANT_ID,
        account: '',
        name: '',
        password: '',
        confirmPassword: '',
        captchaKey: '',
        captchaCode: '',
        image: EMPTY_IMAGE,
      },
      registerRules: {
        tenantId: [{ max: 12, message: this.t('login.tenantIdRule'), trigger: 'blur' }],
        account: [{ required: true, validator: (rule, value, callback) => this.validateAccount(value, callback), trigger: 'blur' }],
        name: [{ max: 32, message: this.t('login.nicknameRule'), trigger: 'blur' }],
        password: [{ required: true, validator: (rule, value, callback) => this.validatePassword(value, callback), trigger: 'blur' }],
        confirmPassword: [{ required: true, validator: (rule, value, callback) => this.validateConfirmPassword(value, callback), trigger: 'blur' }],
        captchaCode: [{ required: true, message: this.t('login.captchaRule'), trigger: 'blur' }],
      },
    };
  },
  created() {
    this.refreshCode();
  },
  methods: {
    validateAccount(value: string, callback: ValidationCallback) {
      const account = String(value || '').trim();
      const min = this.config.accountMinLength || 4;
      const max = this.config.accountMaxLength || 32;
      if (account.length < min || account.length > max || !/^[A-Za-z0-9._-]+$/.test(account)) {
        callback(new Error(this.t('login.accountRule', { min, max })));
        return;
      }
      callback();
    },
    validatePassword(value: string, callback: ValidationCallback) {
      const password = String(value || '');
      const min = this.config.passwordMinLength || 8;
      const max = this.config.passwordMaxLength || 64;
      if (
        password.length < min ||
        password.length > max ||
        !/[A-Za-z]/.test(password) ||
        !/\d/.test(password) ||
        password === String(this.registerForm.account || '').trim()
      ) {
        callback(new Error(this.t('login.passwordRule', { min, max })));
        return;
      }
      callback();
    },
    validateConfirmPassword(value: string, callback: ValidationCallback) {
      if (value !== this.registerForm.password) {
        callback(new Error(this.t('login.confirmPasswordRule')));
        return;
      }
      callback();
    },
    refreshCode() {
      getCaptcha()
        .then(response => {
          const data = response.data.data;
          this.registerForm.captchaKey = data.key;
          this.registerForm.image = data.image;
        })
        .catch(() => {
          this.registerForm.captchaKey = '';
          this.registerForm.image = EMPTY_IMAGE;
        });
    },
    clearSensitive(refresh = false) {
      this.registerForm.password = '';
      this.registerForm.confirmPassword = '';
      this.registerForm.captchaCode = '';
      if (refresh) this.refreshCode();
    },
    handleRegister() {
      if (this.submitting) return;
      const form = this.$refs.registerForm as FormInstance;
      form.validate(async valid => {
        if (!valid) return;
        this.submitting = true;
        this.$emit('submitting-change', true);
        try {
          const payload: RegisterPayload = {
            tenantId: normalizeTenantId(this.registerForm.tenantId),
            account: this.registerForm.account.trim(),
            name: this.registerForm.name.trim(),
            password: encrypt(this.registerForm.password),
            confirmPassword: encrypt(this.registerForm.confirmPassword),
            captchaKey: this.registerForm.captchaKey,
            captchaCode: this.registerForm.captchaCode,
          };
          const response = await registerUser(payload);
          const result = response.data;
          if (!result.success) {
            ElMessage.error(result.msg || this.t('login.registerFailed'));
            this.clearSensitive(true);
            return;
          }
          const data = result.data;
          this.clearSensitive(false);
          ElMessage.success(this.t('login.registerSuccess'));
          this.$emit('success', data);
        } catch (error) {
          if (error?.name !== 'BladeBusinessError') {
            ElMessage.error(error?.message || this.t('login.registerFailed'));
          }
          this.clearSensitive(true);
        } finally {
          this.submitting = false;
          this.$emit('submitting-change', false);
        }
      });
    },
  },
});
</script>
