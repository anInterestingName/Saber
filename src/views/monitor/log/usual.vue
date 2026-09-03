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

    <list-panel title="通用日志">
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
        <el-table-column prop="logLevel" label="日志级别" min-width="110" show-overflow-tooltip />
        <el-table-column prop="logId" label="日志 ID" min-width="180" show-overflow-tooltip />
        <el-table-column prop="requestUri" label="请求接口" min-width="240" show-overflow-tooltip />
        <el-table-column prop="logData" label="日志时间" min-width="180" show-overflow-tooltip />
        <el-table-column v-if="canView" label="操作" fixed="right" width="96" align="center">
          <template #default="{ row }">
            <row-actions
              show-view
              :disabled="loading"
              @view="openDetail(row as UsualLogListItem)"
            />
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
      title="通用日志详情"
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
        <el-descriptions-item label="日志级别">{{
          displayValue(detailData.logLevel)
        }}</el-descriptions-item>
        <el-descriptions-item label="日志 ID">{{
          displayValue(detailData.logId)
        }}</el-descriptions-item>
        <el-descriptions-item label="请求接口">{{
          displayValue(detailData.requestUri)
        }}</el-descriptions-item>
        <el-descriptions-item label="日志时间">{{
          displayValue(detailData.logData)
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
import { getUsualList, getUsualLogs } from '@/api/logs';
import type { PaginationChange } from '@/types/list';

interface UsualLogListItem {
  id: string;
  serviceId?: string;
  serverHost?: string;
  serverIp?: string;
  env?: string;
  logLevel?: string;
  logId?: string;
  requestUri?: string;
  logData?: string;
}

interface UsualLogEntity extends UsualLogListItem {
  userAgent?: string;
  params?: string;
}

interface LogQuery {
  serviceId?: string;
  serverHost?: string;
}

type UsualLogListResponse = Awaited<ReturnType<typeof getUsualList>>;

const createInitialQuery = (): LogQuery => ({});
const toListItem = (entity: UsualLogEntity): UsualLogListItem => ({
  id: entity.id,
  serviceId: entity.serviceId,
  serverHost: entity.serverHost,
  serverIp: entity.serverIp,
  env: entity.env,
  logLevel: entity.logLevel,
  logId: entity.logId,
  requestUri: entity.requestUri,
  logData: entity.logData,
});

const searchForm = ref<LogQuery>(createInitialQuery());
const drawerVisible = ref(false);
const detailId = ref<string>();

const { data, page, loading, load, search, reset, refresh } = usePagedList<
  UsualLogListItem,
  LogQuery,
  UsualLogListResponse
>({
  fetcher: (current, size, query) => getUsualList(current, size, query),
  resolveResponse: response => ({
    records: response.data.data.records.map((item: UsualLogEntity) => toListItem(item)),
    total: response.data.data.total,
  }),
  createInitialQuery,
});
const { view: canView } = useCrudPermission('log_usual');
const {
  data: detailData,
  loading: detailLoading,
  failed: detailFailed,
  load: loadDetail,
  clear: clearDetail,
} = useRemoteDetail<UsualLogEntity, string>(async id => {
  const response = await getUsualLogs(id);
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

const openDetail = (row: UsualLogListItem) => {
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
