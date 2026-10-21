<template>
  <page-container layout="workspace">
    <div v-if="isAdmin" class="client-management-page">
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
      </search-panel>

      <list-panel title="客户端列表">
        <template #actions>
          <el-button v-if="canAdd" type="primary" :icon="Plus" @click="openAdd">新增</el-button>
          <el-button
            v-if="canDelete"
            type="danger"
            plain
            :icon="Delete"
            :disabled="loading || deleting || submitting"
            @click="handleBatchDelete"
          >
            删除
          </el-button>
        </template>
        <template #tools>
          <el-tooltip content="刷新" placement="top">
            <el-button
              circle
              :icon="Refresh"
              :loading="loading"
              aria-label="刷新"
              @click="refresh"
            />
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
          <el-table-column
            prop="clientName"
            label="客户端名称"
            min-width="150"
            show-overflow-tooltip
          />
          <el-table-column prop="clientId" label="应用 ID" min-width="180" show-overflow-tooltip />

          <el-table-column
            prop="grantTypes"
            label="授权类型"
            min-width="280"
            show-overflow-tooltip
          />
          <el-table-column prop="scopes" label="授权范围" min-width="140" show-overflow-tooltip />
          <el-table-column prop="accessTokenTtl" label="令牌秒数" min-width="120" align="center" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">{{
                row.status === 1 ? '启用' : '停用'
              }}</el-tag>
            </template>
          </el-table-column>
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
                :disabled="loading || submitting || deleting"
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
        :confirm-disabled="detailFailed || (mode !== 'add' && !detailData)"
        size="md"
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
          :disabled="mode === 'view' || detailLoading || submitting"
          label-width="100px"
        >
          <el-row :gutter="24">
            <el-col :xs="24" :sm="12">
              <el-form-item label="客户端名称" prop="clientName">
                <el-input
                  v-model="form.clientName"
                  maxlength="100"
                  placeholder="请输入客户端名称"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="认证方式" prop="clientAuthenticationMethods">
                <el-select v-model="form.clientAuthenticationMethods" style="width: 100%">
                  <el-option label="客户端密钥 Basic" value="client_secret_basic" />
                  <el-option label="公共客户端 PKCE" value="none" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="应用 ID" prop="clientId">
                <el-input
                  v-model="form.clientId"
                  maxlength="48"
                  :disabled="mode !== 'add'"
                  placeholder="请输入应用 ID"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="应用密钥" prop="clientSecret">
                <el-input
                  v-model="form.clientSecret"
                  type="password"
                  show-password
                  autocomplete="new-password"
                  :disabled="form.clientAuthenticationMethods === 'none' || mode === 'view'"
                  :placeholder="mode === 'add' ? '请输入至少16字符密钥' : '留空保持当前密钥'"
                />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="授权类型" prop="grantTypes">
                <el-select v-model="selectedGrantTypes" multiple style="width: 100%">
                  <el-option label="授权码" value="authorization_code" />
                  <el-option
                    label="刷新令牌"
                    value="refresh_token"
                    :disabled="form.clientAuthenticationMethods === 'none'"
                  />
                  <el-option
                    label="客户端凭据"
                    value="client_credentials"
                    :disabled="form.clientAuthenticationMethods === 'none'"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="授权范围" prop="scopes">
                <el-input v-model="form.scopes" placeholder="请输入授权范围" />
              </el-form-item>
            </el-col>

            <el-col :xs="24" :sm="12">
              <el-form-item label="令牌秒数" prop="accessTokenTtl">
                <el-input-number
                  v-model="form.accessTokenTtl"
                  :min="1"
                  :max="86400"
                  :precision="0"
                  controls-position="right"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="刷新秒数" prop="refreshTokenTtl">
                <el-input-number
                  v-model="form.refreshTokenTtl"
                  :min="1"
                  :max="2592000"
                  :precision="0"
                  controls-position="right"
                />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="回调地址" prop="redirectUris">
                <el-input v-model="form.redirectUris" placeholder="请输入回调地址" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="目标资源" prop="audiences">
                <el-input v-model="form.audiences" placeholder="资源服务标识，多个用逗号分隔" />
              </el-form-item>
            </el-col>

            <el-col :xs="24" :sm="12">
              <el-form-item label="PKCE" prop="requireProofKey">
                <el-switch
                  v-model="form.requireProofKey"
                  :disabled="selectedGrantTypes.includes('authorization_code')"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="授权确认">
                <el-switch v-model="form.requireAuthorizationConsent" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="启用状态">
                <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </form-dialog>
    </div>
    <el-result v-else icon="warning" title="仅管理员可管理 OAuth 客户端" />
  </page-container>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
