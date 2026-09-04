<template>
  <div class="post-management-page">
    <search-panel
      :model="searchForm"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="岗位类型">
          <dict-select
            v-model="searchForm.category"
            code="post_category"
            value-type="number"
            placeholder="请选择岗位类型"
          />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="岗位编号">
          <el-input v-model="searchForm.postCode" clearable placeholder="请输入岗位编号" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="岗位名称">
          <el-input v-model="searchForm.postName" clearable placeholder="请输入岗位名称" />
        </el-form-item>
      </el-col>
    </search-panel>

    <list-panel title="岗位列表">
      <template #actions>
        <el-button v-if="canAdd" type="primary" :icon="Plus" @click="openAdd">新增</el-button>
        <el-button v-if="canDelete" type="danger" plain :icon="Delete" @click="handleBatchDelete">
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
        <el-table-column
          v-if="website.tenantMode"
          prop="tenantId"
          label="所属租户"
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">{{ getTenantName(row.tenantId) }}</template>
        </el-table-column>
        <el-table-column prop="category" label="岗位类型" min-width="130">
          <template #default="{ row }">
            <dict-tag code="post_category" :value="row.category" value-type="number" />
          </template>
        </el-table-column>
        <el-table-column prop="postCode" label="岗位编号" min-width="160" show-overflow-tooltip />
        <el-table-column prop="postName" label="岗位名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="sort" label="岗位排序" width="110" align="center" />
        <el-table-column
          v-if="canView || canEdit || canDelete"
          label="操作"
          fixed="right"
          width="200"
          align="center"
        >
          <template #default="{ row }">
            <el-button
              v-if="canView"
              type="primary"
              link
              :icon="View"
              @click="openDetail(row as PostEntity, 'view')"
            >
              查看
            </el-button>
            <el-button
              v-if="canEdit"
              type="primary"
              link
              :icon="Edit"
              @click="openDetail(row as PostEntity, 'edit')"
            >
              编辑
            </el-button>
            <el-button
              v-if="canDelete"
              type="danger"
              link
              :icon="Delete"
              @click="handleRowDelete(row as PostEntity)"
            >
              删除
            </el-button>
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
      entity-name="岗位"
      :submitting="submitting"
      :loading="formLoading"
      destroy-on-close
      @confirm="handleSubmit"
      @cancel="handleDialogCancel"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        :disabled="mode === 'view' || formLoading"
        label-width="88px"
      >
        <el-row :gutter="24">
          <el-col v-if="website.tenantMode" :xs="24" :sm="12">
            <el-form-item label="所属租户" prop="tenantId">
              <el-select
                v-model="form.tenantId"
                clearable
                filterable
                :loading="tenantLoading"
                placeholder="请选择所属租户"
                @visible-change="handleTenantVisibleChange"
              >
                <el-option
                  v-for="tenant in tenantOptions"
                  :key="tenant.tenantId"
                  :label="tenant.tenantName"
                  :value="tenant.tenantId"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="岗位类型" prop="category">
              <dict-select
                v-model="form.category"
                code="post_category"
                value-type="number"
                :disabled="mode === 'view'"
                placeholder="请选择岗位类型"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="岗位编号" prop="postCode">
              <el-input v-model="form.postCode" maxlength="100" placeholder="请输入岗位编号" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="岗位名称" prop="postName">
              <el-input v-model="form.postName" maxlength="100" placeholder="请输入岗位名称" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="岗位排序" prop="sort">
              <el-input-number v-model="form.sort" :min="0" :max="9999" controls-position="right" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="岗位描述" prop="remark">
              <el-input
                v-model="form.remark"
                type="textarea"
                :rows="4"
                maxlength="500"
                show-word-limit
                placeholder="请输入岗位描述"
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
import { Delete, Edit, Plus, Refresh, View } from '@element-plus/icons-vue';
import { ElForm, ElMessage, ElMessageBox, type FormRules, type TableInstance } from 'element-plus';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import ListPagination from '@/components/list-pagination/main.vue';
import FormDialog from '@/components/form-dialog/main.vue';
import DictSelect from '@/components/dict-select/main.vue';
import DictTag from '@/components/dict-tag/main.vue';
import { useCrudPermission } from '@/composables/useCrudPermission';
import { usePagedList } from '@/composables/usePagedList';
import { useRemoteOptions } from '@/composables/useRemoteOptions';
import { useTableSelection } from '@/composables/useTableSelection';
import { add, getDetail, getList, remove, update } from '@/api/system/post';
import { getTenantSelect } from '@/api/system/tenant';
import website from '@/config/website';
import type { CrudMode } from '@/types/crud';
import type { PaginationChange } from '@/types/list';
import type { TenantOption } from '@/types/option';

