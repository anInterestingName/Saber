<template>
  <div class="scope-page">
    <scope-menu-browser
      title="数据权限菜单"
      :can-configure="canConfigure"
      @configure="openDrawer"
    />

    <el-drawer
      v-model="drawerVisible"
      class="scope-drawer"
      :title="`[${activeMenu?.name || '菜单'}] 数据权限配置`"
      direction="rtl"
      append-to-body
      destroy-on-close
      size="min(1000px, 100vw)"
      :close-on-click-modal="!drawerLocked"
      :close-on-press-escape="!drawerLocked"
      :show-close="!drawerLocked"
      :before-close="handleDrawerBeforeClose"
    >
      <div class="scope-drawer__body">
        <search-panel
          :model="searchForm"
          :loading="loading"
          @search="handleSearch"
          @reset="handleReset"
        >
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="权限名称">
              <el-input v-model="searchForm.scopeName" clearable placeholder="请输入权限名称" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="权限编号">
              <el-input v-model="searchForm.resourceCode" clearable placeholder="请输入权限编号" />
            </el-form-item>
          </el-col>
        </search-panel>

        <list-panel title="数据权限规则" compact>
          <template #actions>
            <el-button
              v-if="canConfigure"
              type="primary"
              :icon="Plus"
              :disabled="loading || deleting"
              @click="openAdd"
            >
              新增
            </el-button>
            <el-button
              v-if="canConfigure"
              type="danger"
              plain
              :icon="Delete"
              :loading="deleting"
              :disabled="loading"
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
                :disabled="deleting"
                aria-label="刷新"
                @click="refreshList"
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
            <el-table-column type="selection" width="48" />
            <el-table-column type="index" label="#" width="60" align="center" />
            <el-table-column
              prop="scopeName"
              label="权限名称"
              min-width="180"
              show-overflow-tooltip
            />
            <el-table-column
              prop="resourceCode"
              label="权限编号"
              min-width="150"
              show-overflow-tooltip
            />
            <el-table-column
              prop="scopeColumn"
              label="权限字段"
              min-width="140"
              show-overflow-tooltip
            />
            <el-table-column label="规则类型" width="170" align="center">
              <template #default="{ row }">
                <dict-tag code="data_scope_type" :value="row.scopeType" value-type="number" />
              </template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="210" align="center">
              <template #default="{ row }">
                <row-actions
                  :show-view="canConfigure"
                  :show-edit="canConfigure"
                  :show-delete="canConfigure"
                  :disabled="deleting || loading"
                  @view="openDetail(row as DataScopeEntity, 'view')"
                  @edit="openDetail(row as DataScopeEntity, 'edit')"
                  @delete="handleRowDelete(row as DataScopeEntity)"
                />
              </template>
            </el-table-column>
          </el-table>

          <template #footer>
            <list-pagination
              :current-page="page.currentPage"
              :page-size="page.pageSize"
              :total="page.total"
              :disabled="loading || deleting"
              @change="handlePaginationChange"
            />
          </template>
        </list-panel>
      </div>
    </el-drawer>

    <form-dialog
      v-model="dialogVisible"
      :mode="mode"
      entity-name="数据权限"
      :submitting="submitting"
      :loading="detailLoading"
      :confirm-disabled="formUnavailable"
      width="820px"
      destroy-on-close
      @confirm="handleSubmit"
      @cancel="handleDialogCancel"
    >
      <el-alert
        v-if="detailFailed || dictionaryFailed"
        class="scope-form__alert"
        type="error"
        :closable="false"
        show-icon
      >
        <template #title>
          {{
            detailFailed ? '详情加载失败，请关闭后重试' : '规则类型加载失败，请在规则类型字段重试'
          }}
        </template>
      </el-alert>
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        :disabled="mode === 'view' || detailLoading || detailFailed"
        label-width="88px"
      >
        <el-row :gutter="24">
          <el-col :xs="24" :sm="12">
            <el-form-item label="权限名称" prop="scopeName">
              <el-input v-model="form.scopeName" maxlength="255" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="权限编号" prop="resourceCode">
              <el-input v-model="form.resourceCode" maxlength="255" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="权限字段" prop="scopeColumn">
              <el-input v-model="form.scopeColumn" maxlength="255" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="规则类型" prop="scopeType">
              <dict-select
                :model-value="form.scopeType"
                code="data_scope_type"
                value-type="number"
                placeholder="请选择规则类型"
                @update:model-value="handleScopeTypeChange"
                @load-error="dictionaryFailed = true"
                @load-success="dictionaryFailed = false"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="可见字段" prop="scopeField">
              <el-input v-model="form.scopeField" maxlength="255" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="权限类名" prop="scopeClass">
              <el-input v-model="form.scopeClass" maxlength="500" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col v-if="form.scopeType === 5" :span="24">
            <el-form-item label="规则值" prop="scopeValue">
              <el-input
                v-model="form.scopeValue"
                type="textarea"
                :rows="5"
                maxlength="2000"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input
                v-model="form.remark"
                type="textarea"
                :rows="3"
                maxlength="255"
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
import { computed, nextTick, ref, watch } from 'vue';
import { Delete, Plus, Refresh } from '@element-plus/icons-vue';
import { ElForm, ElMessage, ElMessageBox, type FormRules, type TableInstance } from 'element-plus';
import { storeToRefs } from 'pinia';
import ScopeMenuBrowser from '@/views/authority/components/scope-menu-browser.vue';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import ListPagination from '@/components/list-pagination/main.vue';
import RowActions from '@/components/row-actions/main.vue';
import FormDialog from '@/components/form-dialog/main.vue';
import { useUserStore } from '@/store/user';
import DictSelect from '@/components/dict-select/main.vue';
import DictTag from '@/components/dict-tag/main.vue';
import { usePagedList } from '@/composables/usePagedList';
import { useRemoteDetail } from '@/composables/useRemoteDetail';
import { useTableSelection } from '@/composables/useTableSelection';
import {
  addDataScope,
  getDataScopeDetail,
  getDataScopeList,
  removeDataScope,
  updateDataScope,
} from '@/api/system/scope';
import { validData } from '@/utils/util';
import type { CrudMode } from '@/types/crud';
import type { PaginationChange } from '@/types/list';
import type { DictionaryValue } from '@/types/option';

