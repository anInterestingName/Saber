<template>
  <div class="topmenu-management-page">
    <search-panel
      :model="searchForm"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="菜单名">
          <el-input v-model="searchForm.name" clearable placeholder="请输入菜单名" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="菜单编号">
          <el-input v-model="searchForm.code" clearable placeholder="请输入菜单编号" />
        </el-form-item>
      </el-col>
    </search-panel>

    <list-panel title="顶部菜单列表">
      <template #actions>
        <el-button v-if="canAdd" type="primary" :icon="Plus" @click="openAdd">新增</el-button>
        <el-button v-if="canDelete" type="danger" plain :icon="Delete" @click="handleBatchDelete">
          删除
        </el-button>
        <el-button v-if="canSetting" :icon="Setting" @click="openGrantFromSelection">
          菜单配置
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
        <el-table-column prop="name" label="菜单名" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <i :class="row.source" class="topmenu-icon" />{{ row.name }}
          </template>
        </el-table-column>
        <el-table-column prop="source" label="图标" width="80" align="center">
          <template #default="{ row }"><i :class="row.source" /></template>
        </el-table-column>
        <el-table-column prop="code" label="菜单编号" min-width="160" show-overflow-tooltip />
        <el-table-column prop="sort" label="菜单排序" width="150" align="center">
          <template #default="{ row }">
            <el-input-number
              :model-value="row.sort"
              :min="1"
              :max="100"
              size="small"
              controls-position="right"
              :disabled="!canEdit || sortingId !== ''"
              @change="value => handleSortChange(row as TopMenuEntity, value)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="path" label="菜单路由" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" fixed="right" width="260" align="center">
          <template #default="{ row }">
            <row-actions
              :show-view="canView"
              :show-edit="canEdit"
              :show-delete="canDelete"
              :disabled="sortingId !== ''"
              @view="openDetail(row as TopMenuEntity, 'view')"
              @edit="openDetail(row as TopMenuEntity, 'edit')"
              @delete="handleRowDelete(row as TopMenuEntity)"
            >
              <template v-if="canSetting" #extra>
                <el-button
                  type="primary"
                  link
                  :icon="Setting"
                  :disabled="sortingId !== ''"
                  @click="openGrant(row as TopMenuEntity)"
                >
                  配置
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
          :disabled="loading || sortingId !== ''"
          @change="handlePageChange"
        />
      </template>
    </list-panel>

    <form-dialog
      v-model="dialogVisible"
      :mode="mode"
      entity-name="顶部菜单"
      :submitting="submitting"
      :loading="detailLoading"
      width="720px"
      destroy-on-close
      @confirm="handleSubmit"
      @cancel="handleDialogCancel"
    >
      <el-alert v-if="detailFailed" type="error" :closable="false" show-icon>
        <template #title>详情加载失败，请关闭后重试</template>
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
            <el-form-item label="菜单名" prop="name">
              <el-input v-model="form.name" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="菜单编号" prop="code">
              <el-input v-model="form.code" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="菜单图标" prop="source">
              <icon-select v-model="form.source" :disabled="mode === 'view'" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="菜单排序" prop="sort">
              <el-input-number v-model="form.sort" :min="1" :max="100" controls-position="right" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="菜单路由" prop="path">
              <el-input v-model="form.path" maxlength="255" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </form-dialog>

    <el-dialog
      v-model="grantVisible"
      title="下级菜单配置"
      width="640px"
      append-to-body
      :close-on-click-modal="!grantSubmitting"
      :close-on-press-escape="!grantSubmitting"
      :show-close="!grantSubmitting"
      :before-close="handleGrantBeforeClose"
    >
      <div v-loading="grantLoading" class="topmenu-grant-dialog">
        <el-result v-if="grantFailed" icon="error" title="菜单配置加载失败">
          <template #extra>
            <el-button type="primary" @click="retryGrant">重试</el-button>
          </template>
        </el-result>
        <tree-check-panel
          v-else
          v-model="grantKeys"
          v-model:linked="grantLinked"
          :data="grantTreeData"
          :loading="grantLoading"
          :disabled="grantSubmitting"
        />
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
import { Delete, Plus, Refresh, Setting } from '@element-plus/icons-vue';
import { ElForm, ElMessage, ElMessageBox, type FormRules, type TableInstance } from 'element-plus';
import { storeToRefs } from 'pinia';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import ListPagination from '@/components/list-pagination/main.vue';
import RowActions from '@/components/row-actions/main.vue';
import FormDialog from '@/components/form-dialog/main.vue';
import { useUserStore } from '@/store/user';
import IconSelect from '@/components/icon-select/main.vue';
import TreeCheckPanel from '@/components/tree-check-panel/main.vue';
import { useCrudPermission } from '@/composables/useCrudPermission';
import { usePagedList } from '@/composables/usePagedList';
import { useRemoteDetail } from '@/composables/useRemoteDetail';
import { useTableSelection } from '@/composables/useTableSelection';
import {
  add,
  getDetail,
  getGrantKeys,
  getList,
  grant,
  grantTree,
  remove,
  update,
} from '@/api/system/topmenu';
import { validData } from '@/utils/util';
import type { CrudMode } from '@/types/crud';
import type { PaginationChange } from '@/types/list';
import type { TreeKey, TreeNode } from '@/types/tree';

