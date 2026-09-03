<template>
  <div class="permission-demo">
    <basic-container class="permission-demo__controls">
      <div class="permission-demo__switch-row">
        <span>显示操作按钮</span>
        <el-switch v-model="actionsEnabled" aria-label="显示操作按钮" />
        <el-tag :type="actionsEnabled ? 'success' : 'info'" effect="plain">
          {{ actionsEnabled ? '已显示' : '已隐藏' }}
        </el-tag>
      </div>
    </basic-container>

    <list-panel title="权限控制示例">
      <template v-if="actionsEnabled" #actions>
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增</el-button>
      </template>

      <el-table :data="rows" row-key="id">
        <el-table-column prop="name" label="姓名" min-width="180" />
        <el-table-column prop="age" label="年龄" width="100" align="center" />
        <el-table-column v-if="actionsEnabled" label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button type="danger" link :icon="Delete" @click="handleDelete(row as DemoRow)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </list-panel>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Delete, Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import ListPanel from '@/components/list-panel/main.vue';

interface DemoRow {
  id: number;
  name: string;
  age: number;
}

const actionsEnabled = ref(true);
const rows = ref<DemoRow[]>([
  { id: 1, name: '张三', age: 28 },
  { id: 2, name: '李四', age: 32 },
]);

const handleAdd = () => ElMessage.info('本示例不创建业务数据');
const handleDelete = (row: DemoRow) =>
  ElMessage.info(`本示例不会删除“${row.name}”或修改任何业务数据`);
</script>

<style scoped lang="scss">
.permission-demo,
.permission-demo__controls {
  min-width: 0;
}

.permission-demo__switch-row {
  display: flex;
  min-height: 32px;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--saber-text-primary);
}
</style>
