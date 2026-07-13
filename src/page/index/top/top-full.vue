<template>
  <i :class="isFullScren?'icon-tuichuquanping':'icon-quanping'"
     @click="handleScreen"></i>
</template>
<script>
import { mapGetters } from "vuex";
import { fullscreenToggle, listenFullscreen } from "utils/util";
export default {
  computed: {
    ...mapGetters(["isFullScren"])
  },
  mounted () {
    listenFullscreen(this.setScreen);
  },
  methods: {
    setScreen () {
      this.$store.commit("SET_FULLSCREN");
    },
    handleScreen () {
      fullscreenToggle();
    },
  }
}
</script>