import { useUserStore } from '@/store/user';
import { getRequestSessionVersion } from '@/axios';

interface ClientEntity {
  id: string;
  clientId?: string;
  clientName?: string;
  clientSecret?: string;
  clientAuthenticationMethods?: string;
  requireProofKey?: boolean;
  requireAuthorizationConsent?: boolean;
  reuseRefreshTokens?: boolean;
  status?: number;
  grantTypes?: string;
  scopes?: string;
  accessTokenTtl?: number;
  refreshTokenTtl?: number;
  redirectUris?: string;
  audiences?: string;
}

type ClientListItem = ClientEntity;

interface ClientQuery {
  clientId?: string;
}

type ClientForm = Partial<ClientEntity>;
type ClientListResponse = Awaited<ReturnType<typeof getList>>;

const createInitialQuery = (): ClientQuery => ({});
const createInitialForm = (): ClientForm => ({
  clientId: '',
  clientName: '',
  clientSecret: '',
  clientAuthenticationMethods: 'client_secret_basic',
  requireProofKey: true,
  requireAuthorizationConsent: true,
  reuseRefreshTokens: false,
  status: 1,
  grantTypes: 'authorization_code,refresh_token',
  scopes: '',
  accessTokenTtl: 300,
  refreshTokenTtl: 1800,
  redirectUris: '',
  audiences: '',
});

const searchForm = ref<ClientQuery>(createInitialQuery());
const form = ref<ClientForm>(createInitialForm());
const selectedGrantTypes = computed({
  get: () => (form.value.grantTypes || '').split(',').filter(Boolean),
  set: (values: string[]) => {
    form.value.grantTypes = values.join(',');
  },
});
const mode = ref<CrudMode>('add');
const dialogVisible = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const isAdmin = computed(() => useUserStore().isAdmin);
const detailId = ref<string>();
const formRef = ref<InstanceType<typeof ElForm>>();
const tableRef = ref<TableInstance>();

