<template>
  <div class="third-login">
    <div class="third-login__divider">
      <span>{{ $t('login.thirdLogin') }}</span>
    </div>
    <div class="third-login__actions">
      <el-tooltip :content="$t('login.qq')" placement="bottom">
        <button type="button" aria-label="QQ" @click="handleClick('qq')">
          <i class="iconfont icon-QQ third-login__icon--qq"></i>
        </button>
      </el-tooltip>
      <el-tooltip :content="$t('login.wechat')" placement="bottom">
        <button type="button" :aria-label="$t('login.wechat')" @click="handleClick('wechat_open')">
          <i class="iconfont icon-weixinicon2x third-login__icon--wechat"></i>
        </button>
      </el-tooltip>
      <el-tooltip content="GitHub" placement="bottom">
        <button type="button" aria-label="GitHub" @click="handleClick('github')">
          <i class="iconfont icongithub third-login__icon--github"></i>
        </button>
      </el-tooltip>
      <el-tooltip :content="$t('login.gitee')" placement="bottom">
        <button type="button" :aria-label="$t('login.gitee')" @click="handleClick('gitee')">
          <i class="iconfont icongitee2 third-login__icon--gitee"></i>
        </button>
      </el-tooltip>
    </div>
  </div>
</template>

<script>
import website from '@/config/website';

export default {
  name: 'thirdLogin',
  methods: {
    handleClick(source) {
      window.location.href = `${website.authUrl}/${source}`;
    },
  },
};
</script>
