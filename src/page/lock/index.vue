<template>
  <auth-layout>
    <div class="auth-form-header auth-form-header--lock">
      <div class="lock-avatar">
        <el-icon><UserFilled /></el-icon>
      </div>
      <span class="lock-user">{{ userInfo.userName }}</span>
      <h1>{{ $t('login.locked') }}</h1>
      <p>{{ $t('login.unlockHint') }}</p>
    </div>

    <el-form
      class="login-form lock-form"
      :class="{ 'is-error': passwdError, 'is-leaving': pass }"
      @submit.prevent="handleLogin"
    >
      <el-form-item>
        <el-input
          v-model="passwd"
          type="password"
          show-password
          autocomplete="current-password"
          :placeholder="$t('login.password')"
        >
          <template #prefix>
            <el-icon><Lock /></el-icon>
          </template>
        </el-input>
      </el-form-item>
      <div class="lock-actions">
        <el-button
          type="primary"
          class="login-submit"
          native-type="submit"
          :loading="busy"
          :disabled="busy"
        >
          <el-icon><Unlock /></el-icon>
          <span>{{ $t('login.unlock') }}</span>
        </el-button>
        <el-button class="lock-exit" :disabled="busy" @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          <span>{{ $t('login.exit') }}</span>
        </el-button>
      </div>
    </el-form>
  </auth-layout>
</template>

<script>
import { Lock, SwitchButton, Unlock, UserFilled } from '@element-plus/icons-vue';
import AuthLayout from '@/components/auth-layout/main.vue';
import { mapActions, mapState } from 'pinia';
import { useCommonStore } from '@/store/common';
import { useTagsStore } from '@/store/tags';
import { useUserStore } from '@/store/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAuthSession } from '@/composables/useAuthSession';
import { getRequestSessionVersion } from '@/axios';

export default {
  name: 'lock',
  components: {
    AuthLayout,
    Lock,
    SwitchButton,
    Unlock,
    UserFilled,
  },
  data() {
    return {
      passwd: '',
      passwdError: false,
      pass: false,
      busy: false,
    };
  },
  computed: {
    ...mapState(useUserStore, {
      userInfo: store => store.userInfo || {},
    }),
    ...mapState(useTagsStore, {
      tag: store => store.currentTag,
    }),
    ...mapState(useCommonStore, {
      lockPasswd: store => store.lockPassword,
    }),
  },
  methods: {
    ...mapActions(useUserStore, ['LogOut']),
    ...mapActions(useCommonStore, ['clearLock']),
    async handleLogout() {
      if (this.busy) return;
      this.busy = true;
      const version = getRequestSessionVersion();
      try {
        await ElMessageBox.confirm('退出当前会话？', '提示', { type: 'warning' });
        if (version !== getRequestSessionVersion()) return;
        await this.LogOut();
        await this.$router.replace({ path: '/auth/login', query: { reason: 'logout' } });
      } catch (error) {
        if (error instanceof Error) ElMessage.warning(this.$t('auth.logoutFailed'));
      } finally {
        this.busy = false;
      }
    },
    async handleLogin() {
      if (this.busy) return;
      this.busy = true;
      try {
        const summary = await useAuthSession().checkSession();
        if (!summary) {
          await this.$router.replace('/auth/login');
          return;
        }
        if (!useUserStore().hasUserInfo) {
          await this.$router.replace('/auth/verify');
          return;
        }
        if (!this.lockPasswd || this.passwd !== this.lockPasswd) {
          this.passwd = '';
          ElMessage.error('解锁密码错误，请重新输入');
          this.passwdError = true;
          return;
        }
        this.pass = true;
        this.clearLock();
        this.passwd = '';
        await this.$router.replace(this.tag?.path || '/');
      } catch {
        ElMessage.warning(this.$t('auth.enteringUnavailableDescription'));
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>