interface PostEntity {
  id: string;
  tenantId?: string;
  category?: number;
  postCode?: string;
  postName?: string;
  sort?: number;
  remark?: string;
}

interface PostQuery {
  category?: number;
  postCode?: string;
  postName?: string;
}

type PostForm = Partial<PostEntity>;
type PostListResponse = Awaited<ReturnType<typeof getList>>;

const createInitialQuery = (): PostQuery => ({});
const createInitialForm = (): PostForm => ({
  tenantId: undefined,
  category: undefined,
  postCode: '',
  postName: '',
  sort: undefined,
  remark: '',
});

const searchForm = ref<PostQuery>(createInitialQuery());
const form = ref<PostForm>(createInitialForm());
const mode = ref<CrudMode>('add');
const dialogVisible = ref(false);
const submitting = ref(false);
const formLoading = ref(false);
const formRef = ref<InstanceType<typeof ElForm>>();
const tableRef = ref<TableInstance>();

const formRules: FormRules = {
  tenantId: [{ required: website.tenantMode, message: '请选择所属租户', trigger: 'change' }],
  category: [{ required: true, message: '请选择岗位类型', trigger: 'change' }],
  postCode: [{ required: true, message: '请输入岗位编号', trigger: 'blur' }],
  postName: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }],
  sort: [{ required: true, message: '请输入岗位排序', trigger: 'change' }],
};

const { data, page, loading, load, search, reset, refresh } = usePagedList<
  PostEntity,
  PostQuery,
  PostListResponse
>({
  fetcher: (current, size, query) => getList(current, size, query),
  resolveResponse: response => ({
    records: response.data.data.records,
    total: response.data.data.total,
  }),
  createInitialQuery,
});
const { selectedRows, ids, handleSelectionChange, clearSelection } =
  useTableSelection<PostEntity>();
const { add: canAdd, view: canView, edit: canEdit, delete: canDelete } = useCrudPermission('post');
const {
  options: tenantOptions,
  loading: tenantLoading,
  load: loadTenantOptions,
} = useRemoteOptions<TenantOption>(async () => {
  const response = await getTenantSelect();
  return response.data.data;
});

const clearTableSelection = () => {
  clearSelection();
  tableRef.value?.clearSelection();
};

watch(data, clearTableSelection, { flush: 'post' });

const getTenantName = (tenantId?: string) => {
  if (!tenantId) return '-';
  return tenantOptions.value.find(tenant => tenant.tenantId === tenantId)?.tenantName ?? tenantId;
};

const handleTenantVisibleChange = (visible: boolean) => {
  if (visible && tenantOptions.value.length === 0 && !tenantLoading.value) {
    void loadTenantOptions();
  }
};

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
  mode.value = 'add';
  form.value = createInitialForm();
  dialogVisible.value = true;
  nextTick(() => formRef.value?.clearValidate());
};

const openDetail = async (row: PostEntity, dialogMode: 'edit' | 'view') => {
  mode.value = dialogMode;
  form.value = createInitialForm();
  dialogVisible.value = true;
  formLoading.value = true;
  try {
    const response = await getDetail(row.id);
    form.value = { ...response.data.data };
    await nextTick();
    formRef.value?.clearValidate();
  } catch {
    dialogVisible.value = false;
  } finally {
    formLoading.value = false;
  }
};

const handleDialogCancel = () => {
  formRef.value?.clearValidate();
};

const handleSubmit = async () => {
  if (!formRef.value || submitting.value || formLoading.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload = { ...form.value };
    if (!website.tenantMode) delete payload.tenantId;
    const submit = mode.value === 'add' ? add : update;
    await submit(payload);
    dialogVisible.value = false;
    ElMessage.success('操作成功!');
    clearTableSelection();
    await refresh();
  } catch {
    // Axios 已处理错误提示，保留弹窗和输入供用户修正后重试。
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
    // 用户取消或接口失败时保持当前列表状态。
  }
};

const handleRowDelete = (row: PostEntity) => {
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
  if (website.tenantMode) void loadTenantOptions();
});
</script>

<style scoped lang="scss">
.post-management-page {
  min-width: 0;
}

:deep(.el-table .el-button + .el-button) {
  margin-left: 4px;
}

:deep(.el-input-number) {
  width: 100%;
}
</style>