const formRules: FormRules = {
  clientId: [
    {
      validator: (_rule, value: string, callback) =>
        callback(
          /^[A-Za-z0-9._-]{1,48}$/.test(value || '') && value !== 'authorization-server-system'
            ? undefined
            : new Error('ID须为1至48位字母、数字、点、下划线或短横线，且不能使用系统保留值')
        ),
      trigger: 'blur',
    },
  ],
  clientName: [
    {
      required: true,
      whitespace: true,
      max: 100,
      message: '请输入不超过100字符的客户端名称',
      trigger: 'blur',
    },
  ],
  clientSecret: [
    {
      validator: (_rule, value, callback) => {
        if (form.value.clientAuthenticationMethods === 'none') {
          callback(value ? new Error('公共客户端不需要密钥') : undefined);
          return;
        }
        if (
          (mode.value === 'add' || detailData.value?.clientAuthenticationMethods === 'none') &&
          !value
        ) {
          callback(new Error('请输入客户端密钥'));
          return;
        }
        callback(
          value &&
            (value.length < 16 ||
              new TextEncoder().encode(value).length > 72 ||
              value.startsWith('{'))
            ? new Error('密钥至少16字符、最多72个UTF-8字节，不能提交摘要')
            : undefined
        );
      },
      trigger: 'blur',
    },
  ],
  clientAuthenticationMethods: [
    {
      validator: (_rule, value: string, callback) =>
        callback(
          ['none', 'client_secret_basic'].includes(value)
            ? undefined
            : new Error('请选择受支持的认证方式')
        ),
      trigger: 'change',
    },
  ],
  audiences: [
    {
      validator: (_rule, value: string, callback) =>
        callback(splitValues(value).length ? undefined : new Error('请输入目标资源服务')),
      trigger: 'blur',
    },
  ],
  grantTypes: [
    {
      validator: (_rule, value: string, callback) => {
        const grants = splitValues(value);
        const valid =
          grants.length &&
          grants.every(grant =>
            ['authorization_code', 'refresh_token', 'client_credentials'].includes(grant)
          ) &&
          (!grants.includes('refresh_token') || grants.includes('authorization_code')) &&
          (form.value.clientAuthenticationMethods !== 'none' ||
            (grants.length === 1 && grants[0] === 'authorization_code'));
        callback(valid ? undefined : new Error('授权类型不合法，刷新令牌须与授权码同时配置'));
      },
      trigger: 'change',
    },
  ],
  scopes: [
    {
      validator: (_rule, value: string, callback) => {
        const scopes = splitValues(value);
        callback(
          scopes.length && scopes.every(scope => /^[\x21\x23-\x5B\x5D-\x7E]+$/.test(scope))
            ? undefined
            : new Error('授权范围须为合法OAuth值，多个用逗号分隔')
        );
      },
      trigger: 'blur',
    },
  ],
  accessTokenTtl: [
    {
      type: 'integer',
      required: true,
      min: 1,
      max: 86400,
      message: '令牌有效期须为1至86400秒整数',
      trigger: 'change',
    },
  ],
  refreshTokenTtl: [
    {
      type: 'integer',
      required: true,
      min: 1,
      max: 2592000,
      message: '刷新有效期须为1至2592000秒整数',
      trigger: 'change',
    },
  ],
  requireProofKey: [
    {
      validator: (_rule, value: boolean, callback) =>
        callback(
          selectedGrantTypes.value.includes('authorization_code') && value !== true
            ? new Error('授权码模式必须启用PKCE')
            : undefined
        ),
      trigger: 'change',
    },
  ],
  redirectUris: [
    {
      validator: (_rule, value, callback) => {
        const redirects = splitValues(value);
        callback(
          (selectedGrantTypes.value.includes('authorization_code') && !redirects.length) ||
            redirects.some(uri => !validRedirect(uri))
            ? new Error('回调必须是精确HTTPS地址或本地回环HTTP地址，不能含通配、用户凭据或片段')
            : undefined
        );
      },
      trigger: 'blur',
    },
  ],
};

const splitValues = (value = '') => [
  ...new Set(
    value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  ),
];
const validRedirect = (value: string) => {
  try {
    const uri = new URL(value);
    return (
      !decodeURIComponent(value).includes('*') &&
      !value.includes('#') &&
      !uri.username &&
      !uri.password &&
      !!uri.hostname &&
      (value.startsWith('https://') ||
        (value.startsWith('http://') && ['localhost', '127.0.0.1', '[::1]'].includes(uri.hostname)))
    );
  } catch {
    return false;
  }
};

const { data, page, loading, load, search, reset, refresh } = usePagedList<
  ClientListItem,
  ClientQuery,
  ClientListResponse
>({
  fetcher: (current, size, query) => getList(current, size, query),
  resolveResponse: response => ({
    records: response.data.data.records,
    total: response.data.data.total,
  }),
  createInitialQuery,
});
const { selectedRows, ids, handleSelectionChange, clearSelection } =
  useTableSelection<ClientListItem>();
const {
  add: addPermission,
  view: viewPermission,
  edit: editPermission,
  delete: deletePermission,
} = useCrudPermission('client');
const canAdd = computed(() => isAdmin.value && addPermission.value);
const canView = computed(() => isAdmin.value && viewPermission.value);
const canEdit = computed(() => isAdmin.value && editPermission.value);
const canDelete = computed(() => isAdmin.value && deletePermission.value);
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
  if (!isAdmin.value) return;
  void search({ clientId: searchForm.value.clientId?.trim() || undefined });
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
  if (!canAdd.value || submitting.value) return;
  clearDetail();
  detailId.value = undefined;
  mode.value = 'add';
  form.value = createInitialForm();
  dialogVisible.value = true;
  nextTick(() => formRef.value?.clearValidate());
};

