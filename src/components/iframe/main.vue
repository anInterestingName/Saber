<template>
  <basic-container>
    <el-alert v-if="!src" title="外链地址不可用，请联系管理员更新为安全地址" type="warning" :closable="false" />
    <iframe v-else :src="src"
            class="iframe"
            ref="iframe" />
  </basic-container>
</template>

<script>
import NProgress from "nprogress"; // progress bar
import "nprogress/nprogress.css"; // progress bar style
import { getSafeExternalUrl } from '@/router/menu';
export default {
  name: "SaberIframe",
  data () {
    return {};
  },
  created () {
    NProgress.configure({ showSpinner: false });
  },
  mounted () {
    this.load();
  },
  watch: {
    $route: function () {
      this.load();
    }
  },
  computed: {
    src () {
      return typeof this.$route.query.url === 'string' ? getSafeExternalUrl(this.$route.query.url) : null;
    }
  },
  methods: {
    // 显示等待框
    show () {
      NProgress.start();
    },
    // 隐藏等待狂
    hide () {
      NProgress.done();
    },
    // 加载组件
    load () {
      this.show();
      //超时3s自动隐藏等待狂，加强用户体验
      let time = 3;
      const timeFunc = setInterval(() => {
        time--;
        if (time == 0) {
          this.hide();
          clearInterval(timeFunc);
        }
      }, 1000);
      this.iframeInit();
    },
    //iframe窗口初始化
    iframeInit () {
      const iframe = this.$refs.iframe;
      const clientHeight = document.documentElement.clientHeight - 150;
      if (!iframe) return;
      iframe.style.height = `${clientHeight}px`;
      if (iframe.attachEvent) {
        iframe.attachEvent("onload", () => {
          this.hide();
        });
      } else {
        iframe.onload = () => {
          this.hide();
        };
      }
    }
  }
};
</script>

<style lang="scss">
.iframe {
  width: 100%;
  height: 100%;
  border: 0;
  overflow: hidden;
  box-sizing: border-box;
}
</style>