interface TopMenuEntity {
  id: string;
  name?: string;
  source?: string;
  code?: string;
  sort?: number;
  path?: string;
}

interface TopMenuQuery {
  name?: string;
  code?: string;
}

interface GrantModel {
  tree: TreeNode[];
  keys: TreeKey[];
}

type TopMenuForm = Partial<TopMenuEntity>;
type TopMenuListResponse = Awaited<ReturnType<typeof getList<TopMenuEntity>>>;

const createInitialQuery = (): TopMenuQuery => ({});
const createInitialForm = (): TopMenuForm => ({
  name: '',
  source: '',
  code: '',
  sort: 1,
  path: '',
});

const { permission } = storeToRefs(useUserStore());
const canSetting = computed(() => validData(permission.value.topmenu_setting, false));
const searchForm = ref<TopMenuQuery>(createInitialQuery());
const form = ref<TopMenuForm>(createInitialForm());
const mode = ref<CrudMode>('add');
const dialogVisible = ref(false);
const submitting = ref(false);
const sortingId = ref('');
const formRef = ref<InstanceType<typeof ElForm>>();
const tableRef = ref<TableInstance>();

const formRules: FormRules = {
  name: [{ required: true, message: '请输入菜单名', trigger: 'blur' }],
  source: [{ required: true, message: '请选择菜单图标', trigger: 'change' }],
  code: [{ required: true, message: '请输入菜单编号', trigger: 'blur' }],
  sort: [{ required: true, message: '请输入菜单排序', trigger: 'change' }],
};

const { data, page, loading, load, search, reset, refresh } = usePagedList<
  TopMenuEntity,
  TopMenuQuery,
  TopMenuListResponse
>({
  fetcher: (current, size, query) => getList<TopMenuEntity>(current, size, query),
  resolveResponse: response => ({
    records: response.data.data.records,
    total: response.data.data.total,
  }),
  createInitialQuery,
});
const selection = useTableSelection<TopMenuEntity>();
const { selectedRows, selectedIds, ids, handleSelectionChange, clearSelection } = selection;
const { add: canAdd, view: canView, edit: canEdit, delete: canDelete } =
  useCrudPermission('topmenu');
const detail = useRemoteDetail<TopMenuEntity, string>(async id => {
  const response = await getDetail<TopMenuEntity>(id);
  return response.data.data;
});
const { loading: detailLoading, failed: detailFailed } = detail;

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
const handlePageChange = (nextPage: PaginationChange) => {
  page.value = { ...page.value, ...nextPage };
  void load();
};