interface ScopeMenuEntity {
  id: string;
  name?: string;
  code?: string;
}

interface DataScopeEntity {
  id: string;
  menuId?: string;
  resourceCode?: string;
  scopeName?: string;
  scopeField?: string;
  scopeClass?: string;
  scopeColumn?: string;
  scopeType?: number;
  scopeValue?: string;
  scopeTypeName?: string;
  remark?: string;
}

interface ScopeQuery {
  scopeName?: string;
  resourceCode?: string;
}

type DataScopeForm = Partial<DataScopeEntity>;
type DataScopeListResponse = Awaited<ReturnType<typeof getDataScopeList<DataScopeEntity>>>;

const createInitialQuery = (): ScopeQuery => ({ scopeName: '', resourceCode: '' });
const typeDefaults: { [key: number]: { label: string; column: string } | undefined } = {
  1: { label: '全部可见', column: '-' },
  2: { label: '本人可见', column: 'create_user' },
  3: { label: '所在机构可见', column: 'create_dept' },
  4: { label: '所在机构可见及子级可见', column: 'create_dept' },
  5: { label: '自定义', column: '' },
};

const createInitialForm = (menu?: ScopeMenuEntity): DataScopeForm => ({
  menuId: menu?.id,
  resourceCode: menu?.code ?? '',
  scopeName: menu ? `${menu.name || '菜单'} [全部可见]` : '',
  scopeField: '*',
  scopeClass: '',
  scopeColumn: '-',
  scopeType: 1,
  scopeValue: '',
  remark: '',
});

const { permission } = storeToRefs(useUserStore());
const canConfigure = computed(() => validData(permission.value.data_scope_setting, false));
const activeMenu = ref<ScopeMenuEntity>();
const drawerVisible = ref(false);
const searchForm = ref<ScopeQuery>(createInitialQuery());
const mode = ref<CrudMode>('add');
const form = ref<DataScopeForm>(createInitialForm());
const dialogVisible = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const dictionaryFailed = ref(false);
const formRef = ref<InstanceType<typeof ElForm>>();
const tableRef = ref<TableInstance>();
let menuContextVersion = 0;

