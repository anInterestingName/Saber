<template>
  <basic-container>
    <h3>请打开浏览器控制台，然后点击下面的按钮</h3>
    <el-button type="danger"
               @click="handleNewError">触发一个错误
    </el-button>
  </basic-container>
</template>

<script setup lang="ts">
// 触发一个未定义变量引用错误
const handleNewError = () => {
  // @ts-expect-error -- 本页功能就是引用未定义变量（TS2304），修掉即破坏演示
  console.log(a); // eslint-disable-line
};
</script>
