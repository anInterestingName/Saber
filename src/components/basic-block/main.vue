<template>
  <div class="basic-block" :style="styleName">
    <div class="box" :style="boxStyleName">
      <router-link :to="to">
        <span>{{ text }}</span>
        <p v-if="dept">{{ dept }}</p>
        <el-icon class="basic-block__icon"><component :is="icon" /></el-icon>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

interface BasicBlockProps {
  icon: Component;
  background?: string;
  to?: RouteLocationRaw;
  text?: string;
  dept?: string;
  time?: number | string;
  gutter?: number | string;
  color?: string;
  width?: number | string;
  height?: number | string;
}

const props = withDefaults(defineProps<BasicBlockProps>(), {
  to: () => ({ path: '/' }),
  text: '',
  dept: '',
  time: 0,
  gutter: 5,
  color: '',
  width: 200,
  height: 120,
});

const styleName = computed(() => ({
  animationDelay: `${Number(props.time) / 25}s`,
  width: `${Number(props.width)}px`,
  height: `${Number(props.height)}px`,
  margin: `${Number(props.gutter)}px`,
}));
const boxStyleName = computed(() => ({
  backgroundColor: props.color,
  backgroundImage: props.background ? `url('${props.background}')` : undefined,
}));
</script>

<style lang="scss">
.basic-block {
  box-sizing: border-box;
  opacity: 0;
  color: #fff;
  animation: basic-block-enter 1s forwards;

  .box {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 15px;
    transition: transform 1s;
    background-size: cover;

    &:hover {
      transform: rotateY(360deg);
    }
  }

  a {
    color: #fff;
  }

  span {
    display: block;
    font-size: 16px;
  }

  p {
    width: 80%;
    color: #eee;
    font-size: 10px;
    line-height: 22px;
  }
}

.basic-block__icon {
  position: absolute;
  right: 15px;
  bottom: 15px;
  font-size: 50px;
}

@keyframes basic-block-enter {
  from {
    opacity: 0;
    transform: scale(0);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
