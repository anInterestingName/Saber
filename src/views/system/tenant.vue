<template>
  <div class="tenant-management-page">
    <search-panel
      :model="searchForm"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="租户 ID">
          <el-input v-model="searchForm.tenantId" clearable placeholder="请输入租户 ID" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="租户名称">
          <el-input v-model="searchForm.tenantName" clearable placeholder="请输入租户名称" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="联系人">
          <el-input v-model="searchForm.linkman" clearable placeholder="请输入联系人" />
        </el-form-item>
      </el-col>
    </search-panel>

    <list-panel title="租户列表">
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
        <el-table-column prop="tenantId" label="租户 ID" min-width="150" show-overflow-tooltip />
        <el-table-column prop="tenantName" label="租户名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="linkman" label="联系人" min-width="130" show-overflow-tooltip />
        <el-table-column
          prop="contactNumber"
          label="联系电话"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column prop="address" label="联系地址" min-width="220" show-overflow-tooltip />
        <el-table-column prop="domain" label="域名地址" min-width="200" show-overflow-tooltip />
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
              @view="openView(row as TenantEntity)"
              @edit="openEdit(row as TenantEntity)"
              @delete="handleRowDelete(row as TenantEntity)"
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
      entity-name="租户"
      :submitting="submitting"
      destroy-on-close
      @confirm="handleSubmit"
      @cancel="handleDialogCancel"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        :disabled="mode === 'view'"
        label-width="88px"
      >
        <el-form-item v-if="mode === 'view'" label="租户 ID">
          <el-input v-model="form.tenantId" />
        </el-form-item>
        <el-form-item label="租户名称" prop="tenantName">
          <el-input v-model="form.tenantName" placeholder="请输入租户名称" />
        </el-form-item>
        <el-form-item label="联系人" prop="linkman">
          <el-input v-model="form.linkman" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="联系电话" prop="contactNumber">
          <el-input v-model="form.contactNumber" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="域名地址" prop="domain">
          <el-input v-model="form.domain" placeholder="请输入域名地址" />
        </el-form-item>
        <el-form-item label="联系地址" prop="address">
          <el-input v-model="form.address" type="textarea" :rows="4" placeholder="请输入联系地址" />
        </el-form-item>
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
import { useTableSelection } from '@/composables/useTableSelection';
import { add, getList, remove, update } from '@/api/system/tenant';
import type { CrudMode } from '@/types/crud';
import type { PaginationChange } from '@/types/list';

interface TenantEntity {
  id: string;
  tenantId?: string;
  tenantName?: string;
  linkman?: string;
  contactNumber?: string;
  address?: string;
  domain?: string;
}

interface TenantQuery {
  tenantId?: string;
  tenantName?: string;
  linkman?: string;
}

type TenantForm = Partial<TenantEntity>;
type TenantListResponse = Awaited<ReturnType<typeof getList>>;

const createInitialQuery = (): TenantQuery => ({});
const createInitialForm = (): TenantForm => ({
  tenantName: '',
  linkman: '',
  contactNumber: '',
  address: '',
  domain: '',
});

const searchForm = ref<TenantQuery>(createInitialQuery());
const form = ref<TenantForm>(createInitialForm());
const mode = ref<CrudMode>('add');
const dialogVisible = ref(false);
const submitting = ref(false);
const formRef = ref<InstanceType<typeof ElForm>>();
const tableRef = ref<TableInstance>();

const formRules: FormRules = {
  tenantName: [{ required: true, message: '请输入租户名称', trigger: 'blur' }],
  linkman: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
};

const { data, page, loading, load, search, reset, refresh } = usePagedList<
  TenantEntity,
  TenantQuery,
  TenantListResponse
>({
  fetcher: (current, size, query) => getList(current, size, query),
  resolveResponse: response => ({
    records: response.data.data.records,
    total: response.data.data.total,
  }),
  createInitialQuery,
});
const { selectedRows, ids, handleSelectionChange, clearSelection } =
  useTableSelection<TenantEntity>();
const {
  add: canAdd,
  view: canView,
  edit: canEdit,
  delete: canDelete,
} = useCrudPermission('tenant');

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

const prepareDialog = (dialogMode: CrudMode, row?: TenantEntity) => {
  mode.value = dialogMode;
  form.value = row ? { ...row } : createInitialForm();
  dialogVisible.value = true;
  nextTick(() => formRef.value?.clearValidate());
};

const openAdd = () => prepareDialog('add');
const openView = (row: TenantEntity) => prepareDialog('view', row);
const openEdit = (row: TenantEntity) => prepareDialog('edit', row);

const resetDialogState = () => {
  formRef.value?.clearValidate();
  form.value = createInitialForm();
};

const handleDialogCancel = () => {
  resetDialogState();
};

const handleSubmit = async () => {
  if (!formRef.value || submitting.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload = { ...form.value };
    if (mode.value === 'add') delete payload.tenantId;
    const submit = mode.value === 'add' ? add : update;
    await submit(payload);
    dialogVisible.value = false;
    resetDialogState();
    clearTableSelection();
    await refresh();
    ElMessage.success('操作成功!');
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
    // 用户取消或接口失败时保留当前列表和选择状态。
  }
};

const handleRowDelete = (row: TenantEntity) => {
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
.tenant-management-page {
  min-width: 0;
}
</style>
