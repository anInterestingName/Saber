<template>
  <basic-container>
    <h3>存储</h3>
    <el-tag class="title">基本读写删(持久化存储)
    </el-tag>
    <div class="box">
      <el-button type="primary"
                 @click="setItem({name:'username', value:'saber'});">set('username', 'saber')
      </el-button>

      <el-button type="success"
                 @click="getItem({name:'username'});">get('username')
      </el-button>

      <el-button type="danger"
                 @click="delItem({name:'username'});">remove('username')
      </el-button>
    </div>
    <el-tag class="title">设置session(session存储)
    </el-tag>
    <div class="box">
      <el-button type="primary"
                 @click="setItem({name:'username', value:'saber',type:'session'});">set('username', 'saber')
      </el-button>

      <el-button type="success"
                 @click="getItem({name:'username',type:'session'});">get('username')
      </el-button>

      <el-button type="danger"
                 @click="delItem({name:'username',type:'session'});">remove('username')
      </el-button>
    </div>
    <el-tag class="title">获取所有可以获得的数据
    </el-tag>
    <div class="box">
      <el-button type="success"
                 @click="getAll()">getAll(持久化存储)
      </el-button>
      <el-button type="success"
                 @click="getAll({type:'session'})">getAll(session存储)
      </el-button>
      <el-button type="danger"
                 @click="clearAll()">delAll(持久化存储)
      </el-button>
      <el-button type="danger"
                 @click="clearAll({type:'session'})">delAll(session存储)
      </el-button>
    </div>
  </basic-container>

</template>

<script setup lang="ts">
import { setStore, getStore, removeStore, clearStore, getAllStore } from '@/utils/store';
import { ElMessage } from 'element-plus';

defineOptions({ name: 'store' });

// 存储操作参数
interface StoreParams {
  name?: string;
  value?: string;
  type?: string;
}

// 写入数据（持久化 / session）
const setItem = (params: StoreParams = {}) => {
  const { name, value, type } = params;
  setStore({
    name: name,
    content: value,
    type: type,
  });
  ElMessage(`设置数据 ${name} = ${value}`);
};

// 读取指定数据
const getItem = (params: StoreParams = {}) => {
  const { name, type } = params;
  const content = getStore({
    name: name,
    type: type,
  });
  ElMessage(`获取数据 ${name} = ${content}`);
};

// 删除指定数据
const delItem = (params: StoreParams = {}) => {
  const { name, type } = params;
  removeStore({ name, type });
  ElMessage(`删除数据 ${name}`);
};

// 获取全部数据并打印到控制台
const getAll = (params: StoreParams = {}) => {
  const list = getAllStore(params);
  console.log(list);
  ElMessage(`结果已经打印到控制台`);
};

// 清空全部数据
const clearAll = (params: StoreParams = {}) => {
  clearStore(params);
  ElMessage(`清除全部数据完成`);
};
</script>

<style lang="scss">
.title {
  margin-bottom: 10px;
}

.box {
  margin-bottom: 20px;
}
</style>
