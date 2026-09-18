<template>
  <div class="nav-user-actions" :class="`nav-user-actions--${placement}`">
    <div class="nav-user-actions__tools">
      <el-tooltip v-if="setting.lock" content="锁屏" :placement="tooltipPlacement">
        <div class="nav-user-actions__tool">
          <top-lock />
        </div>
      </el-tooltip>
      <el-tooltip content="切换语言" :placement="tooltipPlacement">
        <div class="nav-user-actions__tool">
          <top-lang />
        </div>
      </el-tooltip>
      <el-tooltip v-if="setting.debug" content="错误日志" :placement="tooltipPlacement">
        <div class="nav-user-actions__tool">
          <top-logs />
        </div>
      </el-tooltip>
    </div>

    <div class="nav-user-actions__identity">
      <el-dropdown :placement="dropdownPlacement" popper-class="nav-user-actions__dropdown">
        <button type="button" class="nav-user-actions__account">
          <img class="top-bar__img" :src="avatarUrl" alt="" />
          <span class="nav-user-actions__name">{{ displayName }}</span>
          <el-icon class="nav-user-actions__arrow"><ArrowDown /></el-icon>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item>
              <router-link to="/">{{ t('navbar.dashboard') }}</router-link>
            </el-dropdown-item>
            <el-dropdown-item>
              <router-link to="/info/index">{{ t('navbar.userinfo') }}</router-link>
            </el-dropdown-item>
            <el-dropdown-item divided @click="logout">{{ t('navbar.logOut') }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 界面设置统一使用视口右侧悬浮入口 -->
    <top-setting trigger-mode="floating" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { ArrowDown } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';
import { useCommonStore } from '@/store/common';
import { useUserStore } from '@/store/user';
import topLang from './top/top-lang.vue';
import topLock from './top/top-lock.vue';
import topLogs from './top/top-logs.vue';
import topSetting from './setting.vue';

type UserActionsPlacement = 'header' | 'sidebar';

const props = withDefaults(
  defineProps<{
    placement?: UserActionsPlacement;
  }>(),
  {
    placement: 'header',
  }
);

const router = useRouter();
const { t } = useI18n();
const userStore = useUserStore();
const { setting } = storeToRefs(useCommonStore());
const { userInfo } = storeToRefs(userStore);

const displayName = computed(() => userInfo.value?.userName || userInfo.value?.account || '-');
const avatarUrl = computed(() => userInfo.value?.avatar || '/img/logo.png');
const tooltipPlacement = computed(() => (props.placement === 'sidebar' ? 'top' : 'bottom'));
const dropdownPlacement = computed(() =>
  props.placement === 'sidebar' ? 'top-start' : 'bottom-end'
);

const logout = async () => {
  try {
    await ElMessageBox.confirm(t('logoutTip'), t('tip'), {
      confirmButtonText: t('submitText'),
      cancelButtonText: t('cancelText'),
      type: 'warning',
    });
  } catch {
    return;
  }

  await userStore.LogOut();
  await router.push('/login');
};
</script>
