<template>
  <auth-layout workspace>
    <template v-if="view === 'form'">
      <header class="auth-form-header login-heading">
        <span class="login-eyebrow">{{ t('login.welcome') }}</span>
        <h1>{{ t('auth.loginTitle') }}</h1>
        <p>{{ t('auth.loginDescription') }}</p>
      </header>
      <el-alert v-if="errorKey" :title="t(errorKey)" type="error" :closable="false" show-icon />
      <el-alert
        v-if="registered"
        :title="t('auth.registered')"
        type="success"
        :closable="false"
        show-icon
      />
      <el-alert
        v-else-if="route.query.reason === 'expired'"
        :title="t('auth.expiredDescription')"
        type="info"
        :closable="false"
        show-icon
      />
      <el-form
        ref="formRef"
        class="login-form"
        :model="form"
        :rules="rules"
        action="/auth-api/login"
        method="post"
        label-position="top"
        size="large"
        @submit.prevent="submitLogin"
      >
        <input type="hidden" :name="context.csrf.parameterName" :value="context.csrf.token" />
        <el-form-item v-if="website.tenantMode" :label="t('auth.tenantLabel')" prop="tenantId">
          <el-input
            v-model="form.tenantId"
            name="tenantId"
            autocomplete="organization"
            inputmode="numeric"
            maxlength="12"
            :placeholder="t('auth.tenantPlaceholder')"
            :readonly="busy"
          />
          <span class="login-field-hint">{{ t('auth.tenantHint') }}</span>
        </el-form-item>
        <input v-else type="hidden" name="tenantId" :value="form.tenantId" />
        <el-form-item :label="t('auth.accountLabel')" prop="username">
          <el-input
            v-model="form.username"
            name="username"
            autocomplete="username"
            :placeholder="t('auth.accountPlaceholder')"
            :readonly="busy"
            autofocus
          />
        </el-form-item>
        <el-form-item :label="t('auth.passwordLabel')" prop="password">
          <el-input
            v-model="form.password"
            name="password"
            type="password"
            autocomplete="current-password"
            show-password
            :placeholder="t('auth.passwordPlaceholder')"
            :readonly="busy"
          />
        </el-form-item>
        <el-button
          class="login-submit"
          type="primary"
          native-type="submit"
          :loading="busy"
          :disabled="busy"
          >{{ t('auth.login') }}</el-button
        >
      </el-form>
    </template>
    <section v-else class="login-state" aria-live="polite" :aria-busy="preparing">
      <div class="login-state__icon" aria-hidden="true">
        <el-icon :class="{ 'is-loading': preparing }">
          <Loading v-if="preparing" />
          <SwitchButton v-else-if="view === 'signedOut'" />
          <Warning v-else />
        </el-icon>
      </div>
      <h1>{{ stateTitle }}</h1>
      <p>{{ stateDescription }}</p>
      <el-button
        v-if="!preparing"
        class="login-submit"
        type="primary"
        size="large"
        @click="view === 'unavailable' ? loadContext() : beginLogin()"
        >{{
          view === 'unavailable'
            ? t('auth.retry')
            : registered
            ? t('auth.login')
            : t('auth.restart')
        }}</el-button
      >
    </section>
    <div v-if="registerEnabled && view === 'form'" class="auth-links">
      <span>{{ t('auth.registering') }}</span>
      <el-button link type="primary" :disabled="busy" @click="router.push('/auth/register')">
        {{ t('auth.register') }}
      </el-button>
    </div>
  </auth-layout>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Loading, SwitchButton, Warning } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import AuthLayout from '@/components/auth-layout/main.vue';
import website from '@/config/website';
import { getLoginContext, startBffLogin } from '@/api/authorization';
import { getRegisterConfig } from '@/api/user';
import { useAuthSession } from '@/composables/useAuthSession';
import { canAutomaticallyStartLogin, clearLoginAttempt } from '@/utils/auth';
import type { LoginContext } from '@/types/auth';

type LoginView = 'loading' | 'form' | 'redirecting' | 'unavailable' | 'signedOut' | 'restart';
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const formRef = ref<FormInstance>();
const form = ref({ tenantId: '', username: '', password: '' });
const context = ref<LoginContext | null>(null);
const view = ref<LoginView>('loading');
const busy = ref(false);
const registerEnabled = ref(false);
const transientErrorKey = ref('');
const registered = computed(() => route.query.registered === '1');
const preparing = computed(() => ['loading', 'redirecting'].includes(view.value));
let contextVersion = 0;
let active = true;
const errors = {
  credentials: 'auth.credentialsError',
  csrf: 'auth.csrfError',
  service: 'auth.serviceError',
  authorization: 'auth.authorizationError',
};
const errorKey = computed(
  () => transientErrorKey.value || errors[String(route.query.error) as keyof typeof errors] || ''
);
const stateTitle = computed(() => {
  if (preparing.value) return t('auth.preparingTitle');
  if (view.value === 'signedOut') return t('auth.signedOutTitle');
  if (view.value === 'unavailable') return t('auth.loginUnavailableTitle');
  return t(registered.value ? 'auth.registered' : 'auth.loginIncompleteTitle');
});
const stateDescription = computed(() => {
  if (preparing.value) return t('auth.preparingDescription');
  if (view.value === 'signedOut') return t('auth.signedOutDescription');
  if (view.value === 'unavailable') return t('auth.loginUnavailableDescription');
  return t('auth.loginIncompleteDescription');
});
const rules = computed<FormRules>(() => ({
  tenantId: [
    { required: true, pattern: /^[0-9]{6,12}$/, message: t('auth.tenantRule'), trigger: 'blur' },
  ],
  username: [{ required: true, message: t('auth.accountPlaceholder'), trigger: 'blur' }],
  password: [{ required: true, message: t('auth.passwordPlaceholder'), trigger: 'blur' }],
}));

