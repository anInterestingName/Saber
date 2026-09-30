<template>
  <basic-container>
    <div class="ai-model-page">
      <el-result
        v-if="!canRead"
        icon="warning"
        title="暂无模型查看权限"
        sub-title="请确认登录状态及模型查看授权。"
      />
      <template v-else>
        <el-alert
          title="当前阶段仅开放查询与详情"
          description="管理上下文和归属候选契约尚待后端确认，新增、编辑、启停及删除暂不开放。模型只读查询不强制依赖供应商查看权限。"
          type="info"
          show-icon
          :closable="false"
        />
        <el-alert
          v-if="providerContextError"
          :title="providerContextError"
          description="当前供应商筛选未核验，不展示全量模型或上次筛选结果。可重新核验或清除供应商筛选。"
          type="error"
          show-icon
          :closable="false"
        >
          <el-button type="primary" link :loading="providerLoading" @click="initialize"
            >重新核验</el-button
          >
          <el-button type="primary" link @click="clearProviderFilter">清除供应商筛选</el-button>
        </el-alert>
        <div
          v-else-if="providerLoading || selectedProvider"
          class="ai-model-page__provider"
          v-loading="providerLoading"
        >
          <template v-if="selectedProvider">
            <span
              >当前供应商：{{ selectedProvider.providerName }}（{{
                selectedProvider.providerCode
              }}）</span
            >
            <span
              >租户：{{ selectedProvider.tenantId }} / 所有人：{{
                selectedProvider.ownerUserId
              }}</span
            >
          </template>
          <span v-else>正在核验供应商筛选与归属…</span>
          <el-button type="primary" link @click="clearProviderFilter">清除供应商筛选</el-button>
        </div>

        <search-panel
          :model="searchForm"
          :loading="loading || !listReady"
          @search="handleSearch"
          @reset="handleReset"
        >
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="管理编码">
              <el-input
                v-model="searchForm.code"
                maxlength="64"
                clearable
                placeholder="请输入模型管理编码"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="状态">
              <el-select v-model="searchForm.status" clearable placeholder="全部状态">
                <el-option label="停用" :value="0" />
                <el-option label="启用" :value="1" />
              </el-select>
            </el-form-item>
          </el-col>
        </search-panel>
        <list-panel title="模型配置">
          <template #tools>
            <el-tooltip content="刷新" placement="top">
              <el-button
                circle
                :icon="Refresh"
                :loading="loading"
                :disabled="!listReady"
                aria-label="刷新模型列表"
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
            title="配置选项加载失败，暂显示稳定值且不判断选项是否失效。"
            type="warning"
            :closable="false"
          >
            <el-button type="primary" link :loading="optionsLoading" @click="reloadOptions"
              >重新加载选项</el-button
            >
          </el-alert>
          <el-table
            v-loading="loading || providerLoading"
            :data="data"
            row-key="id"
            :empty-text="
              failed ? '列表加载失败，请刷新重试' : listReady ? '暂无模型配置' : '供应商筛选未就绪'
            "
          >
            <el-table-column
              prop="modelName"
              label="模型名称"
              min-width="180"
              show-overflow-tooltip
            />
            <el-table-column
              prop="modelCode"
              label="管理编码"
              min-width="160"
              show-overflow-tooltip
            />
            <el-table-column label="供应商" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">{{
                selectedProvider?.id === row.providerId
                  ? selectedProvider.providerName
                  : row.providerId
              }}</template>
            </el-table-column>
            <el-table-column
              prop="upstreamModelId"
              label="上游模型标识"
              min-width="180"
              show-overflow-tooltip
            />
            <el-table-column label="API 协议" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">{{ protocolLabel(row.apiProtocol) }}</template>
            </el-table-column>
            <el-table-column label="主要能力" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">{{ capabilityLabel(row.capabilityType) }}</template>
            </el-table-column>
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
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }"
                ><el-tag :type="row.status === 1 ? 'success' : 'info'">{{
                  getStatusLabel(row.status)
                }}</el-tag></template
              >
            </el-table-column>
            <el-table-column
              prop="updateTime"
              label="更新时间"
              min-width="180"
              show-overflow-tooltip
            />
            <el-table-column label="操作" fixed="right" width="90" align="center">
              <template #default="{ row }"
                ><row-actions :show-view="canView" @view="openDetail(row as ModelListItem)"
              /></template>
            </el-table-column>
          </el-table>
          <template #footer>
            <list-pagination
              :current-page="page.currentPage"
              :page-size="page.pageSize"
              :total="page.total"
              :disabled="loading || failed || !listReady"
              @change="handlePageChange"
            />
          </template>
        </list-panel>
      </template>

      <detail-drawer
        v-model="detailVisible"
        title="模型详情"
        subtitle="配置独立属于当前模型；不读取供应商凭据，也不调用模型运行接口。"
        :loading="detailLoading"
        :failed="detailFailed"
        @retry="reloadDetail"
      >
        <template v-if="detail">
          <detail-section title="模型配置" :columns="1">
            <field-value label="模型名称" :value="detail.modelName" />
            <field-value label="管理编码" :value="detail.modelCode" copyable />
            <field-value label="供应商 ID" :value="detail.providerId" copyable />
            <field-value label="上游模型标识" :value="detail.upstreamModelId" />
            <field-value label="API 协议" :value="protocolLabel(detail.apiProtocol)" />
            <field-value label="主要能力" :value="capabilityLabel(detail.capabilityType)" />
            <field-value label="状态" :value="getStatusLabel(detail.status)" />
            <field-value label="上下文窗口" :value="detail.contextWindow" empty-text="未配置" />
            <field-value
              label="输入模态"
              :value="detail.inputTypes.map(capabilityLabel).join('、')"
            />
          </detail-section>
          <detail-section title="推理档位" :columns="1">
            <field-value
              v-for="[key, value] in reasoningEntries"
              :key="key"
              :label="key"
              :value="value"
              multiline
            />
            <field-value v-if="!reasoningEntries.length" label="推理档位" value="未配置" />
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
import { useRoute, useRouter } from 'vue-router';
import { Refresh } from '@element-plus/icons-vue';
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
  getModelDetail,
  getModelList,
  getProviderDetail,
  type AiConfigOptions,
  type ModelDetail,
  type ModelListItem,
  type ModelQuery,
  type ProviderDetail,
} from '@/api/ai/modelConfig';
import type { PaginationChange } from '@/types/list';
import {
  buildModelQuery,
  getCapabilityLabel,
  getProtocolLabel,
  getStatusLabel,
  isConfigId,
  readConfigOptions,
  readConfigPage,
  readModelDetail,
  readModelItem,
  readProviderDetail,
} from '@/views/asset/aiModelConfig';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { view: canView } = useCrudPermission('ai_model');
const { view: canProviderView } = useCrudPermission('ai_provider');
const canRead = computed(() => !!userStore.token && !!userStore.userInfo?.userId && canView.value);
const listReady = ref(false);
const searchForm = ref<ModelQuery>({});
const providerContextError = ref('');
const {
  data: selectedProvider,
  loading: providerLoading,
  failed: providerFailed,
  load: loadProvider,
  clear: clearProvider,
} = useRemoteDetail<ProviderDetail, string>(async id =>
  readProviderDetail((await getProviderDetail(id)).data, id)
);
const { data, page, loading, failed, load, search, refresh, clear, changePage, changeSize } =
  usePagedList({
    fetcher: getModelList,
    resolveResponse: response => readConfigPage(response.data, readModelItem),
    createInitialQuery: (): ModelQuery => ({}),
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
} = useRemoteDetail<ModelDetail, string>(async id =>
  readModelDetail((await getModelDetail(id)).data, id)
);
const detailVisible = ref(false);
const detailId = ref('');
const reasoningEntries = computed(() => Object.entries(detail.value?.reasoningEfforts ?? {}));
let active = false;

const protocolLabel = (value: string) => {
  const label = getProtocolLabel(value);
  return configOptions.value && !configOptions.value.apiProtocols.some(item => item.value === value)
    ? `${label}（已失效）`
    : label;
};
const capabilityLabel = (value: string) => {
  const label = getCapabilityLabel(value);
  return configOptions.value &&
    !configOptions.value.capabilityTypes.some(item => item.value === value)
    ? `${label}（已失效）`
    : label;
};
const handleSearch = () => {
  if (canRead.value && listReady.value && !loading.value) {
    clear();
    return search(buildModelQuery(searchForm.value, selectedProvider.value));
  }
};
const handleReset = () => {
  if (!canRead.value || !listReady.value || loading.value) return;
  searchForm.value = {};
  clear();
  return search(buildModelQuery({}, selectedProvider.value));
};
const handleRefresh = () => {
  if (canRead.value && listReady.value && !loading.value) return refresh();
};
const reloadOptions = () => {
  if (canRead.value && !optionsLoading.value) return loadOptions(undefined);
};
const handlePageChange = ({ currentPage, pageSize }: PaginationChange) => {
  if (!canRead.value || !listReady.value || loading.value || failed.value) return;
  return pageSize === page.value.pageSize ? changePage(currentPage) : changeSize(pageSize);
};
const openDetail = (row: ModelListItem) => {
  if (!canRead.value || !listReady.value || failed.value || !isConfigId(row.id)) return;
  detailId.value = row.id;
  detailVisible.value = true;
  return loadDetail(row.id);
};
const reloadDetail = () => {
  if (
    canRead.value &&
    listReady.value &&
    detailVisible.value &&
    !detailLoading.value &&
    isConfigId(detailId.value)
  ) {
    return loadDetail(detailId.value);
  }
};
const clearProviderFilter = async () => {
  if (!canRead.value) return;
  const query = { ...route.query };
  delete query.providerId;
  clearPage();
  await router.replace({ path: route.path, query });
};
const clearPage = () => {
  listReady.value = false;
  clear();
  clearProvider();
  clearOptions();
  clearDetail();
  detailVisible.value = false;
  detailId.value = '';
  providerContextError.value = '';
  searchForm.value = {};
};
const initialize = async () => {
  clearPage();
  if (!active || !canRead.value || route.path !== '/asset/ai-model') return;
  const providerId = route.query.providerId;
  void reloadOptions();
  if (providerId !== undefined) {
    if (typeof providerId !== 'string' || !isConfigId(providerId)) {
      providerContextError.value = '供应商筛选参数无效';
      return;
    }
    if (!canProviderView.value) {
      providerContextError.value = '供应商筛选需要供应商查看授权';
      return;
    }
    const provider = await loadProvider(providerId);
    if (
      !active ||
      !canRead.value ||
      route.path !== '/asset/ai-model' ||
      route.query.providerId !== providerId
    )
      return;
    if (!provider) {
      if (providerFailed.value && !providerLoading.value && !selectedProvider.value) {
        providerContextError.value = '供应商详情或归属核验失败';
      }
      return;
    }
    listReady.value = true;
    await search(buildModelQuery({}, provider));
    return;
  }
  listReady.value = true;
  await load();
};
const activate = () => {
  if (active) return;
  active = true;
  void initialize();
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
  () => route.path,
  () => route.query.providerId,
  canRead,
  canProviderView,
];
watch(contextSources, clearPage, { flush: 'sync' });
watch(contextSources, () => {
  if (active) void initialize();
});
onMounted(activate);
onActivated(activate);
onDeactivated(deactivate);
onBeforeUnmount(deactivate);
</script>

<style scoped lang="scss">
.ai-model-page {
  display: grid;
  min-width: 0;
  gap: var(--saber-space-4);
}

.ai-model-page__provider {
  display: flex;
  min-height: 40px;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--saber-space-3);
  overflow-wrap: anywhere;
}
</style>
