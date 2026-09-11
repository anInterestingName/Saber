<template>
  <page-container
    class="log-page"
    title="监控日志"
    description="查询服务运行日志并查看请求上下文。"
    :show-breadcrumb="false"
  >
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
      subtitle="只读展示当前日志记录，不影响列表查询条件与分页"
      size="lg"
      :loading="detailLoading"
      :failed="detailFailed"
      @retry="retryDetail"
      @close="handleDrawerClose"
    >
      <detail-section v-if="detailData" title="日志信息">
        <field-value label="服务 ID" :value="detailData.serviceId" />
        <field-value label="服务 Host" :value="detailData.serverHost" />
        <field-value label="服务 IP" :value="detailData.serverIp" />
        <field-value label="软件环境" :value="detailData.env" />
        <field-value label="日志级别" :value="detailData.logLevel" />
        <field-value label="日志 ID" :value="detailData.logId" copyable />
        <field-value label="请求接口" :value="detailData.requestUri" span="full" />
        <field-value label="日志时间" :value="detailData.logData" span="full" />
        <field-value label="用户代理" :value="detailData.userAgent" multiline span="full" />
        <field-value label="请求数据" :value="detailData.params" multiline span="full" />
      </detail-section>
    </detail-drawer>
  </page-container>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import ListPagination from '@/components/list-pagination/main.vue';
import RowActions from '@/components/row-actions/main.vue';
import DetailDrawer from '@/components/detail-drawer/main.vue';
import PageContainer from '@/components/page-container/main.vue';
import DetailSection from '@/components/detail-section/main.vue';
import FieldValue from '@/components/field-value/main.vue';
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
</style>