const formRules: FormRules = {
  scopeName: [{ required: true, message: '请输入数据权限名称', trigger: 'blur' }],
  resourceCode: [{ required: true, message: '请输入数据权限编号', trigger: 'blur' }],
  scopeColumn: [{ required: true, message: '请输入数据权限字段', trigger: 'blur' }],
  scopeType: [{ required: true, message: '请选择规则类型', trigger: 'change' }],
  scopeField: [{ required: true, message: '请输入数据权限可见字段', trigger: 'blur' }],
  scopeClass: [{ required: true, message: '请输入 Mapper 方法完整类名', trigger: 'blur' }],
};

const listState = usePagedList<DataScopeEntity, ScopeQuery, DataScopeListResponse>({
  fetcher: async (current, size, query) => {
    const contextVersion = menuContextVersion;
    const menuId = activeMenu.value?.id;
    if (!menuId) throw new Error('数据权限菜单上下文已失效');
    const response = await getDataScopeList<DataScopeEntity>(current, size, {
      menuId,
      scopeName: query.scopeName?.trim() || undefined,
      resourceCode: query.resourceCode?.trim() || undefined,
    });
    if (contextVersion !== menuContextVersion || menuId !== activeMenu.value?.id) {
      throw new Error('数据权限菜单上下文已变更');
    }
    return response;
  },
  resolveResponse: response => response.data.data,
  createInitialQuery,
});
const { data, query, page, loading, load, search, reset, refresh, changePage, changeSize } =
  listState;
const selection = useTableSelection<DataScopeEntity>();
const { selectedRows, ids, handleSelectionChange, clearSelection } = selection;
const detail = useRemoteDetail<DataScopeEntity, string>(async id => {
  const response = await getDataScopeDetail<DataScopeEntity>(id);
  return response.data.data;
});
const { loading: detailLoading, failed: detailFailed } = detail;
const drawerLocked = computed(() => submitting.value || deleting.value);
const formUnavailable = computed(
  () => detailLoading.value || detailFailed.value || dictionaryFailed.value || !activeMenu.value?.id
);

const clearTableSelection = () => {
  clearSelection();
  tableRef.value?.clearSelection();
};
watch(data, clearTableSelection, { flush: 'post' });

const resetListState = () => {
  data.value = [];
  query.value = createInitialQuery();
  page.value.currentPage = 1;
  page.value.total = 0;
  searchForm.value = createInitialQuery();
  clearTableSelection();
};

const resetDialogState = () => {
  detail.clear();
  dictionaryFailed.value = false;
  form.value = createInitialForm();
  formRef.value?.clearValidate();
};

const invalidateDrawerContext = () => {
  menuContextVersion += 1;
  resetDialogState();
  dialogVisible.value = false;
  resetListState();
  activeMenu.value = undefined;
};

const openDrawer = (menu: ScopeMenuEntity) => {
  if (!canConfigure.value || drawerLocked.value || !menu.id) return;
  menuContextVersion += 1;
  activeMenu.value = { id: menu.id, name: menu.name, code: menu.code };
  resetDialogState();
  resetListState();
  drawerVisible.value = true;
  void load();
};

const handleDrawerBeforeClose = (done: () => void) => {
  if (drawerLocked.value) return;
  invalidateDrawerContext();
  done();
};

const handleSearch = () => void search({ ...searchForm.value });
const handleReset = () => {
  searchForm.value = createInitialQuery();
  void reset();
};
const refreshList = () => void refresh();
const handlePaginationChange = ({ currentPage, pageSize }: PaginationChange) => {
  if (pageSize !== page.value.pageSize) void changeSize(pageSize);
  else void changePage(currentPage);
};

const openAdd = () => {
  if (!canConfigure.value || !activeMenu.value || drawerLocked.value) return;
  resetDialogState();
  mode.value = 'add';
  form.value = createInitialForm(activeMenu.value);
  dialogVisible.value = true;
  nextTick(() => formRef.value?.clearValidate());
};

