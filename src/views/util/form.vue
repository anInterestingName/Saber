<template>
  <basic-container>
    <h3>表单例子</h3>
    <avue-form :option="option"
               v-model="form"></avue-form>
  </basic-container>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

// 表单数据实体
interface DemoForm {
  username?: string;
  password?: string;
  date?: string;
  textarea?: string;
}

// 表单模型
const form = ref<DemoForm>({});

// 表单配置
const option = reactive({
  labelWidth: 110,
  column: [
    {
      label: '用户名',
      prop: 'username',
      row: true,
    },
    {
      label: '密码',
      prop: 'password',
      type: 'password',
      row: true,
    },
    {
      label: '再次输入密码',
      prop: 'password',
      type: 'newpassword',
      row: true,
    },
    {
      label: '申请日期',
      prop: 'date',
      type: 'date',
      row: true,
    },
    {
      label: '个性签名',
      prop: 'textarea',
      type: 'textarea',
      minRows: 8,
      row: true,
    },
  ],
});
</script>

<style>
</style>
