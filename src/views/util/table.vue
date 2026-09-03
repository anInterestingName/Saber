<template>
  <list-panel title="表格示例">
    <el-table :data="pageRows" row-key="id">
      <el-table-column type="index" label="#" width="60" align="center" />
      <el-table-column prop="username" label="用户名" min-width="150" show-overflow-tooltip />
      <el-table-column prop="name" label="姓名" min-width="130" show-overflow-tooltip />
      <el-table-column prop="date" label="申请日期" width="130" align="center" />
      <el-table-column prop="signature" label="个性签名" min-width="280" show-overflow-tooltip />
    </el-table>

    <template #footer>
      <list-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[5, 10, 20]"
        :total="rows.length"
        @change="handlePageChange"
      />
    </template>
  </list-panel>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import ListPanel from '@/components/list-panel/main.vue';
import ListPagination from '@/components/list-pagination/main.vue';
import type { PaginationChange } from '@/types/list';

interface TableRow {
  id: number;
  username: string;
  name: string;
  date: string;
  signature: string;
}

const rows = ref<TableRow[]>([
  {
    id: 1,
    username: 'demo01',
    name: '张三',
    date: '2026-08-01',
    signature: '专注于系统配置与日常维护。',
  },
  {
    id: 2,
    username: 'demo02',
    name: '李四',
    date: '2026-08-02',
    signature: '负责基础数据核对与问题跟进。',
  },
  {
    id: 3,
    username: 'demo03',
    name: '王五',
    date: '2026-08-03',
    signature: '这是一条用于验证表格长文本溢出提示与稳定列宽的示例签名。',
  },
  {
    id: 4,
    username: 'demo04',
    name: '赵六',
    date: '2026-08-04',
    signature: '关注权限配置和访问边界。',
  },
  {
    id: 5,
    username: 'demo05',
    name: '钱七',
    date: '2026-08-05',
    signature: '维护开发工具与数据源。',
  },
  {
    id: 6,
    username: 'demo06',
    name: '孙八',
    date: '2026-08-06',
    signature: '整理业务报表和异常记录。',
  },
  {
    id: 7,
    username: 'demo07',
    name: '周九',
    date: '2026-08-07',
    signature: '验证移动端表格和分页布局。',
  },
]);
const currentPage = ref(1);
const pageSize = ref(5);
const pageRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return rows.value.slice(start, start + pageSize.value);
});

const handlePageChange = (page: PaginationChange) => {
  currentPage.value = page.currentPage;
  pageSize.value = page.pageSize;
};
</script>
