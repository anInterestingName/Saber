<template>
  <div class="datasource-management-page">
    <list-panel title="数据源列表">
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
        <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="driverClass" label="驱动类" min-width="220" show-overflow-tooltip />
        <el-table-column prop="username" label="用户名" min-width="150" show-overflow-tooltip />
        <el-table-column prop="url" label="连接地址" min-width="320" show-overflow-tooltip />
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
              @view="openDetail(row as DatasourceListItem, 'view')"
              @edit="openDetail(row as DatasourceListItem, 'edit')"
              @delete="handleRowDelete(row as DatasourceListItem)"
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
      entity-name="数据源"
      :submitting="submitting"
      :loading="detailLoading"
      width="720px"
      destroy-on-close
      @confirm="handleSubmit"
      @cancel="handleDialogCancel"
    >
      <el-result v-if="detailFailed" status="error" title="数据源详情加载失败">
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
        label-width="88px"
      >
        <el-row :gutter="24">
          <el-col :xs="24" :sm="12">
            <el-form-item label="名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入数据源名称" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="驱动类" prop="driverClass">
              <el-select v-model="form.driverClass" placeholder="请选择驱动类">
                <el-option
                  v-for="driver in driverOptions"
                  :key="driver"
                  :label="driver"
                  :value="driver"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" placeholder="请输入用户名" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="密码" prop="password">
              <el-input v-model="form.password" type="password" placeholder="请输入密码" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="连接地址" prop="url">
              <el-input v-model="form.url" placeholder="请输入连接地址" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" />
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
import ListPanel from '@/components/list-panel/main.vue';
import ListPagination from '@/components/list-pagination/main.vue';
import FormDialog from '@/components/form-dialog/main.vue';
import RowActions from '@/components/row-actions/main.vue';
import { useCrudPermission } from '@/composables/useCrudPermission';
import { usePagedList } from '@/composables/usePagedList';
import { useRemoteDetail } from '@/composables/useRemoteDetail';
import { useTableSelection } from '@/composables/useTableSelection';
import { add, getDetail, getList, remove, update } from '@/api/tool/datasource';
import type { CrudMode } from '@/types/crud';
import type { PaginationChange } from '@/types/list';

interface DatasourceEntity {
  id: string;
  name?: string;
  driverClass?: string;
  username?: string;
  password?: string;
  url?: string;
  remark?: string;
}

type DatasourceListItem = Omit<DatasourceEntity, 'password'> & { hasPassword: boolean };
type DatasourceQuery = object;
type DatasourceForm = Partial<DatasourceEntity>;
type DatasourceListResponse = Awaited<ReturnType<typeof getList>>;

const driverOptions = [
  'com.mysql.cj.jdbc.Driver',
  'org.postgresql.Driver',
  'oracle.jdbc.OracleDriver',
];
const createInitialQuery = (): DatasourceQuery => ({});
const createInitialForm = (): DatasourceForm => ({
  name: '',
  driverClass: undefined,
  username: '',
  password: '',
  url: '',
  remark: '',
});
const toListItem = (entity: DatasourceEntity): DatasourceListItem => {
  const { password, ...item } = entity;
  return { ...item, hasPassword: Boolean(password) };
};

const form = ref<DatasourceForm>(createInitialForm());
const mode = ref<CrudMode>('add');
const dialogVisible = ref(false);
const submitting = ref(false);
const detailId = ref<string>();
const formRef = ref<InstanceType<typeof ElForm>>();
const tableRef = ref<TableInstance>();

const formRules: FormRules = {
  name: [{ required: true, message: '请输入数据源名称', trigger: 'blur' }],
  driverClass: [{ required: true, message: '请选择驱动类', trigger: 'change' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  url: [{ required: true, message: '请输入连接地址', trigger: 'blur' }],
};

const { data, page, loading, load, refresh } = usePagedList<
  DatasourceListItem,
  DatasourceQuery,
  DatasourceListResponse
>({
  fetcher: (current, size, query) => getList(current, size, query),
  resolveResponse: response => ({
    records: response.data.data.records.map((item: DatasourceEntity) => toListItem(item)),
    total: response.data.data.total,
  }),
  createInitialQuery,
});
const { selectedRows, ids, handleSelectionChange, clearSelection } =
  useTableSelection<DatasourceListItem>();
const {
  add: canAdd,
  view: canView,
  edit: canEdit,
  delete: canDelete,
} = useCrudPermission('datasource');
const {
  data: detailData,
  loading: detailLoading,
  failed: detailFailed,
  load: loadDetail,
  clear: clearDetail,
} = useRemoteDetail<DatasourceEntity, string>(async id => {
  const response = await getDetail(id);
  return response.data.data;
});

const clearTableSelection = () => {
  clearSelection();
  tableRef.value?.clearSelection();
};

watch(data, clearTableSelection, { flush: 'post' });

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

const openDetail = (row: DatasourceListItem, dialogMode: 'edit' | 'view') => {
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
    // Axios 已处理错误提示，保留弹窗和密码输入供用户重试。
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

const handleRowDelete = (row: DatasourceListItem) => {
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
.datasource-management-page {
  min-width: 0;
}
</style>
