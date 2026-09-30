<template>
  <basic-container>
    <div class="ai-provider-page">
      <el-result
        v-if="!canRead"
        icon="warning"
        title="暂无供应商查看权限"
        sub-title="请确认登录状态及供应商查看授权。"
      />
      <template v-else>
        <el-alert
          title="当前阶段仅开放查询与详情"
          description="管理上下文和归属候选契约尚待后端确认，新增、编辑、启停及删除暂不开放。查询范围由后端核验，不从客户端角色推导。"
          type="info"
          show-icon
          :closable="false"
        />
        <search-panel
          :model="searchForm"
          :loading="loading"
          @search="handleSearch"
          @reset="handleReset"
        >
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="供应商名称">
              <el-input
                v-model="searchForm.name"
                maxlength="100"
                clearable
                placeholder="请输入供应商名称"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="管理编码">
              <el-input
                v-model="searchForm.code"
                maxlength="64"
                clearable
                placeholder="请输入管理编码"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="状态">
              <el-select v-model="searchForm.status" clearable placeholder="全部状态">
                <el-option label="停用" :value="0" />
                <el-option label="启用" :value="1" />
              </el-select>
            </el-form-item>
          </el-col>
        </search-panel>

        <list-panel title="供应商配置">
          <template #tools>
            <el-tooltip content="刷新" placement="top">
              <el-button
                circle
                :icon="Refresh"
                :loading="loading"
                aria-label="刷新供应商列表"
                @click="handleRefresh"
              />
            </el-tooltip>
          </template>
          <el-alert
            v-if="failed"
            title="列表加载失败，旧记录已清空；请刷新重试并核验当前可见范围。"
            type="warning"
            show-icon
            :closable="false"
          />
          <el-alert
            v-if="optionsFailed"
            title="预设名称加载失败，暂显示预设 ID；不影响已授权的只读查询。"
            type="warning"
            :closable="false"
          >
            <el-button type="primary" link :loading="optionsLoading" @click="reloadOptions"
              >重新加载选项</el-button
            >
          </el-alert>
          <el-table
            v-loading="loading"
            :data="data"
            row-key="id"
            :empty-text="failed ? '列表加载失败，请刷新重试' : '暂无供应商配置'"
          >
            <el-table-column
              prop="providerName"
              label="供应商名称"
              min-width="180"
              show-overflow-tooltip
            />
            <el-table-column
              prop="providerCode"
              label="管理编码"
              min-width="160"
              show-overflow-tooltip
            />
            <el-table-column label="预设 / 自定义" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{
                getPresetLabel(row.presetDictId, configOptions)
              }}</template>
            </el-table-column>
            <el-table-column
              prop="baseUrl"
              label="接入地址"
              min-width="240"
              show-overflow-tooltip
            />
            <el-table-column
              prop="tenantId"
              label="租户 ID"
              min-width="140"
              show-overflow-tooltip
            />
            <el-table-column
              prop="ownerUserId"
              label="所有人 ID"
              min-width="190"
              show-overflow-tooltip
            />
            <el-table-column label="凭据" width="110" align="center">
              <template #default="{ row }">
                <el-tag :type="row.credentialConfigured ? 'success' : 'info'">{{
                  row.credentialConfigured ? '已配置' : '未配置'
                }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'">{{
                  getStatusLabel(row.status)
                }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="updateTime"
              label="更新时间"
              min-width="180"
              show-overflow-tooltip
            />
            <el-table-column label="操作" fixed="right" width="210" align="center">
              <template #default="{ row }">
                <row-actions
                  :show-view="canView"
                  :actions="modelActions"
                  @view="openDetail(row as ProviderListItem)"
                  @action="handleRowAction($event, row as ProviderListItem)"
                />
              </template>
            </el-table-column>
          </el-table>
          <template #footer>
            <list-pagination
              :current-page="page.currentPage"
              :page-size="page.pageSize"
              :total="page.total"
              :disabled="loading || failed"
              @change="handlePageChange"
            />
          </template>
        </list-panel>
      </template>

      <detail-drawer
        v-model="detailVisible"
        title="供应商详情"
        subtitle="仅展示管理配置及凭据已配置标记，不读取凭据原值。"
        :loading="detailLoading"
        :failed="detailFailed"
        @retry="reloadDetail"
      >
        <template v-if="detail">
          <detail-section title="接入配置" :columns="1">
            <field-value label="供应商名称" :value="detail.providerName" />
            <field-value label="管理编码" :value="detail.providerCode" copyable />
            <field-value
              label="预设 / 自定义"
              :value="getPresetLabel(detail.presetDictId, configOptions)"
            />
            <field-value label="接入地址" :value="detail.baseUrl" multiline />
            <field-value label="凭据" :value="detail.credentialConfigured ? '已配置' : '未配置'" />
            <field-value label="状态" :value="getStatusLabel(detail.status)" />
          </detail-section>
          <detail-section title="归属与记录" :columns="1">
            <field-value label="配置 ID" :value="detail.id" copyable />
            <field-value label="租户 ID" :value="detail.tenantId" />
            <field-value label="所有人 ID" :value="detail.ownerUserId" />
            <field-value label="版本" :value="detail.lockVersion" />
            <field-value label="创建人 ID" :value="detail.createUser" />
            <field-value label="创建时间" :value="detail.createTime" />
            <field-value label="修改人 ID" :value="detail.updateUser" />
            <field-value label="更新时间" :value="detail.updateTime" />
          </detail-section>
        </template>
        <template #footer><el-button @click="detailVisible = false">关闭</el-button></template>
      </detail-drawer>
    </div>
  </basic-container>
