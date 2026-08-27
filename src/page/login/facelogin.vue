<template>
  <div class="face-login">
    <basic-video ref="video" :width="320"> </basic-video>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import basicVideo from '@/components/basic-video/main.vue';
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
    ...mapGetters(['tagWel']),
  },
  methods: {
    handleLogin() {
      this.$store.dispatch('LoginByUsername', this.loginForm).then(() => {
        this.$router.push(this.tagWel);
      });
    },
  },
};
</script>

<style></style>
