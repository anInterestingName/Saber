<template>
  <div class="face-login">
    <basic-video ref="video" :width="320"> </basic-video>
  </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';
import basicVideo from '@/components/basic-video/main.vue';
import { useTagsStore } from '@/store/tags';
import { useUserStore } from '@/store/user';
export default {
  components: {
    basicVideo,
  },
  data() {
    return {
      timer: null,
      loginForm: {
        username: 'admin',
        password: '123456',
      },
    };
  },
  created() {
    this.timer = setTimeout(() => {
      this.handleLogin();
    }, 6000);
  },
  unmounted() {
    clearTimeout(this.timer);
  },
  computed: {
    ...mapState(useTagsStore, {
      tagWel: store => store.homeTag,
    }),
  },
  methods: {
    ...mapActions(useUserStore, ['LoginByUsername']),
    handleLogin() {
      this.LoginByUsername(this.loginForm).then(() => {
        this.$router.push(this.tagWel);
      });
    },
  },
};
</script>

<style></style>
