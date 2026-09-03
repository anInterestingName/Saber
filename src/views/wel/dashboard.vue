<template>
  <basic-container>
    <div class="dashboard-tiles">
      <basic-block
        v-for="(tile, index) in tiles"
        :key="tile.text"
        :width="tile.width ?? defaultWidth"
        :height="defaultHeight"
        :icon="tile.icon"
        :text="tile.text"
        :time="index + 1"
        :background="tile.background"
        :dept="tile.dept"
        :color="tile.color"
      />
    </div>
  </basic-container>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import {
  Bell,
  Collection,
  Connection,
  DataAnalysis,
  Delete,
  Document,
  Download,
  Files,
  Grid,
  House,
  Key,
  Lock,
  Menu,
  Monitor,
  Operation,
  Platform,
  Promotion,
  Setting,
  Tools,
  User,
} from '@element-plus/icons-vue';

interface DashboardTile {
  text: string;
  icon: Component;
  color: string;
  width?: number;
  background?: string;
  dept?: string;
}

const defaultWidth = 200;
const defaultHeight = 120;
const longDescription = '用于展示可扩展的工作台磁贴内容和响应式布局效果';
const tiles: DashboardTile[] = [
  { text: '开始菜单1', icon: Platform, color: '#d56259', background: '/img/bg/bg3.jpg' },
  { text: '开始菜单2', icon: Monitor, color: '#419ce7', background: '/img/bg/bg2.jpg' },
  { text: '开始菜单3', icon: Delete, color: '#56b69b' },
  { text: '开始菜单4', icon: Tools, color: '#d44858' },
  { text: '开始菜单5', icon: Setting, color: '#3a1f7e' },
  {
    text: '开始菜单6',
    icon: Operation,
    color: '#422829',
    width: 410,
    background: '/img/bg/bg1.jpg',
    dept: longDescription,
  },
  { text: '开始菜单7', icon: User, color: '#613cbd' },
  { text: '开始菜单8', icon: Bell, color: '#da542e' },
  { text: '开始菜单9', icon: Collection, color: '#2e8aef' },
  { text: '开始菜单10', icon: Connection, color: '#3d17b8' },
  { text: '开始菜单11', icon: Document, color: '#e31462' },
  { text: '开始菜单12', icon: Files, color: '#d9532d' },
  {
    text: '开始菜单13',
    icon: Grid,
    color: '#b72147',
    width: 410,
    dept: longDescription,
  },
  { text: '开始菜单14', icon: Key, color: '#18794e' },
  { text: '开始菜单15', icon: DataAnalysis, color: '#0c56bf' },
  { text: '开始菜单16', icon: Menu, color: '#0098a9' },
  {
    text: '开始菜单17',
    icon: Download,
    color: '#209bdf',
    background: '/img/bg/bg2.jpg',
  },
  { text: '开始菜单18', icon: House, color: '#603bbc', background: '/img/bg/bg3.jpg' },
  {
    text: '开始菜单19',
    icon: Promotion,
    color: '#009bad',
    width: 515,
    dept: longDescription,
  },
  {
    text: '开始菜单20',
    icon: Lock,
    color: '#d74e2a',
    width: 515,
    background: '/img/bg/bg4.jpg',
    dept: longDescription,
  },
];
</script>

<style scoped lang="scss">
.dashboard-tiles {
  display: flex;
  width: min(1100px, 100%);
  margin: 0 auto;
  flex-wrap: wrap;
}

@media (max-width: 767px) {
  .dashboard-tiles {
    justify-content: center;
  }

  :deep(.basic-block) {
    max-width: calc(100vw - 64px);
  }
}
</style>
