<template>
  <div class="log-page">
    <search-panel
      :model="searchForm"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item label="服务 ID">
          <el-input v-model="searchForm.serviceId" clearable placeholder="请输入服务 ID" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item label="服务 Host">
          <el-input v-model="searchForm.serverHost" clearable placeholder="请输入服务 Host" />
        </el-form-item>
      </el-col>
    </search-panel>

    <list-panel title="接口日志">
      <template #tools>
        <el-tooltip content="刷新" placement="top">
          <el-button circle :icon="Refresh" :loading="loading" aria-label="刷新" @click="refresh" />
        </el-tooltip>
      </template>

      <el-table v-loading="loading" :data="data" row-key="id">
        <el-table-column type="index" label="#" fixed="left" width="60" align="center" />
        <el-table-column prop="serviceId" label="服务 ID" min-width="150" show-overflow-tooltip />
        <el-table-column
          prop="serverHost"
          label="服务 Host"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column prop="serverIp" label="服务 IP" min-width="140" show-overflow-tooltip />
        <el-table-column prop="env" label="软件环境" min-width="110" show-overflow-tooltip />
        <el-table-column prop="title" label="日志名" min-width="180" show-overflow-tooltip />
        <el-table-column prop="method" label="请求方法" min-width="110" show-overflow-tooltip />
        <el-table-column prop="requestUri" label="请求接口" min-width="240" show-overflow-tooltip />
        <el-table-column prop="createTime" label="日志时间" min-width="180" show-overflow-tooltip />
        <el-table-column v-if="canView" label="操作" fixed="right" width="96" align="center">
          <template #default="{ row }">
            <row-actions show-view :disabled="loading" @view="openDetail(row as ApiLogListItem)" />
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

    <detail-drawer
      v-model="drawerVisible"
      title="接口日志详情"
      :loading="detailLoading"
      @close="handleDrawerClose"
    >
      <el-result v-if="detailFailed" status="error" title="日志详情加载失败">
        <template #extra>
          <el-button type="primary" :icon="Refresh" @click="retryDetail">重新加载</el-button>
        </template>
      </el-result>
      <el-descriptions v-else-if="detailData" :column="2" border>
        <el-descriptions-item label="服务 ID">{{
          displayValue(detailData.serviceId)
        }}</el-descriptions-item>
        <el-descriptions-item label="服务 Host">
          {{ displayValue(detailData.serverHost) }}
        </el-descriptions-item>
        <el-descriptions-item label="服务 IP">{{
          displayValue(detailData.serverIp)
        }}</el-descriptions-item>
        <el-descriptions-item label="软件环境">{{
          displayValue(detailData.env)
        }}</el-descriptions-item>
        <el-descriptions-item label="日志名">{{
          displayValue(detailData.title)
        }}</el-descriptions-item>
        <el-descriptions-item label="请求方法">{{
          displayValue(detailData.method)
        }}</el-descriptions-item>
        <el-descriptions-item label="请求接口">{{
          displayValue(detailData.requestUri)
        }}</el-descriptions-item>
        <el-descriptions-item label="日志时间">{{
          displayValue(detailData.createTime)
        }}</el-descriptions-item>
        <el-descriptions-item label="用户代理" :span="2">
          <pre class="log-detail__pre">{{ displayValue(detailData.userAgent) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="请求数据" :span="2">
          <pre class="log-detail__pre">{{ displayValue(detailData.params) }}</pre>
        </el-descriptions-item>
      </el-descriptions>
    </detail-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import ListPagination from '@/components/list-pagination/main.vue';
import RowActions from '@/components/row-actions/main.vue';
import DetailDrawer from '@/components/detail-drawer/main.vue';
import { useCrudPermission } from '@/composables/useCrudPermission';
import { usePagedList } from '@/composables/usePagedList';
import { useRemoteDetail } from '@/composables/useRemoteDetail';
import { getApiList, getApiLogs } from '@/api/logs';
import type { PaginationChange } from '@/types/list';

interface ApiLogListItem {
  id: string;
  serviceId?: string;
  serverHost?: string;
  serverIp?: string;
  env?: string;
  title?: string;
  method?: string;
  requestUri?: string;
  createTime?: string;
}

interface ApiLogEntity extends ApiLogListItem {
  userAgent?: string;
  params?: string;
}

interface LogQuery {
  serviceId?: string;
  serverHost?: string;
}

type ApiLogListResponse = Awaited<ReturnType<typeof getApiList>>;

const createInitialQuery = (): LogQuery => ({});
const toListItem = (entity: ApiLogEntity): ApiLogListItem => ({
  id: entity.id,
  serviceId: entity.serviceId,
  serverHost: entity.serverHost,
  serverIp: entity.serverIp,
  env: entity.env,
  title: entity.title,
  method: entity.method,
  requestUri: entity.requestUri,
  createTime: entity.createTime,
});

const searchForm = ref<LogQuery>(createInitialQuery());
const drawerVisible = ref(false);
const detailId = ref<string>();

const { data, page, loading, load, search, reset, refresh } = usePagedList<
  ApiLogListItem,
  LogQuery,
  ApiLogListResponse
>({
  fetcher: (current, size, query) => getApiList(current, size, query),
  resolveResponse: response => ({
    records: response.data.data.records.map((item: ApiLogEntity) => toListItem(item)),
    total: response.data.data.total,
  }),
  createInitialQuery,
});
const { view: canView } = useCrudPermission('log_api');
const {
  data: detailData,
  loading: detailLoading,
  failed: detailFailed,
  load: loadDetail,
  clear: clearDetail,
} = useRemoteDetail<ApiLogEntity, string>(async id => {
  const response = await getApiLogs(id);
  return response.data.data;
});

const displayValue = (value?: string) => value || '-';

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

const openDetail = (row: ApiLogListItem) => {
  clearDetail();
  detailId.value = row.id;
  drawerVisible.value = true;
  void loadDetail(row.id);
};

const retryDetail = () => {
  if (detailId.value) void loadDetail(detailId.value);
};

const handleDrawerClose = () => {
  clearDetail();
  detailId.value = undefined;
};

onMounted(() => {
  void load();
});
</script>

<style scoped lang="scss">
.log-page {
  min-width: 0;
}

.log-detail__pre {
  max-height: 320px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border-radius: 4px;
  background: var(--saber-surface-muted);
  color: var(--saber-text-secondary);
  font-family: inherit;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

:deep(.el-descriptions__label) {
  width: 112px;
}
</style>
