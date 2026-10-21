<template>
  <auth-layout>
    <div class="auth-form-header">
      <h1>注册账号</h1>
      <p>注册成功后，使用新账号继续登录。</p>
    </div>
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" :closable="false" show-icon />
    <el-skeleton v-if="loading" :rows="5" animated />
    <el-alert
      v-else-if="config && !config.enabled"
      title="当前未开放账号注册"
      type="info"
      :closable="false"
    />
    <el-form
      v-else-if="config?.enabled"
      ref="formRef"
      class="login-form"
      :model="form"
      :rules="rules"
      label-position="top"
      :disabled="submitting"
      @submit.prevent="submitRegister"
    >
      <el-form-item v-if="website.tenantMode" label="租户" prop="tenantId">
        <el-input v-model="form.tenantId" autocomplete="organization" maxlength="12" />
      </el-form-item>
      <el-form-item label="账号" prop="account">
        <el-input
          v-model="form.account"
          autocomplete="username"
          :maxlength="config.accountMaxLength"
        />
      </el-form-item>
      <el-form-item label="昵称" prop="name">
        <el-input
          v-model="form.name"
          autocomplete="nickname"
          maxlength="32"
          placeholder="可选，留空使用账号"
        />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          show-password
          autocomplete="new-password"
          :maxlength="config.passwordMaxLength"
        />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input
          v-model="form.confirmPassword"
          type="password"
          show-password
          autocomplete="new-password"
          :maxlength="config.passwordMaxLength"
        />
      </el-form-item>
      <el-form-item label="验证码" prop="captchaCode">
        <div class="captcha-row">
          <el-input
            v-model="form.captchaCode"
            autocomplete="off"
            maxlength="20"
            :disabled="captchaLoading || !form.captchaKey"
          />
          <button
            class="captcha-button"
            type="button"
            :disabled="submitting || captchaLoading"
            aria-label="更换验证码"
            @click="loadCaptcha"
          >
            <img v-if="captchaImage" :src="captchaImage" alt="注册验证码" />
            <span v-else>{{ captchaLoading ? '加载中' : '获取验证码' }}</span>
          </button>
        </div>
      </el-form-item>
      <el-button
        class="login-submit"
        type="primary"
        native-type="submit"
        :loading="submitting"
        :disabled="captchaLoading || !form.captchaKey"
        >注册</el-button
      >
    </el-form>
    <div class="auth-links">
      <el-button v-if="!config && !loading" @click="loadConfig">重新加载</el-button>
      <el-button link :disabled="submitting" @click="router.replace('/auth/login')"
        >返回登录</el-button
      >
    </div>
  </auth-layout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { FormInstance, FormRules } from 'element-plus';
import AuthLayout from '@/components/auth-layout/main.vue';
import website from '@/config/website';
import {
  getRegisterCaptcha,
  getRegisterConfig,
  registerUser,
  type RegisterConfig,
  type RegisterPayload,
} from '@/api/user';
import { PASSWORD_MAX_BYTES, validateNewPassword } from '@/utils/password';
import { BladeBusinessError } from '@/axios';

const router = useRouter();
const formRef = ref<FormInstance>();
const config = ref<RegisterConfig | null>(null);
const form = ref<RegisterPayload>({
  tenantId: '',
  account: '',
  name: '',
  password: '',
  confirmPassword: '',
  captchaKey: '',
  captchaCode: '',
});
const loading = ref(false);
const submitting = ref(false);
const captchaLoading = ref(false);
const captchaImage = ref('');
const errorMessage = ref('');
let active = true;
let captchaVersion = 0;

