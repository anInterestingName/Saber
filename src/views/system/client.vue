<template>
  <div class="client-management-page">
    <search-panel
      :model="searchForm"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item label="应用 ID">
          <el-input v-model="searchForm.clientId" clearable placeholder="请输入应用 ID" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item label="应用密钥">
          <el-input
            v-model="searchForm.clientSecret"
            type="password"
            clearable
            placeholder="请输入应用密钥"
          />
        </el-form-item>
      </el-col>
    </search-panel>

    <list-panel title="客户端列表">
      <template #actions>
        <el-button v-if="canAdd" type="primary" :icon="Plus" @click="openAdd">新增</el-button>
        <el-button
          v-if="canDelete"
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
        <el-table-column prop="clientId" label="应用 ID" min-width="180" show-overflow-tooltip />
        <el-table-column label="应用密钥" min-width="130" align="center">
          <template #default="{ row }">
            <span class="sensitive-mask">{{ row.hasClientSecret ? '********' : '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="authorizedGrantTypes"
          label="授权类型"
          min-width="280"
          show-overflow-tooltip
        />
        <el-table-column prop="scope" label="授权范围" min-width="140" show-overflow-tooltip />
        <el-table-column
          prop="accessTokenValidity"
          label="令牌秒数"
          min-width="120"
          align="center"
        />
        <el-table-column
          v-if="canView || canEdit || canDelete"
          label="操作"
          fixed="right"
          width="200"
          align="center"
        >
          <template #default="{ row }">
            <row-actions
              :show-view="canView"
              :show-edit="canEdit"
              :show-delete="canDelete"
              :disabled="loading || submitting"
              @view="openDetail(row as ClientListItem, 'view')"
              @edit="openDetail(row as ClientListItem, 'edit')"
              @delete="handleRowDelete(row as ClientListItem)"
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

    <form-dialog
      v-model="dialogVisible"
      :mode="mode"
      entity-name="客户端"
      :submitting="submitting"
      :loading="detailLoading"
      width="720px"
      destroy-on-close
      @confirm="handleSubmit"
      @cancel="handleDialogCancel"
    >
      <el-result v-if="detailFailed" status="error" title="客户端详情加载失败">
        <template #extra>
          <el-button type="primary" :icon="Refresh" @click="retryDetail">重新加载</el-button>
        </template>
      </el-result>
      <el-form
        v-else
        ref="formRef"
        :model="form"
        :rules="formRules"
        :disabled="mode === 'view' || detailLoading"
        label-width="100px"
      >
        <el-row :gutter="24">
          <el-col :xs="24" :sm="12">
            <el-form-item label="应用 ID" prop="clientId">
              <el-input v-model="form.clientId" placeholder="请输入应用 ID" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="应用密钥" prop="clientSecret">
              <el-input v-model="form.clientSecret" type="password" placeholder="请输入应用密钥" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="授权类型" prop="authorizedGrantTypes">
              <el-input v-model="form.authorizedGrantTypes" placeholder="请输入授权类型" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="授权范围" prop="scope">
              <el-input v-model="form.scope" placeholder="请输入授权范围" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="自动授权" prop="autoapprove">
              <el-input v-model="form.autoapprove" placeholder="请输入自动授权配置" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="令牌秒数" prop="accessTokenValidity">
              <el-input-number
                v-model="form.accessTokenValidity"
                :min="0"
                controls-position="right"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="刷新秒数" prop="refreshTokenValidity">
              <el-input-number
                v-model="form.refreshTokenValidity"
                :min="0"
                controls-position="right"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="回调地址" prop="webServerRedirectUri">
              <el-input v-model="form.webServerRedirectUri" placeholder="请输入回调地址" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="资源集合" prop="resourceIds">
              <el-input v-model="form.resourceIds" placeholder="请输入资源集合" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="权限" prop="authorities">
              <el-input v-model="form.authorities" placeholder="请输入权限" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="附加说明" prop="additionalInformation">
              <el-input
                v-model="form.additionalInformation"
                type="textarea"
                :rows="3"
                placeholder="请输入附加说明"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </form-dialog>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { Delete, Plus, Refresh } from '@element-plus/icons-vue';
import { ElForm, ElMessage, ElMessageBox, type FormRules, type TableInstance } from 'element-plus';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import ListPagination from '@/components/list-pagination/main.vue';
import FormDialog from '@/components/form-dialog/main.vue';
import RowActions from '@/components/row-actions/main.vue';
import { useCrudPermission } from '@/composables/useCrudPermission';
import { usePagedList } from '@/composables/usePagedList';
import { useRemoteDetail } from '@/composables/useRemoteDetail';
import { useTableSelection } from '@/composables/useTableSelection';
import { add, getDetail, getList, remove, update } from '@/api/system/client';
import type { CrudMode } from '@/types/crud';
import type { PaginationChange } from '@/types/list';

interface ClientEntity {
  id: string;
  clientId?: string;
  clientSecret?: string;
  authorizedGrantTypes?: string;
  scope?: string;
  accessTokenValidity?: number;
  refreshTokenValidity?: number;
  webServerRedirectUri?: string;
  resourceIds?: string;
  authorities?: string;
  autoapprove?: string;
  additionalInformation?: string;
}

type ClientListItem = Omit<ClientEntity, 'clientSecret'> & { hasClientSecret: boolean };

interface ClientQuery {
  clientId?: string;
  clientSecret?: string;
}

type ClientForm = Partial<ClientEntity>;
type ClientListResponse = Awaited<ReturnType<typeof getList>>;

const createInitialQuery = (): ClientQuery => ({});
const createInitialForm = (): ClientForm => ({
  clientId: '',
  clientSecret: '',
  authorizedGrantTypes: 'refresh_token,password,authorization_code',
  scope: 'all',
  accessTokenValidity: 3600,
  refreshTokenValidity: 604800,
  webServerRedirectUri: '',
  resourceIds: '',
  authorities: '',
  autoapprove: '',
  additionalInformation: '',
});
const toListItem = (entity: ClientEntity): ClientListItem => {
  const { clientSecret, ...item } = entity;
  return { ...item, hasClientSecret: Boolean(clientSecret) };
};

const searchForm = ref<ClientQuery>(createInitialQuery());
const form = ref<ClientForm>(createInitialForm());
const mode = ref<CrudMode>('add');
const dialogVisible = ref(false);
const submitting = ref(false);
const detailId = ref<string>();
const formRef = ref<InstanceType<typeof ElForm>>();
const tableRef = ref<TableInstance>();

const formRules: FormRules = {
  clientId: [{ required: true, message: '请输入客户端 ID', trigger: 'blur' }],
  clientSecret: [{ required: true, message: '请输入客户端密钥', trigger: 'blur' }],
  authorizedGrantTypes: [{ required: true, message: '请输入授权类型', trigger: 'blur' }],
  scope: [{ required: true, message: '请输入授权范围', trigger: 'blur' }],
  accessTokenValidity: [{ required: true, message: '请输入令牌过期秒数', trigger: 'change' }],
  refreshTokenValidity: [{ required: true, message: '请输入刷新令牌过期秒数', trigger: 'change' }],
  webServerRedirectUri: [{ required: true, message: '请输入回调地址', trigger: 'blur' }],
};

const { data, page, loading, load, search, reset, refresh } = usePagedList<
  ClientListItem,
  ClientQuery,
  ClientListResponse
>({
  fetcher: (current, size, query) => getList(current, size, query),
  resolveResponse: response => ({
    records: response.data.data.records.map((item: ClientEntity) => toListItem(item)),
    total: response.data.data.total,
  }),
  createInitialQuery,
});
const { selectedRows, ids, handleSelectionChange, clearSelection } =
  useTableSelection<ClientListItem>();
const {
  add: canAdd,
  view: canView,
  edit: canEdit,
  delete: canDelete,
} = useCrudPermission('client');
const {
  data: detailData,
  loading: detailLoading,
  failed: detailFailed,
  load: loadDetail,
  clear: clearDetail,
} = useRemoteDetail<ClientEntity, string>(async id => {
  const response = await getDetail(id);
  return response.data.data;
});

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

const openAdd = () => {
  clearDetail();
  detailId.value = undefined;
  mode.value = 'add';
  form.value = createInitialForm();
  dialogVisible.value = true;
  nextTick(() => formRef.value?.clearValidate());
};

const requestDetail = async () => {
  if (!detailId.value) return;
  form.value = createInitialForm();
  const detail = await loadDetail(detailId.value);
  if (!detail) return;
  form.value = { ...detail };
  await nextTick();
  formRef.value?.clearValidate();
};

const openDetail = (row: ClientListItem, dialogMode: 'edit' | 'view') => {
  clearDetail();
  detailId.value = row.id;
  mode.value = dialogMode;
  form.value = createInitialForm();
  dialogVisible.value = true;
  void requestDetail();
};

const retryDetail = () => {
  void requestDetail();
};

const resetDialogState = () => {
  formRef.value?.clearValidate();
  clearDetail();
  detailId.value = undefined;
  form.value = createInitialForm();
};

const handleDialogCancel = () => {
  resetDialogState();
};

const handleSubmit = async () => {
  if (
    !formRef.value ||
    submitting.value ||
    detailLoading.value ||
    detailFailed.value ||
    (mode.value !== 'add' && !detailData.value)
  ) {
    return;
  }
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const submit = mode.value === 'add' ? add : update;
    await submit({ ...form.value });
    dialogVisible.value = false;
    resetDialogState();
    clearTableSelection();
    await refresh();
    ElMessage.success('操作成功!');
  } catch {
    // Axios 已处理错误提示，保留弹窗和敏感字段输入供用户重试。
  } finally {
    submitting.value = false;
  }
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

const handleRowDelete = (row: ClientListItem) => {
  void confirmDelete(row.id);
};

const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  void confirmDelete(ids.value);
};

onMounted(() => {
  void load();
});
</script>

<style scoped lang="scss">
.client-management-page {
  min-width: 0;
}

.sensitive-mask {
  color: var(--saber-text-tertiary);
  letter-spacing: 0;
}

:deep(.el-input-number) {
  width: 100%;
}
</style>
