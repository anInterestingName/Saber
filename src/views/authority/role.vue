<template>
  <div class="tree-management-page">
    <search-panel
      :model="searchForm"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="角色名称">
          <el-input v-model="searchForm.roleName" clearable placeholder="请输入角色名称" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="角色别名">
          <el-input v-model="searchForm.roleAlias" clearable placeholder="请输入角色别名" />
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

    <list-panel title="角色列表">
      <template #actions>
        <el-button v-if="canAdd" type="primary" :icon="Plus" @click="openAdd">新增</el-button>
        <el-button v-if="canDelete" type="danger" plain :icon="Delete" @click="handleBatchDelete">
          删除
        </el-button>
        <el-button v-if="isAdmin" :icon="Key" @click="openGrantFromSelection">权限设置</el-button>
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
        <el-table-column prop="roleName" label="角色名称" min-width="220" show-overflow-tooltip />
        <el-table-column
          v-if="website.tenantMode"
          prop="tenantId"
          label="所属租户"
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">{{ getTenantName(row.tenantId) }}</template>
        </el-table-column>
        <el-table-column prop="roleAlias" label="角色别名" min-width="180" show-overflow-tooltip />
        <el-table-column prop="sort" label="角色排序" width="110" align="center" />
        <el-table-column label="操作" fixed="right" width="200" align="center">
          <template #default="{ row }">
            <row-actions
              :show-view="canView"
              :show-edit="canEdit"
              :show-delete="canDelete"
              @view="openDetail(row as RoleEntity, 'view')"
              @edit="openDetail(row as RoleEntity, 'edit')"
              @delete="handleRowDelete(row as RoleEntity)"
            />
          </template>
        </el-table-column>
      </el-table>
    </list-panel>

    <form-dialog
      v-model="dialogVisible"
      :mode="mode"
      entity-name="角色"
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
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="form.roleName" maxlength="100" />
        </el-form-item>
        <el-form-item v-if="website.tenantMode && mode === 'view'" label="所属租户">
          <el-input :model-value="getTenantName(form.tenantId)" />
        </el-form-item>
        <el-form-item label="角色别名" prop="roleAlias">
          <el-input v-model="form.roleAlias" maxlength="100" />
        </el-form-item>
        <el-form-item label="上级角色" prop="parentId">
          <el-tree-select
            v-model="form.parentId"
            :data="parentOptions"
            :props="parentTreeProps"
            node-key="id"
            check-strictly
            clearable
            filterable
          />
        </el-form-item>
        <el-form-item label="角色排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" controls-position="right" />
        </el-form-item>
      </el-form>
    </form-dialog>

    <el-dialog
      v-model="grantVisible"
      class="role-grant-modal"
      title="角色权限配置"
      width="720px"
      append-to-body
      align-center
      :close-on-click-modal="!grantSubmitting"
      :close-on-press-escape="!grantSubmitting"
      :show-close="!grantSubmitting"
      :before-close="handleGrantBeforeClose"
    >
      <div v-loading="grantLoading" class="role-grant-dialog">
        <el-result v-if="grantFailed" icon="error" title="授权数据加载失败">
          <template #extra>
            <el-button type="primary" @click="retryGrant">重试</el-button>
          </template>
        </el-result>
        <el-tabs v-else v-model="activeGrantTab">
          <el-tab-pane label="菜单权限" name="menu">
            <tree-check-panel
              v-model="menuKeys"
              v-model:linked="menuLinked"
              :data="menuTree"
              :loading="grantLoading"
              :disabled="grantSubmitting"
            />
          </el-tab-pane>
          <el-tab-pane label="数据权限" name="dataScope">
            <tree-check-panel
              v-model="dataScopeKeys"
              v-model:linked="dataScopeLinked"
              :data="dataScopeTree"
              :loading="grantLoading"
              :disabled="grantSubmitting"
            />
          </el-tab-pane>
          <el-tab-pane label="接口权限" name="apiScope">
            <tree-check-panel
              v-model="apiScopeKeys"
              v-model:linked="apiScopeLinked"
              :data="apiScopeTree"
              :loading="grantLoading"
              :disabled="grantSubmitting"
            />
          </el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <el-button :disabled="grantSubmitting" @click="closeGrant">取消</el-button>
        <el-button
          type="primary"
          :loading="grantSubmitting"
          :disabled="grantLoading || grantFailed"
          @click="submitGrant"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { Delete, Key, Plus, Refresh } from '@element-plus/icons-vue';