</template>

<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Refresh } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import BasicContainer from '@/components/basic-container/main.vue';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import ListPagination from '@/components/list-pagination/main.vue';
import DetailDrawer from '@/components/detail-drawer/main.vue';
import DetailSection from '@/components/detail-section/main.vue';
import FieldValue from '@/components/field-value/main.vue';
import RowActions from '@/components/row-actions/main.vue';
import { useCrudPermission } from '@/composables/useCrudPermission';
import { usePagedList } from '@/composables/usePagedList';
import { useRemoteDetail } from '@/composables/useRemoteDetail';
import { useUserStore } from '@/store/user';
import {
  getConfigOptions,
  getProviderDetail,
  getProviderList,
  type AiConfigOptions,
  type ProviderDetail,
  type ProviderListItem,
  type ProviderQuery,
} from '@/api/ai/modelConfig';
import type { PaginationChange } from '@/types/list';
import {
  buildProviderQuery,
  getPresetLabel,
  getStatusLabel,
  isConfigId,
  readConfigOptions,
  readConfigPage,
  readProviderDetail,
  readProviderItem,
} from '@/views/asset/aiModelConfig';

const router = useRouter();
const userStore = useUserStore();
const { view: canView } = useCrudPermission('ai_provider');
const { view: canModelView } = useCrudPermission('ai_model');
const canRead = computed(() => !!userStore.token && !!userStore.userInfo?.userId && canView.value);
const modelActions = computed(() =>
  canModelView.value ? [{ key: 'models', label: '模型配置' }] : []
);
const searchForm = ref<ProviderQuery>({});
const { data, page, loading, failed, load, search, reset, refresh, clear, changePage, changeSize } =
  usePagedList({
    fetcher: getProviderList,
    resolveResponse: response => readConfigPage(response.data, readProviderItem),
    createInitialQuery: (): ProviderQuery => ({}),
  });
const {
  data: configOptions,
  loading: optionsLoading,
  failed: optionsFailed,
  load: loadOptions,
  clear: clearOptions,
} = useRemoteDetail<AiConfigOptions, undefined>(async () =>
  readConfigOptions((await getConfigOptions()).data)
);
const {
  data: detail,
  loading: detailLoading,
  failed: detailFailed,
  load: loadDetail,
  clear: clearDetail,
} = useRemoteDetail<ProviderDetail, string>(async id =>
  readProviderDetail((await getProviderDetail(id)).data, id)
);
const detailId = ref('');
const detailVisible = ref(false);
let active = false;

const handleSearch = () => {
  if (!canRead.value || loading.value) return;
  clear();
  return search(buildProviderQuery(searchForm.value));
};
const handleReset = () => {
  if (!canRead.value || loading.value) return;
  searchForm.value = {};
  clear();
  return reset();
};
const handleRefresh = () => {
  if (canRead.value && !loading.value) return refresh();
};
const reloadOptions = () => {
  if (canRead.value && !optionsLoading.value) return loadOptions(undefined);
};
const handlePageChange = ({ currentPage, pageSize }: PaginationChange) => {
  if (!canRead.value || loading.value || failed.value) return;
  return pageSize === page.value.pageSize ? changePage(currentPage) : changeSize(pageSize);
};
const openDetail = (row: ProviderListItem) => {
  if (!canRead.value || failed.value || !isConfigId(row.id)) return;
  detailId.value = row.id;
  detailVisible.value = true;
  return loadDetail(row.id);
};
const reloadDetail = () => {
  if (canRead.value && detailVisible.value && !detailLoading.value && isConfigId(detailId.value)) {
    return loadDetail(detailId.value);
  }
};
const handleRowAction = async (action: string, row: ProviderListItem) => {
  if (action !== 'models' || !canRead.value || !canModelView.value || !isConfigId(row.id)) return;
  if (!router.getRoutes().some(route => route.path === '/asset/ai-model')) {
    ElMessage.warning('模型配置菜单尚未下发，请确认菜单及查看授权');
    return;
  }
  await router.push({ path: '/asset/ai-model', query: { providerId: row.id } });
};
const clearPage = () => {
  clear();
  clearOptions();
  clearDetail();
  detailId.value = '';
  detailVisible.value = false;
  searchForm.value = {};
};
const initialize = () => {
  clearPage();
  if (!canRead.value) return;
  void load();
  void reloadOptions();
};
const activate = () => {
  if (active) return;
  active = true;
  initialize();
};
const deactivate = () => {
  active = false;
  clearPage();
};
watch(detailVisible, visible => {
  if (!visible) {
    detailId.value = '';
    clearDetail();
  }
});
watch(
  failed,
  value => {
    if (!value) return;
    data.value = [];
    page.value.total = 0;
    detailVisible.value = false;
    detailId.value = '';
    clearDetail();
  },
  { flush: 'sync' }
);
const contextSources = [
  () => userStore.token,
  () => userStore.userInfo?.userId,
  () => userStore.userInfo?.authority,
  () => userStore.roles.join(','),
  canRead,
];
watch(contextSources, clearPage, { flush: 'sync' });
watch(contextSources, () => {
  if (active) initialize();
});
onMounted(activate);
onActivated(activate);
onDeactivated(deactivate);
onBeforeUnmount(deactivate);
</script>

<style scoped lang="scss">
.ai-provider-page {
  display: grid;
  min-width: 0;
  gap: var(--saber-space-4);
}
</style>
