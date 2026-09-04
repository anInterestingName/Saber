<template>
  <div class="tree-management-page">
    <search-panel
      :model="searchForm"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="部门名称">
          <el-input v-model="searchForm.deptName" clearable placeholder="请输入部门名称" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="部门全称">
          <el-input v-model="searchForm.fullName" clearable placeholder="请输入部门全称" />
        </el-form-item>
      </el-col>
      <el-col v-if="website.tenantMode" :xs="24" :sm="12" :md="6">
        <el-form-item label="所属租户">
          <el-select v-model="searchForm.tenantId" clearable filterable :loading="tenantLoading">
            <el-option
              v-for="tenant in tenantOptions"
              :key="tenant.tenantId"
              :label="tenant.tenantName"
              :value="tenant.tenantId"
            />
          </el-select>
        </el-form-item>
      </el-col>
    </search-panel>

    <list-panel title="部门列表">
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
        :expand-row-keys="tableExpandedRowKeys"
        :tree-props="{ children: 'children' }"
        @expand-change="handleTableExpandChange"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column type="index" label="#" width="60" align="center" />
        <el-table-column prop="deptName" label="部门名称" min-width="200" show-overflow-tooltip />
        <el-table-column
          v-if="website.tenantMode"
          prop="tenantId"
          label="所属租户"
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">{{ getTenantName(row.tenantId) }}</template>
        </el-table-column>
        <el-table-column prop="fullName" label="部门全称" min-width="220" show-overflow-tooltip />
        <el-table-column prop="sort" label="排序" width="100" align="center" />
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" fixed="right" width="300" align="center">
          <template #default="{ row }">
            <row-actions
              :show-view="canView"
              :show-edit="canEdit"
              :show-delete="canDelete"
              @view="openDetail(row as DeptEntity, 'view')"
              @edit="openDetail(row as DeptEntity, 'edit')"
              @delete="handleRowDelete(row as DeptEntity)"
            >
              <template v-if="isAdmin" #extra>
                <el-button type="primary" link :icon="Plus" @click="openChild(row as DeptEntity)">
                  新增子项
                </el-button>
              </template>
            </row-actions>
          </template>
        </el-table-column>
      </el-table>
    </list-panel>

    <form-dialog
      v-model="dialogVisible"
      :mode="mode"
      entity-name="部门"
      :submitting="submitting"
      :loading="formLoading"
      destroy-on-close
      @confirm="handleSubmit"
      @cancel="handleDialogCancel"
    >
      <el-alert v-if="detailFailed || parentOptionsFailed" type="error" :closable="false" show-icon>
        <template #title>数据加载失败，请关闭后重试</template>
      </el-alert>
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        :disabled="mode === 'view' || formLoading || detailFailed || parentOptionsFailed"
        label-width="88px"
      >
        <el-form-item label="部门名称" prop="deptName">
          <el-input v-model="form.deptName" maxlength="100" />
        </el-form-item>
        <el-form-item v-if="website.tenantMode && mode === 'view'" label="所属租户">
          <el-input :model-value="getTenantName(form.tenantId)" />
        </el-form-item>
        <el-form-item label="部门全称" prop="fullName">
          <el-input v-model="form.fullName" maxlength="200" />
        </el-form-item>
        <el-form-item label="上级部门" prop="parentId">
          <el-tree-select
            v-model="form.parentId"
            :data="parentOptions"
            :props="parentTreeProps"
            node-key="id"
            check-strictly
            clearable
            filterable
            :disabled="Boolean(parentContext)"
            placeholder="请选择上级部门"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
    </form-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { Delete, Plus, Refresh } from '@element-plus/icons-vue';
import { ElForm, ElMessage, ElMessageBox, type FormRules, type TableInstance } from 'element-plus';
import { storeToRefs } from 'pinia';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import RowActions from '@/components/row-actions/main.vue';
import FormDialog from '@/components/form-dialog/main.vue';
import { useCrudPermission } from '@/composables/useCrudPermission';
import { useUserStore } from '@/store/user';
import { useRemoteDetail } from '@/composables/useRemoteDetail';
import { useRemoteOptions } from '@/composables/useRemoteOptions';
import { useTableSelection } from '@/composables/useTableSelection';
import { useTreeList } from '@/composables/useTreeList';
import { add, getDept, getDeptTree, getList, remove, update } from '@/api/system/dept';
import { getTenantSelect } from '@/api/system/tenant';
import website from '@/config/website';
import type { CrudMode } from '@/types/crud';
import type { TenantOption } from '@/types/option';
import type { TreeNode } from '@/types/tree';

interface DeptEntity extends TreeNode {
  id: string;
  deptName?: string;
  tenantId?: string;
  fullName?: string;
  parentId?: string;
  sort?: number;
  remark?: string;
  children?: DeptEntity[];
}

interface DeptQuery {
  deptName?: string;
  fullName?: string;
  tenantId?: string;
}

type DeptForm = Partial<Omit<DeptEntity, 'children'>>;
type DeptListResponse = Awaited<ReturnType<typeof getList<DeptEntity>>>;

const createInitialQuery = (): DeptQuery => ({});
const createInitialForm = (): DeptForm => ({
  deptName: '',
  fullName: '',
  parentId: undefined,
  sort: undefined,
  remark: '',
});