const openDetail = async (row: DataScopeEntity, dialogMode: 'edit' | 'view') => {
  if (!canConfigure.value || !activeMenu.value || drawerLocked.value) return;
  resetDialogState();
  mode.value = dialogMode;
  dialogVisible.value = true;
  const contextVersion = menuContextVersion;
  const menuId = activeMenu.value.id;
  const entity = await detail.load(row.id);
  if (!entity || contextVersion !== menuContextVersion || menuId !== activeMenu.value?.id) return;
  if (entity.menuId && String(entity.menuId) !== menuId) {
    detail.data.value = null;
    detail.failed.value = true;
    return;
  }
  form.value = {
    ...entity,
    scopeType: entity.scopeType === undefined ? undefined : Number(entity.scopeType),
  };
  await nextTick();
  formRef.value?.clearValidate();
};

const handleDialogCancel = () => resetDialogState();

const handleScopeTypeChange = (value: DictionaryValue | DictionaryValue[] | null | undefined) => {
  if (Array.isArray(value) || value === null || value === undefined || value === '') {
    form.value.scopeType = undefined;
    return;
  }
  const scopeType = Number(value);
  form.value.scopeType = scopeType;
  dictionaryFailed.value = false;
  const defaults = typeDefaults[scopeType];
  if (!defaults || !activeMenu.value) return;
  form.value.scopeColumn = defaults.column;
  if (scopeType !== 5) form.value.scopeValue = '';
  if (mode.value === 'add') {
    form.value.scopeName = `${activeMenu.value.name || '菜单'} [${defaults.label}]`;
    form.value.resourceCode = activeMenu.value.code ?? '';
  }
};

const handleSubmit = async () => {
  if (
    !formRef.value ||
    mode.value === 'view' ||
    submitting.value ||
    formUnavailable.value ||
    !canConfigure.value ||
    !activeMenu.value
  ) {
    return;
  }
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  const contextVersion = menuContextVersion;
  const menuId = activeMenu.value.id;
  const payload: DataScopeForm = {
    ...form.value,
    menuId,
    scopeValue: form.value.scopeType === 5 ? form.value.scopeValue ?? '' : '',
  };
  delete payload.scopeTypeName;

  submitting.value = true;
  try {
    const submitScope = mode.value === 'add' ? addDataScope : updateDataScope;
    await submitScope(payload);
    if (contextVersion !== menuContextVersion || menuId !== activeMenu.value?.id) return;
    dialogVisible.value = false;
    resetDialogState();
    clearTableSelection();
    await refresh();
    ElMessage.success('操作成功!');
  } catch {
    // Axios 已处理接口错误，保留表单和菜单上下文供重试。
  } finally {
    submitting.value = false;
  }
};

const confirmDelete = async (deleteIds: string) => {
  if (!canConfigure.value || !activeMenu.value || deleting.value) return;
  const contextVersion = menuContextVersion;
  const menuId = activeMenu.value.id;
  try {
    await ElMessageBox.confirm('确定将选择数据删除?', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    if (
      !canConfigure.value ||
      contextVersion !== menuContextVersion ||
      menuId !== activeMenu.value?.id
    ) {
      return;
    }
    deleting.value = true;
    await removeDataScope(deleteIds);
    if (contextVersion !== menuContextVersion || menuId !== activeMenu.value?.id) return;
    clearTableSelection();
    await refresh();
    ElMessage.success('操作成功!');
  } catch {
    // 用户取消或接口失败时保留列表、查询和选择状态。
  } finally {
    deleting.value = false;
  }
};

const handleRowDelete = (row: DataScopeEntity) => void confirmDelete(row.id);
const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  void confirmDelete(ids.value);
};
</script>

<style scoped lang="scss">
.scope-page,
.scope-drawer__body {
  min-width: 0;
}

.scope-form__alert {
  margin-bottom: 18px;
}

:deep(.el-select) {
  width: 100%;
}
</style>

<style lang="scss">
.scope-drawer .el-drawer__header {
  flex: 0 0 auto;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--saber-border);
  margin-bottom: 0;
}

.scope-drawer .el-drawer__body {
  min-height: 0;
  padding: 16px;
  overflow: auto;
}
</style>