watch(
  () => form.value.clientAuthenticationMethods,
  value => {
    if (value === 'none') {
      form.value.clientSecret = '';
      form.value.grantTypes = 'authorization_code';
      form.value.requireProofKey = true;
    }
  }
);
watch(selectedGrantTypes, values => {
  if (values.includes('authorization_code')) form.value.requireProofKey = true;
});

const requestDetail = async () => {
  if (!detailId.value) return;
  form.value = createInitialForm();
  const detail = await loadDetail(detailId.value);
  if (!detail) return;
  form.value = toClientForm(detail);
  await nextTick();
  formRef.value?.clearValidate();
};

const openDetail = (row: ClientListItem, dialogMode: 'edit' | 'view') => {
  if (submitting.value || !(dialogMode === 'edit' ? canEdit.value : canView.value)) return;
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

const toClientForm = (value: ClientForm): ClientForm => ({
  id: value.id,
  clientId: value.clientId,
  clientName: value.clientName,
  clientSecret: '',
  clientAuthenticationMethods: value.clientAuthenticationMethods,
  grantTypes: value.grantTypes,
  scopes: value.scopes,
  audiences: value.audiences,
  redirectUris: value.redirectUris,
  accessTokenTtl: value.accessTokenTtl,
  refreshTokenTtl: value.refreshTokenTtl,
  requireProofKey: value.requireProofKey,
  requireAuthorizationConsent: value.requireAuthorizationConsent,
  reuseRefreshTokens: false,
  status: value.status,
});

const buildPayload = (): ClientForm => {
  const payload = toClientForm(form.value);
  delete payload.clientSecret;
  if (mode.value === 'add') delete payload.id;
  payload.clientName = payload.clientName.trim();
  payload.grantTypes = splitValues(payload.grantTypes).join(',');
  payload.scopes = splitValues(payload.scopes).join(',');
  payload.audiences = splitValues(payload.audiences).join(',');
  payload.redirectUris = splitValues(payload.redirectUris).join(',');
  if (form.value.clientAuthenticationMethods === 'client_secret_basic' && form.value.clientSecret) {
    payload.clientSecret = form.value.clientSecret;
  }
  return payload;
};

const handleSubmit = async () => {
  if (
    !formRef.value ||
    mode.value === 'view' ||
    !(mode.value === 'add' ? canAdd.value : canEdit.value) ||
    submitting.value ||
    detailLoading.value ||
    detailFailed.value ||
    (mode.value !== 'add' && !detailData.value)
  ) {
    return;
  }
  submitting.value = true;
  const version = getRequestSessionVersion();
  try {
    if (!(await formRef.value.validate().catch(() => false))) return;
    if (![0, 1].includes(form.value.status)) {
      ElMessage.warning('请选择有效状态');
      return;
    }
    const changes = [] as string[];
    if (mode.value === 'edit' && form.value.clientSecret)
      changes.push('替换当前客户端密钥后，调用方须同步更新配置');
    if (form.value.status === 0 && detailData.value?.status !== 0)
      changes.push('停用后拒绝新的授权，已签发令牌可能仍有效');
    if (changes.length)
      await ElMessageBox.confirm(`${changes.join('；')}。是否继续？`, '确认配置变更', {
        type: 'warning',
      });
    if (version !== getRequestSessionVersion()) return;
    const submit = mode.value === 'add' ? add : update;
    await submit(buildPayload());
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
  if (!canDelete.value || deleting.value || !deleteIds) return;
  deleting.value = true;
  const version = getRequestSessionVersion();
  try {
    await ElMessageBox.confirm('确定将选择数据删除?', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    if (version !== getRequestSessionVersion() || !canDelete.value) return;
    await remove(deleteIds);
    clearTableSelection();
    await refresh();
    ElMessage.success('操作成功!');
  } catch {
    // 用户取消或接口失败时保留当前列表和选择状态。
  } finally {
    deleting.value = false;
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
  if (isAdmin.value) void load();
});
watch(dialogVisible, visible => {
  if (!visible) resetDialogState();
});
onBeforeUnmount(resetDialogState);
</script>

<style scoped lang="scss">
.client-management-page {
  min-width: 0;
}

:deep(.el-input-number) {
  width: 100%;
}
</style>
