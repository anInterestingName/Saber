<template>
  <div class="tree-management-page">
    <search-panel
      :model="searchForm"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="字典编号">
          <el-input v-model="searchForm.code" clearable placeholder="请输入字典编号" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="字典名称">
          <el-input v-model="searchForm.dictValue" clearable placeholder="请输入字典名称" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="字典备注">
          <el-input v-model="searchForm.remark" clearable placeholder="请输入字典备注" />
        </el-form-item>
      </el-col>
    </search-panel>

    <list-panel title="字典列表">
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
        <el-table-column prop="code" label="字典编号" min-width="180" show-overflow-tooltip />
        <el-table-column prop="dictValue" label="字典名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="dictKey" label="字典键值" width="120" align="center" />
        <el-table-column prop="sort" label="字典排序" width="110" align="center" />
        <el-table-column prop="remark" label="字典备注" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" fixed="right" width="300" align="center">
          <template #default="{ row }">
            <row-actions
              :show-view="canView"
              :show-edit="canEdit"
              :show-delete="canDelete"
              @view="openDetail(row as DictEntity, 'view')"
              @edit="openDetail(row as DictEntity, 'edit')"
              @delete="handleRowDelete(row as DictEntity)"
            >
              <template v-if="isAdmin" #extra>
                <el-button type="primary" link :icon="Plus" @click="openChild(row as DictEntity)">
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
      entity-name="字典"
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
        <el-form-item label="字典编号" prop="code">
          <el-input v-model="form.code" :disabled="Boolean(parentContext)" maxlength="100" />
        </el-form-item>
        <el-form-item label="字典名称" prop="dictValue">
          <el-input v-model="form.dictValue" maxlength="100" />
        </el-form-item>
        <el-form-item label="上级字典" prop="parentId">
          <el-tree-select
            v-model="form.parentId"
            :data="parentOptions"
            :props="parentTreeProps"
            node-key="id"
            check-strictly
            clearable
            filterable
            :disabled="Boolean(parentContext)"
            placeholder="请选择上级字典"
          />
        </el-form-item>
        <el-row :gutter="24">
          <el-col :xs="24" :sm="12">
            <el-form-item label="字典键值" prop="dictKey">
              <el-input-number v-model="form.dictKey" :min="0" controls-position="right" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="字典排序" prop="sort">
              <el-input-number v-model="form.sort" :min="0" controls-position="right" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="字典备注" prop="remark">
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
import { add, getDict, getDictTree, getList, remove, update } from '@/api/system/dict';
import type { CrudMode } from '@/types/crud';
import type { TreeNode } from '@/types/tree';

interface DictEntity extends TreeNode {
  id: string;
  code?: string;
  dictValue?: string;
  parentId?: string;
  dictKey?: number;
  sort?: number;
  remark?: string;
  children?: DictEntity[];
}

interface DictQuery {
  code?: string;
  dictValue?: string;
  remark?: string;
}

type DictForm = Partial<Omit<DictEntity, 'children'>>;
type DictListResponse = Awaited<ReturnType<typeof getList<DictEntity>>>;

const createInitialQuery = (): DictQuery => ({});
const createInitialForm = (): DictForm => ({
  code: '',
  dictValue: '',
  parentId: undefined,
  dictKey: undefined,
  sort: undefined,
  remark: '',
});

const { isAdmin } = storeToRefs(useUserStore());
const searchForm = ref<DictQuery>(createInitialQuery());
const form = ref<DictForm>(createInitialForm());
const mode = ref<CrudMode>('add');
const dialogVisible = ref(false);
const submitting = ref(false);
const parentContext = ref<{ parentId: string; code: string }>();
const formRef = ref<InstanceType<typeof ElForm>>();
const tableRef = ref<TableInstance>();

const formRules: FormRules = {
  code: [{ required: true, message: '请输入字典编号', trigger: 'blur' }],
  dictValue: [{ required: true, message: '请输入字典名称', trigger: 'blur' }],
  dictKey: [{ required: true, message: '请输入字典键值', trigger: 'change' }],
  sort: [{ required: true, message: '请输入字典排序', trigger: 'change' }],
};

const { data, loading, expandedRowKeys, load, search, reset, refresh, handleExpandChange } =
  useTreeList<DictEntity, DictQuery, DictListResponse>({
    fetcher: query => getList<DictEntity>(query),
    resolveResponse: response => response.data.data,
    createInitialQuery,
  });
const { selectedRows, ids, handleSelectionChange, clearSelection } =
  useTableSelection<DictEntity>();
const { add: canAdd, view: canView, edit: canEdit, delete: canDelete } = useCrudPermission('dict');
const detail = useRemoteDetail<DictEntity, string>(async id => {
  const response = await getDict<DictEntity>(id);
  return response.data.data;
});
const parentState = useRemoteOptions<TreeNode>(async () => {
  const response = await getDictTree();
  return response.data.data;
});
const {
  options: parentOptions,
  loading: parentOptionsLoading,
  failed: parentOptionsFailed,
} = parentState;
const { loading: detailLoading, failed: detailFailed } = detail;
const formLoading = computed(() => detailLoading.value || parentOptionsLoading.value);
const tableExpandedRowKeys = computed(() => expandedRowKeys.value.map(String));
const currentAndDescendantIds = computed(() => {
  const keys = new Set<string>();
  const collect = (rows?: DictEntity[]) =>
    rows?.forEach(row => {
      keys.add(row.id);
      collect(row.children);
    });
  const find = (rows: DictEntity[]): DictEntity | undefined => {
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

const handleSearch = () => void search({ ...searchForm.value });
const handleTableExpandChange = (row: DictEntity, expanded: boolean | DictEntity[]) => {
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

const openChild = (row: DictEntity) => {
  resetDialogState();
  mode.value = 'add';
  parentContext.value = { parentId: row.id, code: row.code ?? '' };
  form.value = { ...createInitialForm(), parentId: row.id, code: row.code };
  dialogVisible.value = true;
  void parentState.load();
  nextTick(() => formRef.value?.clearValidate());
};

const openDetail = async (row: DictEntity, dialogMode: 'edit' | 'view') => {
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
    const submit = mode.value === 'add' ? add : update;
    await submit({ ...form.value });
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

const handleRowDelete = (row: DictEntity) => void confirmDelete(row.id);
const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  void confirmDelete(ids.value);
};

onMounted(() => void load());
</script>

<style scoped lang="scss">
.tree-management-page {
  min-width: 0;
}

:deep(.el-input-number),
:deep(.el-tree-select) {
  width: 100%;
}
</style>
