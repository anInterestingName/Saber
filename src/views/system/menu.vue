<template>
  <div class="tree-management-page">
    <search-panel
      :model="searchForm"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="菜单名称">
          <el-input v-model="searchForm.name" clearable placeholder="请输入菜单名称" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="菜单编号">
          <el-input v-model="searchForm.code" clearable placeholder="请输入菜单编号" />
        </el-form-item>
      </el-col>
    </search-panel>

    <list-panel title="菜单列表">
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
        <el-table-column prop="name" label="菜单名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="source" label="图标" width="80" align="center">
          <template #default="{ row }"><i :class="row.source" /></template>
        </el-table-column>
        <el-table-column prop="code" label="菜单编号" min-width="160" show-overflow-tooltip />
        <el-table-column prop="path" label="路由地址" min-width="200" show-overflow-tooltip />
        <el-table-column prop="alias" label="菜单别名" min-width="150" show-overflow-tooltip />
        <el-table-column prop="sort" label="排序" width="90" align="center" />
        <el-table-column label="操作" fixed="right" width="300" align="center">
          <template #default="{ row }">
            <row-actions
              :show-view="canView"
              :show-edit="canEdit"
              :show-delete="canDelete"
              @view="openDetail(row as MenuEntity, 'view')"
              @edit="openDetail(row as MenuEntity, 'edit')"
              @delete="handleRowDelete(row as MenuEntity)"
            >
              <template v-if="isAdmin" #extra>
                <el-button type="primary" link :icon="Plus" @click="openChild(row as MenuEntity)">
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
      entity-name="菜单"
      :submitting="submitting"
      :loading="formLoading"
      width="760px"
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
        <el-row :gutter="24">
          <el-col :xs="24" :sm="12">
            <el-form-item label="菜单名称" prop="name">
              <el-input v-model="form.name" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="菜单编号" prop="code">
              <el-input v-model="form.code" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="路由地址" prop="path">
              <el-input v-model="form.path" maxlength="255" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="上级菜单" prop="parentId">
              <el-tree-select
                v-model="form.parentId"
                :data="parentOptions"
                :props="parentTreeProps"
                node-key="id"
                check-strictly
                clearable
                filterable
                :disabled="Boolean(parentContext)"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="菜单图标" prop="source">
              <icon-select v-model="form.source" :disabled="mode === 'view'" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="菜单类型" prop="category">
              <el-radio-group v-model="form.category">
                <el-radio-button :value="1">菜单</el-radio-button>
                <el-radio-button :value="2">按钮</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="菜单别名" prop="alias">
              <el-input v-model="form.alias" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="按钮功能" prop="action">
              <el-radio-group v-model="form.action">
                <el-radio-button :value="1">工具栏</el-radio-button>
                <el-radio-button :value="2">操作栏</el-radio-button>
                <el-radio-button :value="3">工具操作栏</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="菜单排序" prop="sort">
              <el-input-number v-model="form.sort" :min="0" controls-position="right" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="新窗口" prop="isOpen">
              <el-radio-group v-model="form.isOpen">
                <el-radio-button :value="0">否</el-radio-button>
                <el-radio-button :value="1">是</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="菜单备注" prop="remark">
              <el-input
                v-model="form.remark"
                type="textarea"
                :rows="4"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </form-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { Delete, Plus, Refresh } from '@element-plus/icons-vue';
import { ElForm, ElMessage, ElMessageBox, type FormRules, type TableInstance } from 'element-plus';
import { useStore } from 'vuex';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import RowActions from '@/components/row-actions/main.vue';
import FormDialog from '@/components/form-dialog/main.vue';
import IconSelect from '@/components/icon-select/main.vue';
import { useCrudPermission } from '@/composables/useCrudPermission';
import { useRemoteDetail } from '@/composables/useRemoteDetail';
import { useRemoteOptions } from '@/composables/useRemoteOptions';
import { useTableSelection } from '@/composables/useTableSelection';
import { useTreeList } from '@/composables/useTreeList';
import { add, getList, getMenu, getMenuTree, remove, update } from '@/api/system/menu';
import type { CrudMode } from '@/types/crud';
import type { TreeNode } from '@/types/tree';

