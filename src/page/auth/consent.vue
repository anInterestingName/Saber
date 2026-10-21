<template>
  <auth-layout variant="card">
    <header class="auth-form-header consent-heading">
      <span class="consent-eyebrow">{{ t('auth.consentLead') }}</span>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </header>
    <el-skeleton v-if="loading" :rows="5" animated :aria-label="t('auth.consentDescription')" />
    <template v-else-if="context">
      <el-alert
        v-if="reviewChanged"
        :title="t('auth.permissionsChanged')"
        type="warning"
        :closable="false"
        show-icon
      />
      <section class="consent-account" :aria-label="t('auth.currentAccount')">
        <span class="consent-avatar" aria-hidden="true">{{ accountInitial }}</span>
        <div class="consent-identity">
          <strong>{{ context.username }}</strong>
          <span>{{ t('auth.currentAccount') }}</span>
        </div>
      </section>
      <section class="consent-request" :aria-label="t('auth.requestedPermissions')">
        <div class="consent-application">
          <span class="consent-application__icon" aria-hidden="true"
            ><el-icon><Connection /></el-icon
          ></span>
          <div class="consent-identity">
            <strong>{{ applicationName }}</strong>
            <span>{{ t('auth.requestedPermissions') }}</span>
          </div>
        </div>
        <ul class="consent-scopes">
          <li v-for="scope in context.scopes" :key="scope.code">
            <el-icon aria-hidden="true">
              <User v-if="scope.code === 'openid'" />
              <Document v-else-if="scope.code === 'profile'" />
              <Connection v-else />
            </el-icon>
            <div>
              <strong>{{
                hasDescription(scope) ? scope.description : t('auth.unspecifiedPermission')
              }}</strong>
              <span v-if="!hasDescription(scope)">{{ t('auth.unspecifiedDescription') }}</span>
            </div>
          </li>
        </ul>
      </section>
      <el-alert
        v-if="hasUnspecifiedPermissions"
        :title="t('auth.unspecifiedWarning')"
        type="warning"
        :closable="false"
        show-icon
      />
      <details class="consent-identifiers">
        <summary>{{ t('auth.permissionIdentifiers') }}</summary>
        <ul>
          <li v-for="scope in context.scopes" :key="scope.code">
            <code>{{ scope.code }}</code>
          </li>
        </ul>
      </details>
      <p class="consent-policy">{{ t('auth.consentPolicy') }}</p>
      <form
        ref="formRef"
        action="/auth-api/oauth2/authorize"
        method="post"
        @submit.prevent="submitConsent('approve')"
      >
        <input type="hidden" name="client_id" :value="context.clientId" />
        <input type="hidden" name="state" :value="state" />
        <input type="hidden" name="decision" :value="decision" />
        <input type="hidden" :name="context.csrf.parameterName" :value="context.csrf.token" />
        <template v-if="decision === 'approve'">
          <template v-for="scope in context.scopes" :key="scope.code">
            <input v-if="!scope.autoApproved" type="hidden" name="scope" :value="scope.code" />
          </template>
        </template>
        <div class="consent-actions">
          <el-button
            type="primary"
            size="large"
            native-type="submit"
            :loading="busy && decision === 'approve'"
            :disabled="busy"
            >{{ t('auth.approve') }}</el-button
          >
          <el-button
            size="large"
            :loading="busy && decision === 'deny'"
            :disabled="busy"
            @click="submitConsent('deny')"
            >{{ t('auth.deny') }}</el-button
          >
        </div>
      </form>
    </template>
    <div v-else class="consent-empty" aria-live="polite">
      <el-icon class="consent-empty__icon" aria-hidden="true"><Warning /></el-icon>
      <el-button
        type="primary"
        size="large"
        @click="failure === 'expired' ? startBffLogin() : loadContext()"
      >
        {{ t(failure === 'expired' ? 'auth.restart' : 'auth.retry') }}
      </el-button>
    </div>
  </auth-layout>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Connection, Document, User, Warning } from '@element-plus/icons-vue';