const beginLogin = () => {
  form.value.password = '';
  view.value = 'redirecting';
  try {
    startBffLogin();
  } catch {
    busy.value = false;
    view.value = 'unavailable';
  }
};

const loadContext = async () => {
  if (busy.value) return;
  const version = ++contextVersion;
  context.value = null;
  form.value.password = '';
  transientErrorKey.value = '';
  if (route.query.reason === 'logout') {
    clearLoginAttempt();
    view.value = 'signedOut';
    return;
  }
  view.value = 'loading';
  try {
    const result = await getLoginContext();
    if (!active || version !== contextVersion) return;
    context.value = result.data;
    if (!form.value.tenantId) form.value.tenantId = result.data.defaultTenantId;
    if (result.data.authorizationPending && !result.data.authenticated) {
      clearLoginAttempt();
      view.value = 'form';
      return;
    }
    // 注册回跳及明确登录失败由用户主动继续，避免再次授权掩盖当前结果。
    if (registered.value || errorKey.value) {
      view.value = 'restart';
      return;
    }
    const auth = useAuthSession();
    const ready = await auth.ensureReady();
    if (!active || version !== contextVersion) return;
    if (ready) {
      clearLoginAttempt();
      await router.replace('/auth/verify');
    } else if (auth.status.value === 'unavailable') {
      view.value = 'unavailable';
    } else if (canAutomaticallyStartLogin()) {
      beginLogin();
    } else {
      view.value = 'restart';
    }
  } catch {
    if (active && version === contextVersion) view.value = 'unavailable';
  }
};

const submitLogin = async () => {
  if (busy.value || view.value !== 'form' || !context.value) return;
  const version = contextVersion;
  let submitted = false;
  busy.value = true;
  transientErrorKey.value = '';
  try {
    if (!(await formRef.value?.validate().catch(() => false))) return;
    const result = await getLoginContext();
    if (!active || version !== contextVersion) return;
    context.value = result.data;
    if (!result.data.authorizationPending || result.data.authenticated) {
      beginLogin();
      return;
    }
    await nextTick();
    if (!active || version !== contextVersion) return;
    const nativeForm = formRef.value?.$el as HTMLFormElement;
    if (!nativeForm) throw new Error('登录表单未就绪');
    HTMLFormElement.prototype.submit.call(nativeForm);
    submitted = true;
  } catch {
    if (active && version === contextVersion) {
      form.value.password = '';
      transientErrorKey.value = 'auth.serviceError';
    }
  } finally {
    if (active && version === contextVersion && view.value === 'form' && !submitted)
      busy.value = false;
  }
};

const clearPassword = () => {
  form.value.password = '';
};
const restorePage = (event: PageTransitionEvent) => {
  if (event.persisted) {
    busy.value = false;
    void loadContext();
  }
};
watch(
  () => [route.query.reason, route.query.error, route.query.registered],
  () => {
    busy.value = false;
    void loadContext();
  }
);
onMounted(() => {
  window.addEventListener('pageshow', restorePage);
  window.addEventListener('pagehide', clearPassword);
  void loadContext();
  void getRegisterConfig()
    .then(response => {
      if (active) registerEnabled.value = response.data.data?.enabled === true;
    })
    .catch(() => {
      registerEnabled.value = false;
    });
});
onBeforeUnmount(() => {
  active = false;
  contextVersion += 1;
  window.removeEventListener('pageshow', restorePage);
  window.removeEventListener('pagehide', clearPassword);
  clearPassword();
  context.value = null;
});
</script>

<style scoped>
.login-heading h1 {
  margin-top: var(--saber-space-2);
  font-size: 30px;
  font-weight: 500;
}
.login-eyebrow,
.login-field-hint {
  color: var(--auth-muted);
  font-size: 13px;
}
.login-field-hint {
  display: block;
  margin-top: var(--saber-space-2);
  line-height: 1.6;
}
.login-form {
  margin-top: var(--saber-space-5);
}
.auth-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--saber-space-2);
  margin-top: var(--saber-space-5);
  color: var(--auth-muted);
}
.auth-links .el-button {
  margin-left: 0;
}
.login-state {
  padding: var(--saber-space-5) 0;
  text-align: center;
}
.login-state__icon {
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--saber-space-5);
  border-radius: var(--saber-radius-round);
  color: var(--auth-accent);
  background: var(--auth-field-muted);
  font-size: 26px;
}
.login-state h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 500;
}
.login-state p {
  margin: var(--saber-space-4) 0 var(--saber-space-6);
  color: var(--auth-muted);
  line-height: 1.7;
}
</style>
