<template>
  <div class="code-management-page">
    <search-panel
      :model="searchForm"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="数据源">
          <el-select
            v-model="searchForm.datasourceId"
            clearable
            filterable
            :loading="datasourceLoading"
            placeholder="请选择数据源"
          >
            <el-option
              v-for="source in datasourceOptions"
              :key="source.id"
              :label="source.name"
              :value="source.id"
            />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="模块名">
          <el-input v-model="searchForm.codeName" clearable placeholder="请输入模块名" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="服务名">
          <el-input v-model="searchForm.serviceName" clearable placeholder="请输入服务名" />
        </el-form-item>
      </el-col>
    </search-panel>

    <list-panel title="代码生成配置">
      <template #actions>
        <el-button
          v-if="canAdd"
          type="primary"
          :icon="Plus"
          :disabled="generating"
          @click="openAdd"
        >
          新增
        </el-button>
        <el-button
          v-if="canDelete"
          type="danger"
          plain
          :icon="Delete"
          :disabled="generating"
          @click="handleBatchDelete"
        >
          删除
        </el-button>
        <el-button
          v-if="isAdmin"
          type="primary"
          plain
          :icon="Cpu"
          :loading="generating"
          @click="handleBuild"
        >
          代码生成
        </el-button>
      </template>
      <template #tools>
        <el-tooltip content="刷新" placement="top">
          <el-button
            circle
            :icon="Refresh"
            :loading="loading"
            :disabled="generating"
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
        <el-table-column prop="datasourceId" label="数据源" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ getDatasourceName(row.datasourceId) }}</template>
        </el-table-column>
        <el-table-column prop="codeName" label="模块名" min-width="150" show-overflow-tooltip />
        <el-table-column prop="serviceName" label="服务名" min-width="160" show-overflow-tooltip />
        <el-table-column prop="tableName" label="表名" min-width="180" show-overflow-tooltip />
        <el-table-column prop="packageName" label="包名" min-width="220" show-overflow-tooltip />
        <el-table-column prop="baseMode" label="基础业务" width="110" align="center">
          <template #default="{ row }">
            <dict-tag code="yes_no" :value="row.baseMode" value-type="number" />
          </template>
        </el-table-column>
        <el-table-column prop="wrapMode" label="包装器" width="100" align="center">
          <template #default="{ row }">
            <dict-tag code="yes_no" :value="row.wrapMode" value-type="number" />
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="260" align="center">
          <template #default="{ row }">
            <row-actions
              :show-view="canView"
              :show-edit="canEdit"
              :show-delete="canDelete"
              :disabled="generating || copyingId !== ''"
              @view="openDetail(row as CodeEntity, 'view')"
              @edit="openDetail(row as CodeEntity, 'edit')"
              @delete="handleRowDelete(row as CodeEntity)"
            >
              <template v-if="canEdit" #extra>
                <el-button
                  type="primary"
                  link
                  :icon="CopyDocument"
                  :loading="copyingId === row.id"
                  :disabled="generating || (copyingId !== '' && copyingId !== row.id)"
                  @click="handleCopy(row as CodeEntity)"
                >
                  复制
                </el-button>
              </template>
            </row-actions>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <list-pagination
          v-model:current-page="page.currentPage"
          v-model:page-size="page.pageSize"
          :total="page.total"
          :disabled="loading || generating"
          @change="handlePageChange"
        />
      </template>
    </list-panel>

    <form-dialog
      v-model="dialogVisible"
      :mode="mode"
      entity-name="代码配置"
      :submitting="submitting"
      :loading="detailLoading || datasourceLoading"
      width="860px"
      destroy-on-close
      @confirm="handleSubmit"
      @cancel="handleDialogCancel"
    >
      <el-result v-if="detailFailed" icon="error" title="代码配置详情加载失败">
        <template #extra>
          <el-button type="primary" @click="retryDetail">重试</el-button>
        </template>
      </el-result>
      <el-form
        v-else
        ref="formRef"
        :model="form"
        :rules="formRules"
        :disabled="mode === 'view' || detailLoading || datasourceLoading || datasourceFailed"
        label-width="108px"
      >
        <el-alert v-if="datasourceFailed" type="error" :closable="false" show-icon>
          <template #title>
            数据源选项加载失败
            <el-button type="primary" link @click="loadDatasourceOptions">重试</el-button>
          </template>
        </el-alert>
        <el-row :gutter="24">
          <el-col :xs="24" :sm="12">
            <el-form-item label="数据源" prop="datasourceId">
              <el-select v-model="form.datasourceId" filterable :loading="datasourceLoading">
                <el-option
                  v-for="source in datasourceOptions"
                  :key="source.id"
                  :label="source.name"
                  :value="source.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="模块名" prop="codeName">
              <el-input v-model="form.codeName" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="服务名" prop="serviceName">
              <el-input v-model="form.serviceName" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="表名" prop="tableName">
              <el-input v-model="form.tableName" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="表前缀" prop="tablePrefix">
              <el-input v-model="form.tablePrefix" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="主键名" prop="pkName">
              <el-input v-model="form.pkName" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="包名" prop="packageName">
              <el-input v-model="form.packageName" maxlength="200" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="基础业务" prop="baseMode">
              <dict-select
                v-model="form.baseMode"
                code="yes_no"
                value-type="number"
                :disabled="mode === 'view'"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="包装器" prop="wrapMode">
              <dict-select
                v-model="form.wrapMode"
                code="yes_no"
                value-type="number"
                :disabled="mode === 'view'"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="后端生成路径" prop="apiPath">
              <el-input v-model="form.apiPath" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="前端生成路径" prop="webPath">
              <el-input v-model="form.webPath" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </form-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { CopyDocument, Cpu, Delete, Plus, Refresh } from '@element-plus/icons-vue';