import AuthLayout from '@/components/auth-layout/main.vue';
import { getConsentContext, startBffLogin } from '@/api/authorization';
import type { ConsentContext } from '@/types/auth';
import { BladeBusinessError } from '@/axios';
import { clearLoginAttempt } from '@/utils/auth';

type ConsentScope = ConsentContext['scopes'][number];
const route = useRoute();
const { t } = useI18n();
const getClientId = () => (typeof route.query.client_id === 'string' ? route.query.client_id : '');
const getState = () => (typeof route.query.state === 'string' ? route.query.state : '');
const state = ref(getState());
let contextVersion = 0;
const context = ref<ConsentContext | null>(null);
const formRef = ref<HTMLFormElement>();
const decision = ref<'approve' | 'deny'>('approve');
const loading = ref(true);
const busy = ref(false);
const failure = ref<'expired' | 'unavailable'>('unavailable');
const reviewChanged = ref(false);
const applicationName = computed(() => context.value?.clientName.trim() || t('auth.application'));
const accountInitial = computed(() => Array.from(context.value?.username || '')[0]?.toUpperCase());
const hasDescription = (scope: ConsentScope) =>
  !!scope.description.trim() && scope.description.trim() !== scope.code;
const hasUnspecifiedPermissions = computed(
  () => context.value?.scopes.some(scope => !hasDescription(scope)) || false
);
const title = computed(() => {
  if (context.value || loading.value)
    return t('auth.consentTitle', { application: applicationName.value });
  return t(
    failure.value === 'expired' ? 'auth.consentExpiredTitle' : 'auth.consentUnavailableTitle'
  );
});
const description = computed(() => {
  if (context.value || loading.value) return t('auth.consentDescription');
  return t(
    failure.value === 'expired'
      ? 'auth.consentExpiredDescription'
      : 'auth.consentUnavailableDescription'
  );
});

const loadContext = async () => {
  if (busy.value) return;
  const version = ++contextVersion;
  const clientId = getClientId();
  state.value = getState();
  loading.value = true;
  reviewChanged.value = false;
  context.value = null;
  decision.value = 'approve';
  try {
    if (!clientId || !state.value) {
      failure.value = 'expired';
      return;
    }
    const result = await getConsentContext(clientId, state.value);
    if (version === contextVersion) {
      context.value = result.data;
      clearLoginAttempt();
    }
  } catch (error) {
    if (version === contextVersion) {
      const code =
        error instanceof BladeBusinessError ? (error.status >= 400 ? error.status : error.code) : 0;
      failure.value = [400, 401, 403].includes(code) ? 'expired' : 'unavailable';
    }
  } finally {
    if (version === contextVersion) loading.value = false;
  }
};

// 同意前核对用户实际看到的身份、应用和权限内容，不因显示层改版扩大 scope。
const reviewSignature = (value: ConsentContext) =>
  JSON.stringify({
    clientId: value.clientId,
    clientName: value.clientName,
    username: value.username,
    scopes: value.scopes
      .map(({ code, description, autoApproved }) => ({ code, description, autoApproved }))
      .sort((left, right) => left.code.localeCompare(right.code)),
  });

const submitConsent = async (value: 'approve' | 'deny') => {
  if (busy.value || loading.value || !context.value) return;
  const version = contextVersion;
  const reviewed = reviewSignature(context.value);
  busy.value = true;
  decision.value = value;
  try {
    const result = await getConsentContext(getClientId(), state.value);
    if (version !== contextVersion) return;
    context.value = result.data;
    if (value === 'approve' && reviewed !== reviewSignature(result.data)) {
      busy.value = false;
      reviewChanged.value = true;
      return;
    }
    await nextTick();
    if (version !== contextVersion) return;
    if (!formRef.value) throw new Error('授权表单未就绪');
    HTMLFormElement.prototype.submit.call(formRef.value);
  } catch (error) {
    if (version !== contextVersion) return;
    busy.value = false;
    context.value = null;
    const code =
      error instanceof BladeBusinessError ? (error.status >= 400 ? error.status : error.code) : 0;
    failure.value = [400, 401, 403].includes(code) ? 'expired' : 'unavailable';
  }
};