const resetDialogState = () => {
  detail.clear();
  formRef.value?.clearValidate();
};
const openAdd = () => {
  resetDialogState();
  mode.value = 'add';
  form.value = createInitialForm();
  dialogVisible.value = true;
  nextTick(() => formRef.value?.clearValidate());
};
const openDetail = async (row: TopMenuEntity, dialogMode: 'edit' | 'view') => {
  resetDialogState();
  mode.value = dialogMode;
  form.value = createInitialForm();
  dialogVisible.value = true;
  const entity = await detail.load(row.id);
  if (entity) form.value = { ...entity };
  await nextTick();
  formRef.value?.clearValidate();
};
const handleDialogCancel = () => resetDialogState();
const handleSubmit = async () => {
  if (!formRef.value || submitting.value || detailLoading.value || detailFailed.value) return;
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
const handleRowDelete = (row: TopMenuEntity) => void confirmDelete(row.id);
const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  void confirmDelete(ids.value);
};

const handleSortChange = async (row: TopMenuEntity, nextSort?: number) => {
  if (!canEdit.value || sortingId.value || nextSort == null || nextSort === row.sort) return;
  if (nextSort < 1 || nextSort > 100) return;
  sortingId.value = row.id;
  try {
    await update({ ...row, sort: nextSort });
    await refresh();
    ElMessage.success('排序已更新');
  } catch {
    // 列表实体未做乐观修改，失败后仍显示服务端确认值。
  } finally {
    sortingId.value = '';
  }
};

const grantVisible = ref(false);
const grantSubmitting = ref(false);
const grantTargetIds = ref<TreeKey[]>([]);
const grantTarget = ref<TopMenuEntity>();
const grantTreeData = ref<TreeNode[]>([]);
const grantKeys = ref<TreeKey[]>([]);
const grantLinked = ref(false);
const grantDetail = useRemoteDetail<GrantModel, string>(async topMenuId => {
  const [treeResponse, keysResponse] = await Promise.all([grantTree(), getGrantKeys(topMenuId)]);
  return { tree: treeResponse.data.data.menu, keys: keysResponse.data.data.menu };
});
const { loading: grantLoading, failed: grantFailed } = grantDetail;

const clearGrant = () => {
  grantDetail.clear();
  grantTargetIds.value = [];
  grantTarget.value = undefined;
  grantTreeData.value = [];
  grantKeys.value = [];
  grantLinked.value = false;
};
const loadGrant = async (row: TopMenuEntity) => {
  const result = await grantDetail.load(row.id);
  if (!result) return;
  grantTreeData.value = result.tree;
  grantKeys.value = result.keys;
};
const openGrant = (row: TopMenuEntity) => {
  clearGrant();
  grantTarget.value = row;
  grantTargetIds.value = [row.id];
  grantVisible.value = true;
  void loadGrant(row);
};
const openGrantFromSelection = () => {
  if (selectedRows.value.length !== 1) {
    ElMessage.warning('请选择一条顶部菜单数据');
    return;
  }
  openGrant(selectedRows.value[0]);
  grantTargetIds.value = [...selectedIds.value];
};
const retryGrant = () => {
  if (grantTarget.value) void loadGrant(grantTarget.value);
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
    await grant(grantTargetIds.value, grantKeys.value);
    grantVisible.value = false;
    clearGrant();
    await refresh();
    ElMessage.success('操作成功!');
  } catch {
    // 配置失败时保留勾选状态供重试。
  } finally {
    grantSubmitting.value = false;
  }
};

onMounted(() => void load());
</script>

<style scoped lang="scss">
.topmenu-management-page {
  min-width: 0;
}

.topmenu-icon {
  margin-right: 6px;
}

.topmenu-grant-dialog {
  min-height: 260px;
}

:deep(.el-input-number) {
  width: 100%;
}
</style>