const { isAdmin } = storeToRefs(useUserStore());
const searchForm = ref<DeptQuery>(createInitialQuery());
const form = ref<DeptForm>(createInitialForm());
const mode = ref<CrudMode>('add');
const dialogVisible = ref(false);
const submitting = ref(false);
const parentContext = ref<{ parentId: string }>();
const formRef = ref<InstanceType<typeof ElForm>>();
const tableRef = ref<TableInstance>();

const formRules: FormRules = {
  deptName: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
  fullName: [{ required: true, message: '请输入部门全称', trigger: 'blur' }],
  sort: [{ required: true, message: '请输入排序', trigger: 'change' }],
};

const { data, loading, expandedRowKeys, load, search, reset, refresh, handleExpandChange } =
  useTreeList<DeptEntity, DeptQuery, DeptListResponse>({
    fetcher: query => getList<DeptEntity>(query),
    resolveResponse: response => response.data.data,
    createInitialQuery,
  });
const { selectedRows, ids, handleSelectionChange, clearSelection } =
  useTableSelection<DeptEntity>();
const { add: canAdd, view: canView, edit: canEdit, delete: canDelete } = useCrudPermission('dept');
const detail = useRemoteDetail<DeptEntity, string>(async id => {
  const response = await getDept<DeptEntity>(id);
  return response.data.data;
});
const parentState = useRemoteOptions<TreeNode>(async () => {
  const response = await getDeptTree();
  return response.data.data;
});
const tenantState = useRemoteOptions<TenantOption>(async () => {
  const response = await getTenantSelect();
  return response.data.data;
});
const {
  options: parentOptions,
  loading: parentOptionsLoading,
  failed: parentOptionsFailed,
} = parentState;
const { options: tenantOptions, loading: tenantLoading } = tenantState;
const { loading: detailLoading, failed: detailFailed } = detail;
const formLoading = computed(() => detailLoading.value || parentOptionsLoading.value);
const tableExpandedRowKeys = computed(() => expandedRowKeys.value.map(String));
const currentAndDescendantIds = computed(() => {
  const keys = new Set<string>();
  const collect = (rows?: DeptEntity[]) =>
    rows?.forEach(row => {
      keys.add(row.id);
      collect(row.children);
    });
  const find = (rows: DeptEntity[]): DeptEntity | undefined => {
    for (const row of rows) {
      if (row.id === form.value.id) return row;
      const child = find(row.children ?? []);
      if (child) return child;
    }
  };
  collect(find(data.value)?.children);
  if (form.value.id) keys.add(form.value.id);
  return keys;
});
const parentTreeProps = computed(() => ({
  children: 'children',
  label: 'title',
  disabled: (node: TreeNode) => currentAndDescendantIds.value.has(String(node.id)),
}));

const clearTableSelection = () => {
  clearSelection();
  tableRef.value?.clearSelection();
};
watch(data, clearTableSelection, { flush: 'post' });

const getTenantName = (tenantId?: string) =>
  tenantOptions.value.find(tenant => tenant.tenantId === tenantId)?.tenantName ?? tenantId ?? '-';
const handleSearch = () => void search({ ...searchForm.value });
const handleTableExpandChange = (row: DeptEntity, expanded: boolean | DeptEntity[]) => {
  const isExpanded = Array.isArray(expanded)
    ? expanded.some(item => item.id === row.id)
    : expanded;
  handleExpandChange(row, isExpanded);
};
const handleReset = () => {
  searchForm.value = createInitialQuery();
  void reset();
};

const resetDialogState = () => {
  detail.clear();
  parentState.clear();
  parentContext.value = undefined;
  formRef.value?.clearValidate();
};

const openAdd = () => {
  resetDialogState();
  mode.value = 'add';
  form.value = createInitialForm();
  dialogVisible.value = true;
  void parentState.load();
  nextTick(() => formRef.value?.clearValidate());
};

const openChild = (row: DeptEntity) => {
  resetDialogState();
  mode.value = 'add';
  parentContext.value = { parentId: row.id };
  form.value = { ...createInitialForm(), parentId: row.id };
  dialogVisible.value = true;
  void parentState.load();
  nextTick(() => formRef.value?.clearValidate());
};

const openDetail = async (row: DeptEntity, dialogMode: 'edit' | 'view') => {
  resetDialogState();
  mode.value = dialogMode;
  form.value = createInitialForm();
  dialogVisible.value = true;
  const [, entity] = await Promise.all([parentState.load(), detail.load(row.id)]);
  if (entity) {
    const detailForm = { ...entity };
    delete detailForm.children;
    form.value = detailForm;
  }
  await nextTick();
  formRef.value?.clearValidate();
};

const handleDialogCancel = () => resetDialogState();

const handleSubmit = async () => {
  if (!formRef.value || submitting.value || formLoading.value || parentOptionsFailed.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload = { ...form.value };
    delete payload.tenantId;
    const submit = mode.value === 'add' ? add : update;
    await submit(payload);
    dialogVisible.value = false;
    resetDialogState();
    clearTableSelection();
    await refresh();
    ElMessage.success('操作成功!');
  } catch {
    // Axios 已处理接口错误，保留当前输入供重试。
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

const handleRowDelete = (row: DeptEntity) => void confirmDelete(row.id);
const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  void confirmDelete(ids.value);
};

onMounted(() => {
  void load();
  if (website.tenantMode) void tenantState.load();
});
</script>

<style scoped lang="scss">
.tree-management-page {
  min-width: 0;
}

:deep(.el-select),
:deep(.el-input-number),
:deep(.el-tree-select) {
  width: 100%;
}
</style>
