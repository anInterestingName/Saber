<template>
  <basic-container>
    <h3>标签</h3>
    <el-button type="primary"
               @click="$router.push('/test/index')">打开一个页面
    </el-button>
    <el-button type="primary"
               @click="$router.$dynamicRouter.closeTag('/test/index')">关闭打开的页面
    </el-button>
    <el-button type="primary"
               @click="$router.$dynamicRouter.closeTag()">关闭本标签
    </el-button>

  </basic-container>
</template>

<script setup lang="ts">
</script>

<style>
</style>
