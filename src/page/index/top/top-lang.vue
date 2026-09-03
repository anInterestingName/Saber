<template>
  <el-dropdown class="language-switch" trigger="click" @command="handleSetLanguage">
    <button v-if="showLabel" class="language-switch__trigger" type="button">
      <i class="icon-zhongyingwen"></i>
      <span>{{ languageLabel }}</span>
      <el-icon><ArrowDown /></el-icon>
    </button>
    <i v-else class="icon-zhongyingwen"></i>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item :disabled="language === 'zh-cn'" command="zh-cn">中文</el-dropdown-item>
        <el-dropdown-item :disabled="language === 'en'" command="en">English</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script>
import { ArrowDown } from '@element-plus/icons-vue';
import { mapGetters } from 'vuex';
export default {
  name: 'top-lang',
  components: {
    ArrowDown,
  },
  data() {
    return {};
  },
  created() {},
  mounted() {},
  computed: {
    ...mapGetters(['language', 'tag']),
    languageLabel() {
      return this.language === 'en' ? 'English' : '简体中文';
    },
  },
  props: {
    showLabel: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    handleSetLanguage(lang) {
      this.$i18n.locale = lang;
      this.$store.commit('SET_LANGUAGE', lang);
      this.$nextTick(() => {
        const tag = this.tag;
        const hasTagTitle = tag && (tag.label || (tag.query && tag.query.name));
        const title = hasTagTitle ? this.$router.$dynamicRouter.generateTitle(tag) : '';
        //根据当前的标签也获取label的值动态设置浏览器标题
        this.$router.$dynamicRouter.setTitle(title);
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.language-switch__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  color: inherit;
  font: inherit;
  background: transparent;
  cursor: pointer;

  .el-icon {
    font-size: 12px;
  }
}
</style>