import { ElForm, ElMessage, ElMessageBox, type FormRules, type TableInstance } from 'element-plus';
import { useStore } from 'vuex';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import ListPagination from '@/components/list-pagination/main.vue';
import RowActions from '@/components/row-actions/main.vue';
import FormDialog from '@/components/form-dialog/main.vue';
import DictSelect from '@/components/dict-select/main.vue';
import DictTag from '@/components/dict-tag/main.vue';
import { useCrudPermission } from '@/composables/useCrudPermission';
import { usePagedList } from '@/composables/usePagedList';
import { useRemoteDetail } from '@/composables/useRemoteDetail';
import { useRemoteOptions } from '@/composables/useRemoteOptions';
import { useTableSelection } from '@/composables/useTableSelection';
import { add, build, copy, getCode, getList, remove, update } from '@/api/tool/code';
import { getDatasourceSelect, type DatasourceOption } from '@/api/tool/datasource';
import type { CrudMode } from '@/types/crud';
import type { PaginationChange } from '@/types/list';

interface CodeEntity {
  id: string;
  datasourceId?: string;
  codeName?: string;
  serviceName?: string;
  tableName?: string;
  tablePrefix?: string;
  pkName?: string;
  packageName?: string;
  baseMode?: number;
  wrapMode?: number;
  apiPath?: string;
  webPath?: string;
}

interface CodeQuery {
  datasourceId?: string;
  codeName?: string;
  serviceName?: string;
}

type CodeForm = Partial<CodeEntity>;
type CodeListResponse = Awaited<ReturnType<typeof getList<CodeEntity>>>;

const createInitialQuery = (): CodeQuery => ({});
const createInitialForm = (): CodeForm => ({
  datasourceId: undefined,
  codeName: '',
  serviceName: '',
  tableName: '',
  tablePrefix: '',
  pkName: '',
  packageName: '',
  baseMode: undefined,
  wrapMode: undefined,
  apiPath: '',
  webPath: '',
});

const store = useStore();
const isAdmin = computed(() => store.getters.userInfo?.authority?.includes('admin') ?? false);
const searchForm = ref<CodeQuery>(createInitialQuery());
const form = ref<CodeForm>(createInitialForm());
const mode = ref<CrudMode>('add');
const dialogVisible = ref(false);
const submitting = ref(false);
const generating = ref(false);
const copyingId = ref('');
const detailId = ref<string>();
const formRef = ref<InstanceType<typeof ElForm>>();
const tableRef = ref<TableInstance>();

const formRules: FormRules = {
  datasourceId: [{ required: true, message: '请选择数据源', trigger: 'change' }],
  codeName: [{ required: true, message: '请输入模块名', trigger: 'blur' }],
  serviceName: [{ required: true, message: '请输入服务名', trigger: 'blur' }],
  tableName: [{ required: true, message: '请输入表名', trigger: 'blur' }],
  tablePrefix: [{ required: true, message: '请输入表前缀', trigger: 'blur' }],
  pkName: [{ required: true, message: '请输入主键名', trigger: 'blur' }],
  packageName: [{ required: true, message: '请输入包名', trigger: 'blur' }],
  baseMode: [{ required: true, message: '请选择基础业务', trigger: 'change' }],
  wrapMode: [{ required: true, message: '请选择包装器', trigger: 'change' }],
  apiPath: [{ required: true, message: '请输入后端生成路径', trigger: 'blur' }],
  webPath: [{ required: true, message: '请输入前端生成路径', trigger: 'blur' }],
};