interface MenuEntity extends TreeNode {
  id: string;
  name?: string;
  path?: string;
  parentId?: string;
  source?: string;
  code?: string;
  category?: number;
  alias?: string;
  action?: number;
  sort?: number;
  isOpen?: number;
  remark?: string;
  children?: MenuEntity[];
}

interface MenuQuery {
  name?: string;
  code?: string;
}

type MenuForm = Partial<Omit<MenuEntity, 'children'>>;
type MenuListResponse = Awaited<ReturnType<typeof getList<MenuEntity>>>;

const createInitialQuery = (): MenuQuery => ({});
const createInitialForm = (): MenuForm => ({
  name: '',
  path: '',
  parentId: undefined,
  source: '',
  code: '',
  category: 1,
  alias: '',
  action: 1,
  sort: undefined,
  isOpen: 0,
  remark: '',
});

const store = useStore();
const isAdmin = computed(() => store.getters.userInfo?.authority?.includes('admin') ?? false);
const searchForm = ref<MenuQuery>(createInitialQuery());
const form = ref<MenuForm>(createInitialForm());
const mode = ref<CrudMode>('add');
const dialogVisible = ref(false);
const submitting = ref(false);
const parentContext = ref<{ parentId: string }>();
const formRef = ref<InstanceType<typeof ElForm>>();
const tableRef = ref<TableInstance>();

const formRules: FormRules = {
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  path: [{ required: true, message: '请输入路由地址', trigger: 'blur' }],
  source: [{ required: true, message: '请选择菜单图标', trigger: 'change' }],
  code: [{ required: true, message: '请输入菜单编号', trigger: 'blur' }],
  category: [{ required: true, message: '请选择菜单类型', trigger: 'change' }],
  alias: [{ required: true, message: '请输入菜单别名', trigger: 'blur' }],
  action: [{ required: true, message: '请选择按钮功能', trigger: 'change' }],
  sort: [{ required: true, message: '请输入菜单排序', trigger: 'change' }],
};

const { data, loading, expandedRowKeys, load, search, reset, refresh, handleExpandChange } =
  useTreeList<MenuEntity, MenuQuery, MenuListResponse>({
    fetcher: query => getList<MenuEntity>(query),
    resolveResponse: response => response.data.data,
    createInitialQuery,
  });
const { selectedRows, ids, handleSelectionChange, clearSelection } =
  useTableSelection<MenuEntity>();
const { add: canAdd, view: canView, edit: canEdit, delete: canDelete } = useCrudPermission('menu');
const detail = useRemoteDetail<MenuEntity, string>(async id => {
  const response = await getMenu(id);
  return response.data.data as MenuEntity;
});
const parentState = useRemoteOptions<TreeNode>(async () => {
  const response = await getMenuTree();
  return response.data.data;
});
const { options: parentOptions, loading: parentLoading, failed: parentOptionsFailed } = parentState;
const { loading: detailLoading, failed: detailFailed } = detail;
const formLoading = computed(() => detailLoading.value || parentLoading.value);
const tableExpandedRowKeys = computed(() => expandedRowKeys.value.map(String));
const currentAndDescendantIds = computed(() => {
  const keys = new Set<string>();
  const collect = (rows?: MenuEntity[]) =>
    rows?.forEach(row => {
      keys.add(row.id);
      collect(row.children);
    });
  const find = (rows: MenuEntity[]): MenuEntity | undefined => {
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
const handleReset = () => {
  searchForm.value = createInitialQuery();
  void reset();
};
const handleTableExpandChange = (row: MenuEntity, expanded: boolean | MenuEntity[]) => {
  const isExpanded = Array.isArray(expanded)
    ? expanded.some(item => item.id === row.id)
    : expanded;
  handleExpandChange(row, isExpanded);
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

const openChild = (row: MenuEntity) => {
  resetDialogState();
  mode.value = 'add';
  parentContext.value = { parentId: row.id };
  form.value = { ...createInitialForm(), parentId: row.id };
  dialogVisible.value = true;
  void parentState.load();
  nextTick(() => formRef.value?.clearValidate());
};

const openDetail = async (row: MenuEntity, dialogMode: 'edit' | 'view') => {
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

const handleRowDelete = (row: MenuEntity) => void confirmDelete(row.id);
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
