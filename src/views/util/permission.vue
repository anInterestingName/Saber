<template>
  <div>
    <basic-container>
      <h3>表格权限控制</h3>
      <avue-crud ref="crud"
                 :permission="permission"
                 :option="option"
                 :data="data">
        <template #expand="scope">
          {{scope}}
        </template>
      </avue-crud>
    </basic-container>
    <basic-container>
      权限开关
      <el-switch :active-value="false"
                 :inactive-value="true"
                 v-model="text"
                 active-color="#13ce66"
                 inactive-color="#ff4949">
      </el-switch>
      <p> 具体参考<a href="https://avuex.avue.top/#/doc/crud-permission">https://avuex.avue.top/#/doc/crud-permission</a>
      </p>
    </basic-container>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';

// 数据实体
interface DemoRow {
  id: number;
  name: string;
  sex: number;
}

// 权限开关与按钮权限映射
const text = ref(false);
const permission = ref<Record<string, boolean>>({});

// 表格配置
const option = reactive({
  expand: true,
  column: [
    {
      label: '姓名',
      prop: 'name',
    },
    {
      label: '年龄',
      prop: 'sex',
    },
  ],
});

// 表格数据
const data = ref<DemoRow[]>([
  {
    id: 1,
    name: '张三',
    sex: 12,
  },
  {
    id: 2,
    name: '李四',
    sex: 20,
  },
]);

// 开关切换时同步增删按钮的权限
watch(text, () => {
  if (text.value === true) {
    permission.value = {
      delBtn: false,
      addBtn: false,
    };
  } else {
    permission.value = {
      delBtn: true,
      addBtn: true,
    };
  }
});
</script>

<style>
</style>