import { ElForm, ElMessage, ElMessageBox, type FormRules, type TableInstance } from 'element-plus';
import { storeToRefs } from 'pinia';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import RowActions from '@/components/row-actions/main.vue';
import FormDialog from '@/components/form-dialog/main.vue';
import TreeCheckPanel from '@/components/tree-check-panel/main.vue';
import { useUserStore } from '@/store/user';
import { useCrudPermission } from '@/composables/useCrudPermission';
import { useRemoteDetail } from '@/composables/useRemoteDetail';
import { useRemoteOptions } from '@/composables/useRemoteOptions';
import { useTableSelection } from '@/composables/useTableSelection';
import { useTreeList } from '@/composables/useTreeList';
import {
  add,
  getDetail,
  getGrantKeys,
  getList,
  getRoleTree,
  grant,
  grantTree,
  remove,
  update,
} from '@/api/system/role';
import { getTenantSelect } from '@/api/system/tenant';
import website from '@/config/website';
import type { CrudMode } from '@/types/crud';
import type { TenantOption } from '@/types/option';
import type { TreeKey, TreeNode } from '@/types/tree';

interface RoleEntity extends TreeNode {
  id: string;
  roleName?: string;
  tenantId?: string;
  roleAlias?: string;
  parentId?: string;
  sort?: number;
  children?: RoleEntity[];
}

interface RoleQuery {
  roleName?: string;
  roleAlias?: string;
  tenantId?: string;
}

interface GrantModel {
  menuTree: TreeNode[];
  dataScopeTree: TreeNode[];
  apiScopeTree: TreeNode[];
  menuKeys: TreeKey[];
  dataScopeKeys: TreeKey[];
  apiScopeKeys: TreeKey[];
}

type RoleForm = Partial<Omit<RoleEntity, 'children'>>;
type RoleListResponse = Awaited<ReturnType<typeof getList<RoleEntity>>>;

const createInitialQuery = (): RoleQuery => ({});
const createInitialForm = (): RoleForm => ({
  roleName: '',
  roleAlias: '',
  parentId: undefined,
  sort: undefined,
});

const { isAdmin } = storeToRefs(useUserStore());
const searchForm = ref<RoleQuery>(createInitialQuery());
const form = ref<RoleForm>(createInitialForm());
const mode = ref<CrudMode>('add');
const dialogVisible = ref(false);
const submitting = ref(false);
const formRef = ref<InstanceType<typeof ElForm>>();
const tableRef = ref<TableInstance>();

const formRules: FormRules = {
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  roleAlias: [{ required: true, message: '请输入角色别名', trigger: 'blur' }],
  sort: [{ required: true, message: '请输入角色排序', trigger: 'change' }],
};

const { data, loading, expandedRowKeys, load, search, reset, refresh, handleExpandChange } =
  useTreeList<RoleEntity, RoleQuery, RoleListResponse>({
    fetcher: query => getList<RoleEntity>(query),
    resolveResponse: response => response.data.data,
    createInitialQuery,
  });
