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
        <el-button type="primary" class="login-submit" native-type="submit">
          <el-icon><Unlock /></el-icon>
          <span>{{ $t('login.unlock') }}</span>
        </el-button>
        <el-button class="lock-exit" @click="handleLogout">
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
    handleLogout() {
      this.$confirm('是否退出系统, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        this.LogOut().then(() => {
          this.$router.push({ path: '/login' });
        });
      });
    },
    handleLogin() {
      if (this.passwd != this.lockPasswd) {
        this.passwd = '';
        this.$message({
          message: '解锁密码错误,请重新输入',
          type: 'error',
        });
        this.passwdError = true;
        setTimeout(() => {
          this.passwdError = false;
        }, 1000);
        return;
      }
      this.pass = true;
      setTimeout(() => {
        this.clearLock();
        this.$router.push({
          path: this.tag?.path || '/',
        });
      }, 1000);
    },
  },
};
</script>
