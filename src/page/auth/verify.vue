<template>
  <auth-layout variant="card">
    <section class="verify-state" aria-live="polite" :aria-busy="pending">
      <div class="verify-state__icon" aria-hidden="true">
        <el-icon :class="{ 'is-loading': pending }">
          <Loading v-if="pending" />
          <User v-else-if="view === 'anonymous'" />
          <Warning v-else />
        </el-icon>
      </div>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
      <div v-if="!pending" class="verify-actions">
        <el-button
          type="primary"
          size="large"
          @click="view === 'unavailable' ? initialize() : startBffLogin()"
        >
          {{ t(view === 'unavailable' ? 'auth.retry' : 'auth.restart') }}
        </el-button>
        <el-button v-if="view === 'unavailable'" size="large" @click="startBffLogin()">
          {{ t('auth.restart') }}
        </el-button>
      </div>
    </section>
  </auth-layout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Loading, User, Warning } from '@element-plus/icons-vue';
import AuthLayout from '@/components/auth-layout/main.vue';
import { startBffLogin } from '@/api/authorization';
import { useAuthSession } from '@/composables/useAuthSession';
import { canAutomaticallyStartLogin, clearLoginAttempt, consumeReturnPath } from '@/utils/auth';
import { getRequestSessionVersion, refreshBffCsrf } from '@/axios';

type VerifyView = 'loading' | 'anonymous' | 'unavailable' | 'authorization';
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const auth = useAuthSession();
const view = ref<VerifyView>(route.query.error === 'authorization' ? 'authorization' : 'loading');
const pending = ref(view.value === 'loading');
let active = true;
let initializing = false;
const title = computed(() => {
  if (pending.value) return t('auth.enteringTitle');
  if (view.value === 'anonymous') return t('auth.loginTitle');
  return t(
    view.value === 'authorization'
      ? 'auth.authorizationFailedTitle'
      : 'auth.enteringUnavailableTitle'
  );
});
const description = computed(() => {
  if (pending.value) return t('auth.enteringDescription');
  if (view.value === 'anonymous') return t('auth.loginIncompleteDescription');
  return t(
    view.value === 'authorization'
      ? 'auth.authorizationFailedDescription'
      : 'auth.enteringUnavailableDescription'
  );
});

const initialize = async () => {
  if (initializing) return;
  initializing = true;
  let navigating = false;
  pending.value = true;
  view.value = 'loading';
  try {
    const ready = await auth.ensureReady();
    if (!active) return;
    if (ready) {
      const version = getRequestSessionVersion();
      await refreshBffCsrf();
      if (!active || version !== getRequestSessionVersion() || auth.status.value !== 'ready')
        return;
      clearLoginAttempt();
      await router.replace(consumeReturnPath());
    } else if (auth.status.value === 'anonymous') {
      view.value = 'anonymous';
      if (canAutomaticallyStartLogin()) {
        startBffLogin();
        navigating = true;
      }
    } else {
      view.value = 'unavailable';
    }
  } catch {
    if (active) view.value = 'unavailable';
  } finally {
    initializing = false;
    if (active && !navigating) pending.value = false;
  }
};

onMounted(() => {
  if (view.value !== 'authorization') void initialize();
});
onBeforeUnmount(() => {
  active = false;
});
</script>

<style scoped>
.verify-state {
  padding: var(--saber-space-5) 0;
  text-align: center;
}
.verify-state__icon {
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
.verify-state h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 500;
}
.verify-state p {
  margin: var(--saber-space-4) 0 var(--saber-space-6);
  color: var(--auth-muted);
  line-height: 1.7;
}
.verify-actions {
  display: grid;
  gap: var(--saber-space-3);
}
.verify-actions .el-button {
  width: 100%;
  margin-left: 0;
}
</style>