const rules = computed<FormRules>(() => ({
  tenantId: [
    { required: true, pattern: /^[0-9]{6,12}$/, message: '请输入6至12位租户编号', trigger: 'blur' },
  ],
  account: [
    {
      validator: (_rule, value: string, callback) => {
        const settings = config.value;
        const valid =
          settings &&
          /^[A-Za-z0-9._-]{4,32}$/.test(value) &&
          value.length >= settings.accountMinLength &&
          value.length <= settings.accountMaxLength;
        callback(
          valid
            ? undefined
            : new Error(
                `账号须为${settings?.accountMinLength || 4}至${
                  settings?.accountMaxLength || 32
                }位字母、数字、点、下划线或短横线`
              )
        );
      },
      trigger: 'blur',
    },
  ],
  name: [{ max: 32, message: '昵称不能超过32位', trigger: 'blur' }],
  password: [
    {
      validator: (_rule, value: string, callback) => {
        const settings = config.value;
        const message = validateNewPassword(
          value,
          form.value.account,
          Math.max(8, settings?.passwordMinLength || 8),
          Math.min(64, settings?.passwordMaxLength || 64),
          settings?.passwordMaxBytes || PASSWORD_MAX_BYTES
        );
        callback(message ? new Error(message) : undefined);
      },
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    {
      validator: (_rule, value: string, callback) => {
        callback(
          value && value === form.value.password ? undefined : new Error('两次输入的密码不一致')
        );
      },
      trigger: 'blur',
    },
  ],
  captchaCode: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
}));

const clearSensitiveInputs = () => {
  form.value.password = '';
  form.value.confirmPassword = '';
  form.value.captchaCode = '';
};

const loadCaptcha = async () => {
  if (captchaLoading.value || !config.value?.enabled) return;
  const version = ++captchaVersion;
  captchaLoading.value = true;
  form.value.captchaKey = '';
  form.value.captchaCode = '';
  captchaImage.value = '';
  try {
    const response = await getRegisterCaptcha();
    if (!active || version !== captchaVersion) return;
    const value = response.data.data;
    if (
      !value?.key ||
      !/^data:image\/(png|jpeg|gif);base64,[A-Za-z0-9+/=]+$/.test(value.image || '')
    ) {
      throw new Error('验证码响应不完整，请重新获取');
    }
    form.value.captchaKey = value.key;
    captchaImage.value = value.image;
  } catch (error) {
    if (active && version === captchaVersion)
      errorMessage.value = error instanceof Error ? error.message : '验证码加载失败，请重试';
  } finally {
    if (active && version === captchaVersion) captchaLoading.value = false;
  }
};

const loadConfig = async () => {
  if (loading.value || submitting.value) return;
  loading.value = true;
  config.value = null;
  errorMessage.value = '';
  clearSensitiveInputs();
  try {
    const response = await getRegisterConfig();
    if (!active) return;
    const value = response.data.data;
    if (
      !value ||
      typeof value.enabled !== 'boolean' ||
      typeof value.captchaEnabled !== 'boolean' ||
      typeof value.defaultTenantId !== 'string' ||
      ![
        value.accountMinLength,
        value.accountMaxLength,
        value.passwordMinLength,
        value.passwordMaxLength,
      ].every(Number.isInteger) ||
      value.accountMinLength < 4 ||
      value.accountMaxLength > 32 ||
      value.accountMinLength > value.accountMaxLength ||
      value.passwordMinLength < 8 ||
      value.passwordMaxLength > 64 ||
      value.passwordMinLength > value.passwordMaxLength ||
      (value.enabled && !value.captchaEnabled) ||
      (value.passwordMaxBytes !== undefined &&
        (!Number.isInteger(value.passwordMaxBytes) || value.passwordMaxBytes < 1))
    )
      throw new Error('注册配置不完整，请稍后重新加载');
    config.value = value;
    if (!form.value.tenantId) form.value.tenantId = value.defaultTenantId;
    if (value.enabled) await loadCaptcha();
  } catch (error) {
    if (active)
      errorMessage.value = error instanceof Error ? error.message : '注册配置加载失败，请重试';
  } finally {
    if (active) loading.value = false;
  }
};

const submitRegister = async () => {
  if (
    submitting.value ||
    loading.value ||
    captchaLoading.value ||
    !config.value?.enabled ||
    !form.value.captchaKey
  )
    return;
  submitting.value = true;
  try {
    if (!(await formRef.value?.validate().catch(() => false))) return;
    errorMessage.value = '';
    const response = await registerUser({ ...form.value, name: form.value.name.trim() });
    if (!active) return;
    if (response.data.success !== true || response.data.data?.nextAction !== 'LOGIN') {
      throw new Error('注册结果无法确认，请重新检查后再登录');
    }
    clearSensitiveInputs();
    form.value.captchaKey = '';
    captchaImage.value = '';
    await router.replace({ path: '/auth/login', query: { registered: '1' } });
  } catch (error) {
    if (!active) return;
    clearSensitiveInputs();
    errorMessage.value = error instanceof Error ? error.message : '注册未完成，请重试';
    if (error instanceof BladeBusinessError && error.code === 48301) config.value.enabled = false;
    await loadCaptcha();
  } finally {
    if (active) submitting.value = false;
  }
};

const restorePage = (event: PageTransitionEvent) => {
  if (event.persisted) {
    submitting.value = false;
    loading.value = false;
    captchaLoading.value = false;
    void loadConfig();
  }
};
onMounted(() => {
  window.addEventListener('pageshow', restorePage);
  window.addEventListener('pagehide', clearSensitiveInputs);
  void loadConfig();
});
onBeforeUnmount(() => {
  active = false;
  captchaVersion += 1;
  clearSensitiveInputs();
  form.value.captchaKey = '';
  captchaImage.value = '';
  window.removeEventListener('pageshow', restorePage);
  window.removeEventListener('pagehide', clearSensitiveInputs);
});
</script>

<style scoped>
.login-form {
  margin-top: var(--saber-space-5);
}
.captcha-row {
  display: flex;
  gap: var(--saber-space-3);
  width: 100%;
}
.captcha-row .el-input {
  min-width: 0;
  flex: 1;
}
.captcha-button {
  flex: 0 0 130px;
  height: 48px;
  padding: 0;
  border: 1px solid var(--saber-border);
  border-radius: var(--saber-radius-md);
  background: var(--saber-surface);
  color: var(--saber-text-secondary);
  cursor: pointer;
  overflow: hidden;
}
.captcha-button img {
  display: block;
  width: 130px;
  height: 48px;
}
.auth-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--saber-space-3);
  margin-top: var(--saber-space-4);
}
.auth-links .el-button {
  margin-left: 0;
}
</style>