const selection = useTableSelection<RoleEntity>();
const { selectedRows, selectedIds, ids, handleSelectionChange, clearSelection } = selection;
const { add: canAdd, view: canView, edit: canEdit, delete: canDelete } = useCrudPermission('role');
const detail = useRemoteDetail<RoleEntity, string>(async id => {
  const response = await getDetail<RoleEntity>(id);
  return response.data.data;
});
const parentState = useRemoteOptions<TreeNode>(async () => {
  const response = await getRoleTree();
  return response.data.data;
});
const tenantState = useRemoteOptions<TenantOption>(async () => {
  const response = await getTenantSelect();
  return response.data.data;
});
const { options: parentOptions, loading: parentLoading, failed: parentOptionsFailed } = parentState;
const { options: tenantOptions, loading: tenantLoading } = tenantState;
const { loading: detailLoading, failed: detailFailed } = detail;
const formLoading = computed(() => detailLoading.value || parentLoading.value);
const tableExpandedRowKeys = computed(() => expandedRowKeys.value.map(String));
const currentAndDescendantIds = computed(() => {
  const keys = new Set<string>();
  const collect = (rows?: RoleEntity[]) =>
    rows?.forEach(row => {
      keys.add(row.id);
      collect(row.children);
    });
  const find = (rows: RoleEntity[]): RoleEntity | undefined => {
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
const handleReset = () => {
  searchForm.value = createInitialQuery();
  void reset();
};
const handleTableExpandChange = (row: RoleEntity, expanded: boolean | RoleEntity[]) => {
  const isExpanded = Array.isArray(expanded) ? expanded.some(item => item.id === row.id) : expanded;
  handleExpandChange(row, isExpanded);
};

const resetDialogState = () => {
  detail.clear();
  parentState.clear();
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
const openDetail = async (row: RoleEntity, dialogMode: 'edit' | 'view') => {
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
const handleRowDelete = (row: RoleEntity) => void confirmDelete(row.id);
const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  void confirmDelete(ids.value);
};

const grantVisible = ref(false);
const grantSubmitting = ref(false);
const activeGrantTab = ref('menu');
const grantTargetIds = ref<TreeKey[]>([]);
const menuTree = ref<TreeNode[]>([]);
const dataScopeTree = ref<TreeNode[]>([]);
const apiScopeTree = ref<TreeNode[]>([]);
const menuKeys = ref<TreeKey[]>([]);
const dataScopeKeys = ref<TreeKey[]>([]);
const apiScopeKeys = ref<TreeKey[]>([]);
const menuLinked = ref(false);
const dataScopeLinked = ref(false);
const apiScopeLinked = ref(false);
const grantDetail = useRemoteDetail<GrantModel, string>(async roleId => {
  const [treeResponse, keysResponse] = await Promise.all([grantTree(), getGrantKeys(roleId)]);
  return {
    menuTree: treeResponse.data.data.menu,
    dataScopeTree: treeResponse.data.data.dataScope,
    apiScopeTree: treeResponse.data.data.apiScope,
    menuKeys: keysResponse.data.data.menu,
    dataScopeKeys: keysResponse.data.data.dataScope,
    apiScopeKeys: keysResponse.data.data.apiScope,
  };
});
const { loading: grantLoading, failed: grantFailed } = grantDetail;

const clearGrant = () => {
  grantDetail.clear();
  grantTargetIds.value = [];
  menuTree.value = [];
  dataScopeTree.value = [];
  apiScopeTree.value = [];
  menuKeys.value = [];
  dataScopeKeys.value = [];
  apiScopeKeys.value = [];
  menuLinked.value = false;
  dataScopeLinked.value = false;
  apiScopeLinked.value = false;
  activeGrantTab.value = 'menu';
};
const loadGrant = async (role: RoleEntity) => {
  const result = await grantDetail.load(role.id);
  if (!result) return;
  menuTree.value = result.menuTree;
  dataScopeTree.value = result.dataScopeTree;
  apiScopeTree.value = result.apiScopeTree;
  menuKeys.value = result.menuKeys;
  dataScopeKeys.value = result.dataScopeKeys;
  apiScopeKeys.value = result.apiScopeKeys;
};
const openGrantFromSelection = () => {
  if (selectedRows.value.length !== 1) {
    ElMessage.warning('请选择一条角色数据');
    return;
  }
  clearGrant();
  grantTargetIds.value = [...selectedIds.value];
  grantVisible.value = true;
  void loadGrant(selectedRows.value[0]);
};
const retryGrant = () => {
  const role = selectedRows.value.find(item => item.id === String(grantTargetIds.value[0]));
  if (role) void loadGrant(role);
};
const closeGrant = () => {
  if (grantSubmitting.value) return;
  grantVisible.value = false;
  clearGrant();
};
const handleGrantBeforeClose = (done: () => void) => {
  if (grantSubmitting.value) return;
  clearGrant();
  done();
};
const submitGrant = async () => {
  if (grantSubmitting.value || grantLoading.value || grantFailed.value) return;
  grantSubmitting.value = true;
  try {
    await grant(grantTargetIds.value, menuKeys.value, dataScopeKeys.value, apiScopeKeys.value);
    grantVisible.value = false;
    clearGrant();
    await refresh();
    ElMessage.success('操作成功!');
  } catch {
    // 授权失败时保留三类勾选状态供重试。
  } finally {
    grantSubmitting.value = false;
  }
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

.role-grant-dialog {
  min-height: 300px;
}

:deep(.el-select),
:deep(.el-input-number),
:deep(.el-tree-select) {
  width: 100%;
}
</style>

<style lang="scss">
.role-grant-modal {
  display: flex;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  flex-direction: column;
  overflow: hidden;
}

.role-grant-modal .el-dialog__header,
.role-grant-modal .el-dialog__footer {
  flex: 0 0 auto;
}

.role-grant-modal .el-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
</style>
