<template>
  <i :class="isFullscreen?'icon-tuichuquanping':'icon-quanping'"
     @click="handleScreen"></i>
</template>
<script>
import { mapActions, mapState } from 'pinia';
import { fullscreenToggle, listenFullscreen } from "utils/util";
import { useCommonStore } from '@/store/common';
export default {
  computed: {
    ...mapState(useCommonStore, ['isFullscreen'])
  },
  mounted () {
    listenFullscreen(this.setScreen);
  },
  methods: {
    ...mapActions(useCommonStore, ['toggleFullscreen']),
    setScreen () {
      this.toggleFullscreen();
    },
    handleScreen () {
      fullscreenToggle();
    },
  }
}
</script>
