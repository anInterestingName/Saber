<template>
  <page-container
    class="param-management-page"
    title="参数管理"
    description="维护系统运行参数，参数键名用于业务配置读取。"
    :show-breadcrumb="false"
  >
    <search-panel
      :model="searchForm"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item label="参数名称">
          <el-input v-model="searchForm.paramName" clearable placeholder="请输入参数名称" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item label="参数键名">
          <el-input v-model="searchForm.paramKey" clearable placeholder="请输入参数键名" />
        </el-form-item>
      </el-col>
    </search-panel>

    <list-panel title="参数列表">
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
        <el-table-column prop="paramName" label="参数名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="paramKey" label="参数键名" min-width="220" show-overflow-tooltip />
        <el-table-column prop="paramValue" label="参数键值" min-width="260" show-overflow-tooltip />
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
              @click="openView(row as ParamEntity)"
            >
              查看
            </el-button>
            <el-button
              v-if="canEdit"
              type="primary"
              link
              :icon="Edit"
              @click="openEdit(row as ParamEntity)"
            >
              编辑
            </el-button>
            <el-button
              v-if="canDelete"
              type="danger"
              link
              :icon="Delete"
              @click="handleRowDelete(row as ParamEntity)"
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
      entity-name="参数"
      size="sm"
      :subtitle="mode === 'view' ? '查看参数配置与当前值' : '编辑前请确认参数键名与用途'"
      :submitting="submitting"
      :dirty="dirty"
      :can-edit="canEdit"
      destroy-on-close
      @edit="handleViewEdit"
      @confirm="handleSubmit"
      @cancel="handleDialogCancel"
    >
      <detail-section v-if="mode === 'view'" title="基本信息" :columns="1">
        <field-value label="参数名称" :value="form.paramName" />
        <field-value label="参数键名" :value="form.paramKey" copyable />
        <field-value label="参数键值" :value="form.paramValue" multiline />
      </detail-section>
      <el-form v-else ref="formRef" :model="form" :rules="formRules" label-width="88px">
        <form-section title="基本信息" :columns="1">
          <el-form-item label="参数名称" prop="paramName">
            <el-input v-model="form.paramName" maxlength="100" placeholder="请输入参数名称" />
          </el-form-item>
          <el-form-item label="参数键名" prop="paramKey">
            <el-input v-model="form.paramKey" maxlength="100" placeholder="请输入参数键名" />
          </el-form-item>
          <el-form-item label="参数键值" prop="paramValue">
            <el-input
              v-model="form.paramValue"
              type="textarea"
              :rows="4"
              maxlength="1000"
              show-word-limit
              placeholder="请输入参数键值"
            />
          </el-form-item>
        </form-section>
      </el-form>
    </form-dialog>
  </page-container>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { Delete, Edit, Plus, Refresh, View } from '@element-plus/icons-vue';
import { ElForm, ElMessage, ElMessageBox, type FormRules, type TableInstance } from 'element-plus';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import ListPagination from '@/components/list-pagination/main.vue';
import FormDialog from '@/components/form-dialog/main.vue';
import PageContainer from '@/components/page-container/main.vue';
import FormSection from '@/components/form-section/main.vue';
import DetailSection from '@/components/detail-section/main.vue';
import FieldValue from '@/components/field-value/main.vue';
import { useCrudPermission } from '@/composables/useCrudPermission';
import { usePagedList } from '@/composables/usePagedList';
import { useTableSelection } from '@/composables/useTableSelection';
import { add, getList, remove, update } from '@/api/system/param';
import type { CrudMode } from '@/types/crud';
import type { PaginationChange } from '@/types/list';

interface ParamEntity {
  id: string;
  paramName?: string;
  paramKey?: string;
  paramValue?: string;
}

interface ParamQuery {
  paramName?: string;
  paramKey?: string;
}

type ParamForm = Partial<ParamEntity>;
type ParamListResponse = Awaited<ReturnType<typeof getList>>;

const createInitialQuery = (): ParamQuery => ({});
const createInitialForm = (): ParamForm => ({
  paramName: '',
  paramKey: '',
  paramValue: '',
});

const searchForm = ref<ParamQuery>(createInitialQuery());
const form = ref<ParamForm>(createInitialForm());
const mode = ref<CrudMode>('add');
const dialogVisible = ref(false);
const submitting = ref(false);
const dirty = ref(false);
const initialFormSnapshot = ref('');
const formRef = ref<InstanceType<typeof ElForm>>();
const tableRef = ref<TableInstance>();

const formRules: FormRules = {
  paramName: [{ required: true, message: '请输入参数名称', trigger: 'blur' }],
  paramKey: [{ required: true, message: '请输入参数键名', trigger: 'blur' }],
  paramValue: [{ required: true, message: '请输入参数键值', trigger: 'blur' }],
};

const { data, page, loading, load, search, reset, refresh } = usePagedList<
  ParamEntity,
  ParamQuery,
  ParamListResponse
>({
  fetcher: (current, size, query) => getList(current, size, query),
  resolveResponse: response => ({
    records: response.data.data.records,
    total: response.data.data.total,
  }),
  createInitialQuery,
});
const { selectedRows, ids, handleSelectionChange, clearSelection } =
  useTableSelection<ParamEntity>();
const { add: canAdd, view: canView, edit: canEdit, delete: canDelete } = useCrudPermission('param');

const clearTableSelection = () => {
  clearSelection();
  tableRef.value?.clearSelection();
};

watch(data, clearTableSelection, { flush: 'post' });
watch(
  form,
  value => {
    dirty.value =
      dialogVisible.value &&
      mode.value !== 'view' &&
      JSON.stringify(value) !== initialFormSnapshot.value;
  },
  { deep: true }
);

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

const prepareDialog = (dialogMode: CrudMode, row?: ParamEntity) => {
  mode.value = dialogMode;
  form.value = row ? { ...row } : createInitialForm();
  initialFormSnapshot.value = JSON.stringify(form.value);
  dirty.value = false;
  dialogVisible.value = true;
  nextTick(() => formRef.value?.clearValidate());
};

const openAdd = () => prepareDialog('add');
const openView = (row: ParamEntity) => prepareDialog('view', row);
const openEdit = (row: ParamEntity) => prepareDialog('edit', row);

const handleViewEdit = () => {
  if (!canEdit.value) return;
  mode.value = 'edit';
  initialFormSnapshot.value = JSON.stringify(form.value);
  dirty.value = false;
  nextTick(() => formRef.value?.clearValidate());
};

const handleDialogCancel = () => {
  dirty.value = false;
  initialFormSnapshot.value = '';
  formRef.value?.clearValidate();
};

const handleSubmit = async () => {
  if (!formRef.value || submitting.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const submit = mode.value === 'add' ? add : update;
    await submit({ ...form.value });
    dirty.value = false;
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

const handleRowDelete = (row: ParamEntity) => {
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
.param-management-page {
  min-width: 0;
}

:deep(.el-table .el-button + .el-button) {
  margin-left: 4px;
}
</style>
