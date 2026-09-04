<template>
  <div class="report-list-page">
    <search-panel
      :model="searchForm"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item label="文件名">
          <el-input v-model="searchForm.name" clearable placeholder="请输入文件名" />
        </el-form-item>
      </el-col>
    </search-panel>

    <list-panel title="报表列表">
      <template #actions>
        <el-button
          type="danger"
          plain
          :icon="Delete"
          :disabled="loading"
          @click="handleBatchDelete"
        >
          删除
        </el-button>
      </template>
      <template #tools>
        <el-tooltip content="刷新" placement="top">
          <el-button circle :icon="Refresh" :loading="loading" aria-label="刷新" @click="refresh" />
        </el-tooltip>
      </template>

      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="data"
        row-key="id"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" fixed="left" width="48" />
        <el-table-column type="index" label="#" fixed="left" width="60" align="center" />
        <el-table-column prop="name" label="文件名" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              :disabled="!row.name || loading"
              @click="handlePreview(row.name)"
            >
              {{ row.name || '-' }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="180" show-overflow-tooltip />
        <el-table-column prop="updateTime" label="更新时间" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" fixed="right" width="200" align="center">
          <template #default="{ row }">
            <div class="report-actions">
              <el-button
                type="primary"
                link
                :icon="Edit"
                :disabled="!row.name || loading"
                @click="handleDesign(row.name)"
              >
                设计
              </el-button>
              <el-button
                type="primary"
                link
                :icon="View"
                :disabled="!row.name || loading"
                @click="handlePreview(row.name)"
              >
                预览
              </el-button>
              <el-button
                type="danger"
                link
                :icon="Delete"
                :disabled="loading"
                @click="handleRowDelete(row as ReportEntity)"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <list-pagination
          v-model:current-page="page.currentPage"
          v-model:page-size="page.pageSize"
          :total="page.total"
          :disabled="loading"
          @change="handlePageChange"
        />
      </template>
    </list-panel>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Delete, Edit, Refresh, View } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox, type TableInstance } from 'element-plus';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import ListPagination from '@/components/list-pagination/main.vue';
import { usePagedList } from '@/composables/usePagedList';
import { useTableSelection } from '@/composables/useTableSelection';
import { getList, remove } from '@/api/report/report';
import website from '@/config/website';
import type { PaginationChange } from '@/types/list';

interface ReportEntity {
  id: string;
  name?: string;
  createTime?: string;
  updateTime?: string;
}

interface ReportQuery {
  name?: string;
}

type ReportListResponse = Awaited<ReturnType<typeof getList>>;
type ReportPage = 'designer' | 'preview';

const createInitialQuery = (): ReportQuery => ({});

const searchForm = ref<ReportQuery>(createInitialQuery());
const tableRef = ref<TableInstance>();

const { data, page, loading, load, search, reset, refresh } = usePagedList<
  ReportEntity,
  ReportQuery,
  ReportListResponse
>({
  fetcher: (current, size, query) => getList(current, size, query),
  resolveResponse: response => ({
    records: response.data.data.records,
    total: response.data.data.total,
  }),
  createInitialQuery,
});
const { selectedRows, ids, handleSelectionChange, clearSelection } =
  useTableSelection<ReportEntity>();

const clearTableSelection = () => {
  clearSelection();
  tableRef.value?.clearSelection();
};

watch(data, clearTableSelection, { flush: 'post' });

const handleSearch = () => {
  void search({ ...searchForm.value });
};

const handleReset = () => {
  searchForm.value = createInitialQuery();
  void reset();
};

const handlePageChange = (nextPage: PaginationChange) => {
  page.value = { ...page.value, ...nextPage };
  void load();
};

const confirmDelete = async (deleteIds: string) => {
  try {
    await ElMessageBox.confirm('确定将选择数据删除?', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await remove(deleteIds);
    clearTableSelection();
    await refresh();
    ElMessage.success('操作成功!');
  } catch {
    // 用户取消或接口失败时保留当前列表和选择状态。
  }
};

const handleRowDelete = (row: ReportEntity) => {
  void confirmDelete(row.id);
};

const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  void confirmDelete(ids.value);
};

const buildReportUrl = (pageName: ReportPage, name: string) => {
  const url = new URL(website.reportUrl, window.location.origin);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/${pageName}`;
  url.searchParams.set('_u', `blade-${name}`);
  return url.toString();
};

const openReport = (pageName: ReportPage, name?: string) => {
  if (!name) return;
  const reportWindow = window.open(buildReportUrl(pageName, name), '_blank', 'noopener,noreferrer');
  if (!reportWindow) ElMessage.warning('报表页面未能打开，请检查浏览器弹窗设置');
};

const handleDesign = (name?: string) => openReport('designer', name);
const handlePreview = (name?: string) => openReport('preview', name);

onMounted(() => {
  void load();
});
</script>

<style scoped lang="scss">
.report-list-page {
  min-width: 0;
}

.report-actions {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  gap: 4px;

  :deep(.el-button) {
    min-width: 52px;
    height: 32px;
    margin-left: 0;
    padding: 4px 6px;
  }
}
</style>