const restorePage = (event: PageTransitionEvent) => {
  if (event.persisted) {
    busy.value = false;
    void loadContext();
  }
};
onMounted(() => {
  window.addEventListener('pageshow', restorePage);
});
watch(
  () => [route.query.client_id, route.query.state],
  () => {
    busy.value = false;
    void loadContext();
  },
  { immediate: true }
);
onBeforeUnmount(() => {
  contextVersion += 1;
  context.value = null;
  window.removeEventListener('pageshow', restorePage);
});
</script>

<style scoped>
.consent-heading h1 {
  margin-top: var(--saber-space-2);
  font-size: 26px;
  font-weight: 500;
  overflow-wrap: anywhere;
}
.consent-eyebrow,
.consent-identity > span {
  color: var(--auth-muted);
  font-size: 12px;
}
.consent-account,
.consent-application {
  display: flex;
  align-items: center;
  gap: var(--saber-space-3);
}
.consent-account {
  margin-top: var(--saber-space-4);
  padding: var(--saber-space-3) var(--saber-space-4);
  border-radius: var(--saber-radius-surface);
  background: var(--auth-field-muted);
}
.consent-avatar,
.consent-application__icon {
  display: flex;
  width: 38px;
  height: 38px;
  flex: none;
  align-items: center;
  justify-content: center;
  color: var(--auth-accent);
}
.consent-avatar {
  border-radius: var(--saber-radius-round);
  background: var(--auth-panel);
}
.consent-application__icon {
  border-radius: var(--saber-radius-surface);
  background: var(--auth-field-muted);
  font-size: 20px;
}
.consent-identity {
  min-width: 0;
  overflow-wrap: anywhere;
}
.consent-identity > strong,
.consent-identity > span {
  display: block;
}
.consent-identity strong,
.consent-scopes strong {
  font-weight: 500;
}
.consent-request {
  margin-top: var(--saber-space-6);
}
.consent-application {
  margin-bottom: var(--saber-space-3);
}
.consent-scopes {
  margin: 0;
  padding: 0;
  list-style: none;
}
.consent-scopes li {
  display: flex;
  align-items: flex-start;
  gap: var(--saber-space-3);
  padding: var(--saber-space-4) 0;
  border-top: 1px solid var(--auth-border);
  overflow-wrap: anywhere;
}
.consent-scopes li > .el-icon {
  flex: none;
  margin-top: 3px;
  color: var(--auth-muted);
  font-size: 18px;
}
.consent-scopes strong,
.consent-scopes span {
  display: block;
}
.consent-scopes span {
  margin-top: var(--saber-space-1);
  color: var(--auth-muted);
  font-size: 12px;
  line-height: 1.6;
}
.consent-identifiers {
  margin-top: var(--saber-space-3);
  color: var(--auth-muted);
  font-size: 12px;
}
.consent-identifiers summary {
  min-height: 32px;
  padding: var(--saber-space-2) 0;
  cursor: pointer;
}
.consent-identifiers ul {
  margin: var(--saber-space-2) 0;
  padding-left: var(--saber-space-5);
  overflow-wrap: anywhere;
}
.consent-policy {
  margin: var(--saber-space-4) 0 0;
  color: var(--auth-muted);
  font-size: 12px;
  line-height: 1.7;
}
.consent-actions {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
  gap: var(--saber-space-3);
  margin-top: var(--saber-space-6);
}
.consent-actions .el-button {
  min-width: 0;
  height: auto;
  min-height: 44px;
  margin: 0;
  padding: var(--saber-space-3);
  white-space: normal;
}
.consent-empty {
  display: grid;
  gap: var(--saber-space-6);
  text-align: center;
}
.consent-empty__icon {
  margin: auto;
  color: var(--auth-accent);
  font-size: 28px;
}
@media (max-width: 520px) {
  .consent-actions {
    grid-template-columns: minmax(0, 1fr);
  }
  .consent-identifiers summary {
    min-height: 44px;
  }
}
</style>
