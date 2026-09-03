<template>
  <div class="list-pagination">
    <el-pagination
      background
      :current-page="currentPage"
      :page-size="pageSize"
      :page-sizes="pageSizes"
      :total="total"
      :disabled="disabled"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="handleCurrentChange"
      @size-change="handleSizeChange"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue';
import type { PaginationChange } from '@/types/list';

interface ListPaginationProps {
  currentPage: number;
  pageSize: number;
  total: number;
  pageSizes?: number[];
  disabled?: boolean;
}

const props = withDefaults(defineProps<ListPaginationProps>(), {
  pageSizes: () => [10, 20, 30, 50, 100],
  disabled: false,
});

const emit = defineEmits<{
  'update:currentPage': [currentPage: number];
  'update:pageSize': [pageSize: number];
  change: [page: PaginationChange];
}>();

let changingPageSize = false;

const handleCurrentChange = (currentPage: number) => {
  emit('update:currentPage', currentPage);
  if (!changingPageSize) {
    emit('change', { currentPage, pageSize: props.pageSize });
  }
};

const handleSizeChange = (pageSize: number) => {
  changingPageSize = true;
  emit('update:pageSize', pageSize);
  emit('update:currentPage', 1);
  emit('change', { currentPage: 1, pageSize });
  nextTick(() => {
    changingPageSize = false;
  });
};
</script>

<style scoped lang="scss">
.list-pagination {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: flex-end;
  overflow: hidden;

  :deep(.el-pagination) {
    flex-wrap: nowrap;
  }
}

@media (max-width: 767px) {
  .list-pagination {
    justify-content: center;

    :deep(.el-pagination__total),
    :deep(.el-pagination__sizes),
    :deep(.el-pagination__jump) {
      display: none;
    }
  }
}
</style>