const { data, page, loading, load, search, reset, refresh } = usePagedList<
  CodeEntity,
  CodeQuery,
  CodeListResponse
>({
  fetcher: (current, size, query) => getList<CodeEntity>(current, size, query),
  resolveResponse: response => ({
    records: response.data.data.records,
    total: response.data.data.total,
  }),
  createInitialQuery,
});
const selection = useTableSelection<CodeEntity>();
const { selectedRows, ids, handleSelectionChange, clearSelection } = selection;
const { add: canAdd, view: canView, edit: canEdit, delete: canDelete } = useCrudPermission('code');
const detail = useRemoteDetail<CodeEntity, string>(async id => {
  const response = await getCode<CodeEntity>(id);
  return response.data.data;
});
const datasourceState = useRemoteOptions<DatasourceOption>(async () => {
  const response = await getDatasourceSelect();
  return response.data.data;
});
const {
  options: datasourceOptions,
  loading: datasourceLoading,
  failed: datasourceFailed,
  load: loadDatasourceOptions,
} = datasourceState;
const { data: detailData, loading: detailLoading, failed: detailFailed } = detail;

const clearTableSelection = () => {
  clearSelection();
  tableRef.value?.clearSelection();
};
watch(data, clearTableSelection, { flush: 'post' });

const getDatasourceName = (id?: string) =>
  datasourceOptions.value.find(item => item.id === id)?.name ?? id ?? '-';
const handleSearch = () => void search({ ...searchForm.value });
const handleReset = () => {
  searchForm.value = createInitialQuery();
  void reset();
};
const handlePageChange = (nextPage: PaginationChange) => {
  page.value = { ...page.value, ...nextPage };
  void load();
};

const resetDialogState = () => {
  detail.clear();
  detailId.value = undefined;
  formRef.value?.clearValidate();
};
const openAdd = () => {
  resetDialogState();
  mode.value = 'add';
  form.value = createInitialForm();
  dialogVisible.value = true;
  if (datasourceOptions.value.length === 0) void loadDatasourceOptions();
  nextTick(() => formRef.value?.clearValidate());
};
const requestDetail = async () => {
  if (!detailId.value) return;
  form.value = createInitialForm();
  const entity = await detail.load(detailId.value);
  if (entity) form.value = { ...entity };
  await nextTick();
  formRef.value?.clearValidate();
};
const openDetail = (row: CodeEntity, dialogMode: 'edit' | 'view') => {
  resetDialogState();
  detailId.value = row.id;
  mode.value = dialogMode;
  form.value = createInitialForm();
  dialogVisible.value = true;
  if (datasourceOptions.value.length === 0) void loadDatasourceOptions();
  void requestDetail();
};
const retryDetail = () => void requestDetail();
const handleDialogCancel = () => resetDialogState();
const handleSubmit = async () => {
  if (
    !formRef.value ||
    submitting.value ||
    detailLoading.value ||
    detailFailed.value ||
    datasourceLoading.value ||
    datasourceFailed.value ||
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
    // Axios 已处理接口错误，保留路径和生成参数供重试。
  } finally {
    submitting.value = false;
  }
};

const confirmDelete = async (deleteIds: string) => {
  if (generating.value) return;
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
    // 用户取消或接口失败时保留当前列表和选择。
  }
};
const handleRowDelete = (row: CodeEntity) => void confirmDelete(row.id);
const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  void confirmDelete(ids.value);
};

const handleCopy = async (row: CodeEntity) => {
  if (copyingId.value || generating.value) return;
  copyingId.value = row.id;
  try {
    await copy(row.id);
    await refresh();
    ElMessage.success('复制成功!');
  } catch {
    // Axios 已处理接口错误。
  } finally {
    copyingId.value = '';
  }
};
const handleBuild = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `将生成 ${selectedRows.value.length} 个模块，文件会写入配置的服务端目录且无法由前端撤销。是否继续?`,
      '代码生成确认',
      {
        confirmButtonText: '确定生成',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    generating.value = true;
    await build(ids.value);
    clearTableSelection();
    await refresh();
    ElMessage.success('代码生成成功!');
  } catch (error) {
    if (generating.value) ElMessage.warning('代码生成失败，请检查配置的目标目录是否存在部分文件');
  } finally {
    generating.value = false;
  }
};

onMounted(() => {
  void load();
  void loadDatasourceOptions();
});
</script>

<style scoped lang="scss">
.code-management-page {
  min-width: 0;
}

:deep(.el-select) {
  width: 100%;
}
</style>
