<template>
  <div class="user-management-page">
    <search-panel
      :model="searchForm"
      :loading="loading"
      label-width="72px"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="登录账号">
          <el-input v-model="searchForm.account" clearable placeholder="请输入登录账号" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="用户姓名">
          <el-input v-model="searchForm.realName" clearable placeholder="请输入用户姓名" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="用户昵称">
          <el-input v-model="searchForm.name" clearable placeholder="请输入用户昵称" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="手机号码">
          <el-input v-model="searchForm.phone" clearable placeholder="请输入手机号码" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="电子邮箱">
          <el-input v-model="searchForm.email" clearable placeholder="请输入电子邮箱" />
        </el-form-item>
      </el-col>
    </search-panel>

    <list-panel title="用户列表">
      <template #actions>
        <el-button
          v-if="canAdd"
          type="primary"
          :icon="Plus"
          :disabled="operationRunning"
          @click="openAdd"
        >
          新增
        </el-button>
        <el-button
          v-if="canDelete"
          type="danger"
          plain
          :icon="Delete"
          :loading="deleting"
          :disabled="operationRunning && !deleting"
          @click="handleBatchDelete"
        >
          删除
        </el-button>
        <el-dropdown v-if="hasMoreActions" trigger="click" @command="handleMoreAction">
          <el-button :disabled="operationRunning">
            更多操作<el-icon class="user-more-icon"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-if="isAdmin" :icon="User" command="grant">角色配置</el-dropdown-item>
              <el-dropdown-item v-if="canReset" :icon="RefreshLeft" command="reset">
                密码重置
              </el-dropdown-item>
              <el-dropdown-item v-if="isAdmin" :icon="Unlock" command="unlock">
                账号解封
              </el-dropdown-item>
              <el-dropdown-item v-if="isAdmin" divided :icon="Upload" command="import">
                导入
              </el-dropdown-item>
              <el-dropdown-item v-if="isAdmin" :icon="Download" command="export">
                导出
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
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
        <el-table-column prop="account" label="登录账号" min-width="150" show-overflow-tooltip />
        <el-table-column
          v-if="website.tenantMode"
          prop="tenantId"
          label="所属租户"
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">{{ getTenantName(row.tenantId) }}</template>
        </el-table-column>
        <el-table-column prop="name" label="用户昵称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="realName" label="用户姓名" min-width="140" show-overflow-tooltip />
        <el-table-column prop="roleName" label="所属角色" min-width="180" show-overflow-tooltip>
          <template #default="{ row }"><el-tag>{{ row.roleName || '-' }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="deptName" label="所属部门" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag type="info">{{ row.deptName || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号码" min-width="140" show-overflow-tooltip />
        <el-table-column prop="statusName" label="账号状态" width="110" align="center" />
        <el-table-column label="操作" fixed="right" width="200" align="center">
          <template #default="{ row }">
            <row-actions
              :show-view="canView"
              :show-edit="canEdit"
              :show-delete="canDelete"
              :disabled="operationRunning"
              @view="openDetail(row as UserEntity, 'view')"
              @edit="openDetail(row as UserEntity, 'edit')"
              @delete="handleRowDelete(row as UserEntity)"
            />
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <list-pagination
          v-model:current-page="page.currentPage"
          v-model:page-size="page.pageSize"
          :total="page.total"
          :disabled="loading || operationRunning"
          @change="handlePageChange"
        />
      </template>
    </list-panel>

    <form-dialog
      v-model="dialogVisible"
      :mode="mode"
      entity-name="用户"
      :submitting="submitting"
      :loading="formLoading"
      width="820px"
      destroy-on-close
      @confirm="handleSubmit"
      @cancel="handleDialogCancel"
    >
      <el-result v-if="detailFailed" icon="error" title="用户详情加载失败">
        <template #extra>
          <el-button type="primary" @click="retryDetail">重试</el-button>
        </template>
      </el-result>
      <template v-else>
        <el-alert
          v-if="website.tenantMode && tenantFailed"
          type="error"
          :closable="false"
          show-icon
        >
          <template #title>
            租户选项加载失败
            <el-button type="primary" link @click="loadTenantOptions">重试</el-button>
          </template>
        </el-alert>
        <el-alert v-if="linkedOptionsFailed" type="error" :closable="false" show-icon>
          <template #title>
            关联选项加载失败
            <el-button type="primary" link @click="retryLinkedOptions">重试</el-button>
          </template>
        </el-alert>
        <el-form
          ref="formRef"
          :model="form"
          :rules="formRules"
          :disabled="
            mode === 'view' ||
            formLoading ||
            linkedOptionsFailed ||
            (website.tenantMode && tenantFailed)
          "
          label-width="88px"
        >
          <el-row :gutter="24">
            <el-col :xs="24" :sm="12">
              <el-form-item label="登录账号" prop="account">
                <el-input v-model="form.account" maxlength="100" />
              </el-form-item>
            </el-col>
            <el-col v-if="website.tenantMode" :xs="24" :sm="12">
              <el-form-item label="所属租户" prop="tenantId">
                <el-select
                  v-model="form.tenantId"
                  filterable
                  :loading="tenantLoading"
                  @change="handleTenantChange"
                >
                  <el-option
                    v-for="tenant in tenantOptions"
                    :key="tenant.tenantId"
                    :label="tenant.tenantName"
                    :value="tenant.tenantId"
                  />
                  <template #empty>
                    <el-button
                      v-if="tenantFailed"
                      type="primary"
                      link
                      @click="loadTenantOptions"
                    >
                      重新加载租户
                    </el-button>
                    <span v-else>暂无租户数据</span>
                  </template>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col v-if="mode === 'add'" :xs="24" :sm="12">
              <el-form-item label="密码" prop="password">
                <el-input
                  v-model="form.password"
                  type="password"
                  show-password
                  autocomplete="new-password"
                />
              </el-form-item>
            </el-col>
            <el-col v-if="mode === 'add'" :xs="24" :sm="12">
              <el-form-item label="确认密码" prop="password2">
                <el-input
                  v-model="form.password2"
                  type="password"
                  show-password
                  autocomplete="new-password"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="用户昵称" prop="name">
                <el-input v-model="form.name" maxlength="100" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="用户姓名" prop="realName">
                <el-input v-model="form.realName" maxlength="100" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="所属角色" prop="roleId">
                <el-tree-select
                  v-model="form.roleId"
                  :data="roleOptions"
                  node-key="id"
                  :props="treeSelectProps"
                  multiple
                  check-strictly
                  show-checkbox
                  filterable
                  clearable
                  :loading="roleLoading"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="所属部门" prop="deptId">
                <el-tree-select
                  v-model="form.deptId"
                  :data="deptOptions"
                  node-key="id"
                  :props="treeSelectProps"
                  multiple
                  check-strictly
                  show-checkbox
                  filterable
                  clearable
                  :loading="deptLoading"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="用户编号" prop="code">
                <el-input v-model="form.code" maxlength="100" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="所属岗位" prop="postId">
                <el-select
                  v-model="form.postId"
                  multiple
                  filterable
                  clearable
                  :loading="postLoading"
                >
                  <el-option
                    v-for="post in postOptions"
                    :key="post.id"
                    :label="post.postName"
                    :value="post.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="手机号码" prop="phone">
                <el-input v-model="form.phone" maxlength="20" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="电子邮箱" prop="email">
                <el-input v-model="form.email" maxlength="100" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="用户性别" prop="sex">
                <el-select v-model="form.sex" clearable>
                  <el-option label="男" :value="1" />
                  <el-option label="女" :value="2" />
                  <el-option label="未知" :value="3" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="用户生日" prop="birthday">
                <el-date-picker
                  v-model="form.birthday"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  placeholder="请选择用户生日"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </template>
    </form-dialog>

    <el-dialog
      v-model="grantVisible"
      title="用户角色配置"
      width="640px"
      append-to-body
      :close-on-click-modal="!grantSubmitting"
      :close-on-press-escape="!grantSubmitting"
      :show-close="!grantSubmitting"
      :before-close="handleGrantBeforeClose"
    >
      <el-alert
        v-if="grantTargetCount > 1"
        class="user-grant-alert"
        type="warning"
        :closable="false"
        show-icon
        :title="`将以当前勾选覆盖所选 ${grantTargetCount} 个用户的角色`"
      />
      <div v-loading="grantLoading" class="user-grant-dialog">
        <el-result v-if="grantFailed" icon="error" title="角色数据加载失败">
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

    <el-dialog
      v-model="importVisible"
      title="用户数据导入"
      width="560px"
      append-to-body
      :close-on-click-modal="!importing"
      :close-on-press-escape="!importing"
      :show-close="!importing"
      :before-close="handleImportBeforeClose"
    >
      <el-upload
        ref="uploadRef"
        v-model:file-list="importFiles"
        drag
        accept=".xls,.xlsx"
        :limit="1"
        :auto-upload="false"
        :disabled="importing"
        :http-request="handleImportRequest"
        :before-upload="validateImportFile"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">将 Excel 文件拖到此处，或<em>点击选择</em></div>
        <template #tip>
          <div class="el-upload__tip">仅支持 .xls、.xlsx 格式文件</div>
        </template>
      </el-upload>
      <el-button
        class="user-template-button"
        :icon="Download"
        :loading="templateLoading"
        :disabled="importing"
        @click="handleTemplateDownload"
      >
        下载导入模板
      </el-button>
      <template #footer>
        <el-button :disabled="importing" @click="closeImport">取消</el-button>
        <el-button type="primary" :loading="importing" @click="submitImport">开始导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import axios from 'axios';
import {
  ArrowDown,
  Delete,
  Download,
  Plus,
  Refresh,
  RefreshLeft,
  Unlock,
  Upload,
  UploadFilled,
  User,
} from '@element-plus/icons-vue';
import {
  ElForm,
  ElMessage,
  ElMessageBox,
  type FormRules,
  type TableInstance,
  type UploadInstance,
  type UploadRequestOptions,
  type UploadUserFile,
} from 'element-plus';
import { useStore } from 'vuex';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import ListPagination from '@/components/list-pagination/main.vue';
import RowActions from '@/components/row-actions/main.vue';
import FormDialog from '@/components/form-dialog/main.vue';
import TreeCheckPanel from '@/components/tree-check-panel/main.vue';
import { useCrudPermission } from '@/composables/useCrudPermission';
import { usePagedList } from '@/composables/usePagedList';
import { useRemoteDetail } from '@/composables/useRemoteDetail';
import { useRemoteOptions } from '@/composables/useRemoteOptions';
import { useTableSelection } from '@/composables/useTableSelection';
import {
  add,
  downloadUserTemplate,
  exportUsers,
  getList,
  getUser,
  grant,
  importUsers,
  remove,
  resetPassword,
  unlock,
  update,
} from '@/api/system/user';
import { getDeptTree } from '@/api/system/dept';
import { getRoleTree } from '@/api/system/role';
import { getPostList } from '@/api/system/post';
import { getTenantSelect } from '@/api/system/tenant';
import website from '@/config/website';
import { validData } from '@/utils/util';
import { downloadBlob } from '@/utils/download';
import type { CrudMode } from '@/types/crud';
import type { PaginationChange } from '@/types/list';
import type { TenantOption } from '@/types/option';
import type { TreeKey, TreeNode } from '@/types/tree';

interface UserEntity {
  id: string;
  account?: string;
  tenantId?: string;
  password?: string;
  password2?: string;
  name?: string;
  realName?: string;
  roleId?: string | string[];
  deptId?: string | string[];
  postId?: string | string[];
  code?: string;
  phone?: string;
  email?: string;
  sex?: number;
  birthday?: string;
  statusName?: string;
  roleName?: string;
  deptName?: string;
}

interface UserQuery {
  account?: string;
  realName?: string;
  name?: string;
  phone?: string;
  email?: string;
}

interface SelectTreeNode extends TreeNode {
  id: string;
  children?: SelectTreeNode[];
}

interface PostOption {
  id: string;
  postName?: string;
}

interface GrantTarget {
  tenantId?: string;
  keys: TreeKey[];
}

interface GrantModel {
  tree: TreeNode[];
  keys: TreeKey[];
}

type UserForm = Partial<UserEntity>;
type UserListResponse = Awaited<ReturnType<typeof getList<UserEntity>>>;

const createInitialQuery = (): UserQuery => ({});
const createInitialForm = (): UserForm => ({
  account: '',
  tenantId: undefined,
  password: '',
  password2: '',
  name: '',
  realName: '',
  roleId: [],
  deptId: [],
  postId: [],
  code: '',
  phone: '',
  email: '',
  sex: undefined,
  birthday: undefined,
});
const splitIds = (value?: string | string[]) => {
  if (Array.isArray(value)) return [...value];
  return value ? value.split(',').filter(Boolean) : [];
};
const collectTreeIds = (nodes: TreeNode[], ids = new Set<string>()) => {
  nodes.forEach(node => {
    ids.add(String(node.id));
    if (node.children?.length) collectTreeIds(node.children, ids);
  });
  return ids;
};

const store = useStore();
const isAdmin = computed(() => store.getters.userInfo?.authority?.includes('admin') ?? false);
const canReset = computed(() => validData(store.getters.permission?.user_reset, false));
const hasMoreActions = computed(() => isAdmin.value || canReset.value);
const searchForm = ref<UserQuery>(createInitialQuery());
const form = ref<UserForm>(createInitialForm());
const mode = ref<CrudMode>('add');
const dialogVisible = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const resetRunning = ref(false);
const unlockRunning = ref(false);
const exportLoading = ref(false);
const formTarget = ref<UserEntity>();
const formRef = ref<InstanceType<typeof ElForm>>();
const tableRef = ref<TableInstance>();

const validatePassword = (rule: object, value: string, callback: (error?: Error) => void) => {
  if (mode.value === 'add' && !value) callback(new Error('请输入密码'));
  else callback();
};
const validatePassword2 = (rule: object, value: string, callback: (error?: Error) => void) => {
  if (mode.value !== 'add') callback();
  else if (!value) callback(new Error('请再次输入密码'));
  else if (value !== form.value.password) callback(new Error('两次输入密码不一致!'));
  else callback();
};
const formRules: FormRules = {
  account: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  tenantId: [{ required: website.tenantMode, message: '请选择所属租户', trigger: 'change' }],
  password: [{ validator: validatePassword, trigger: 'blur' }],
  password2: [{ validator: validatePassword2, trigger: 'blur' }],
  name: [{ required: true, message: '请输入用户昵称', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入用户姓名', trigger: 'blur' }],
  roleId: [{ required: true, message: '请选择所属角色', trigger: 'change' }],
  deptId: [{ required: true, message: '请选择所属部门', trigger: 'change' }],
  postId: [{ required: true, message: '请选择所属岗位', trigger: 'change' }],
  email: [{ type: 'email', message: '请输入正确的电子邮箱', trigger: 'blur' }],
};

const { data, query, page, loading, load, search, reset, refresh } = usePagedList<
  UserEntity,
  UserQuery,
  UserListResponse
>({
  fetcher: (current, size, queryValue) => getList<UserEntity>(current, size, queryValue),
  resolveResponse: response => ({
    records: response.data.data.records.map(row => {
      const safeRow = { ...row };
      delete safeRow.password;
      delete safeRow.password2;
      return safeRow;
    }),
    total: response.data.data.total,
  }),
  createInitialQuery,
});
const selection = useTableSelection<UserEntity>();
const { selectedRows, ids, handleSelectionChange, clearSelection } = selection;
const { add: canAdd, view: canView, edit: canEdit, delete: canDelete } = useCrudPermission('user');
const detail = useRemoteDetail<UserEntity, string>(async id => {
  const response = await getUser<UserEntity>(id);
  const entity = { ...response.data.data };
  delete entity.password;
  delete entity.password2;
  return entity;
});
const tenantState = useRemoteOptions<TenantOption>(async () => {
  const response = await getTenantSelect();
  return response.data.data;
});
const deptState = useRemoteOptions<SelectTreeNode, readonly [string | undefined]>(
  async tenantId => {
    const response = await getDeptTree<SelectTreeNode>(tenantId);
    return response.data.data;
  }
);
const roleState = useRemoteOptions<SelectTreeNode, readonly [string | undefined]>(
  async tenantId => {
    const response = await getRoleTree<SelectTreeNode>(tenantId);
    return response.data.data;
  }
);
const postState = useRemoteOptions<PostOption, readonly [string | undefined]>(async tenantId => {
  const response = await getPostList<PostOption>(tenantId);
  return response.data.data;
});
const {
  options: tenantOptions,
  loading: tenantLoading,
  failed: tenantFailed,
  load: loadTenantOptions,
} = tenantState;
const { options: deptOptions, loading: deptLoading, failed: deptFailed } = deptState;
const { options: roleOptions, loading: roleLoading, failed: roleFailed } = roleState;
const { options: postOptions, loading: postLoading, failed: postFailed } = postState;
const { loading: detailLoading, failed: detailFailed } = detail;
const linkedLoading = computed(() => deptLoading.value || roleLoading.value || postLoading.value);
const linkedOptionsFailed = computed(
  () => deptFailed.value || roleFailed.value || postFailed.value
);
const formLoading = computed(
  () => detailLoading.value || linkedLoading.value || (website.tenantMode && tenantLoading.value)
);
const treeSelectProps = { children: 'children', label: 'title' };

const importVisible = ref(false);
const importing = ref(false);
const templateLoading = ref(false);
const importFiles = ref<UploadUserFile[]>([]);
const uploadRef = ref<UploadInstance>();
const operationRunning = computed(
  () =>
    submitting.value ||
    deleting.value ||
    resetRunning.value ||
    unlockRunning.value ||
    exportLoading.value ||
    importing.value
);

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
const handlePageChange = (nextPage: PaginationChange) => {
  page.value = { ...page.value, ...nextPage };
  void load();
};

const clearLinkedOptions = () => {
  deptState.clear();
  roleState.clear();
  postState.clear();
};
const loadLinkedOptions = (tenantId?: string) =>
  Promise.all([deptState.load(tenantId), roleState.load(tenantId), postState.load(tenantId)]);
const resetDialogState = () => {
  detail.clear();
  clearLinkedOptions();
  formTarget.value = undefined;
  formRef.value?.clearValidate();
};
const openAdd = () => {
  resetDialogState();
  mode.value = 'add';
  form.value = createInitialForm();
  dialogVisible.value = true;
  if (!website.tenantMode) void loadLinkedOptions();
  nextTick(() => formRef.value?.clearValidate());
};
const initializeDetail = async (target: UserEntity) => {
  const entity = await detail.load(target.id);
  if (!entity) return;
  await loadLinkedOptions(website.tenantMode ? entity.tenantId : undefined);
  form.value = {
    ...entity,
    password: undefined,
    password2: undefined,
    deptId: splitIds(entity.deptId),
    roleId: splitIds(entity.roleId),
    postId: splitIds(entity.postId),
  };
  await nextTick();
  formRef.value?.clearValidate();
};
const openDetail = (row: UserEntity, dialogMode: 'edit' | 'view') => {
  resetDialogState();
  mode.value = dialogMode;
  form.value = createInitialForm();
  formTarget.value = row;
  dialogVisible.value = true;
  void initializeDetail(row);
};
const retryDetail = () => {
  if (formTarget.value) void initializeDetail(formTarget.value);
};
const retryLinkedOptions = () =>
  void loadLinkedOptions(website.tenantMode ? form.value.tenantId : undefined);
const handleTenantChange = (tenantId: string) => {
  form.value.deptId = [];
  form.value.roleId = [];
  form.value.postId = [];
  clearLinkedOptions();
  if (tenantId) void loadLinkedOptions(tenantId);
};
const handleDialogCancel = () => resetDialogState();

const validateLinkedSelection = () => {
  const deptIds = collectTreeIds(deptOptions.value);
  const roleIds = collectTreeIds(roleOptions.value);
  const postIds = new Set(postOptions.value.map(item => item.id));
  return (
    splitIds(form.value.deptId).every(id => deptIds.has(id)) &&
    splitIds(form.value.roleId).every(id => roleIds.has(id)) &&
    splitIds(form.value.postId).every(id => postIds.has(id))
  );
};
const handleSubmit = async () => {
  if (
    !formRef.value ||
    submitting.value ||
    formLoading.value ||
    linkedOptionsFailed.value ||
    (website.tenantMode && tenantFailed.value)
  ) {
    return;
  }
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  if (!validateLinkedSelection()) {
    ElMessage.warning('关联选项已失效，请重新选择');
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      ...form.value,
      deptId: splitIds(form.value.deptId).join(','),
      roleId: splitIds(form.value.roleId).join(','),
      postId: splitIds(form.value.postId).join(','),
    };
    delete payload.password2;
    if (mode.value !== 'add') delete payload.password;
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
    deleting.value = true;
    await remove(deleteIds);
    clearTableSelection();
    await refresh();
    ElMessage.success('操作成功!');
  } catch {
    // 用户取消或接口失败时保持当前列表和选择。
  } finally {
    deleting.value = false;
  }
};
const handleRowDelete = (row: UserEntity) => void confirmDelete(row.id);
const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  void confirmDelete(ids.value);
};

const handleResetPassword = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  try {
    await ElMessageBox.confirm('确定将选择账号密码重置为初始密码?', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    resetRunning.value = true;
    await resetPassword(ids.value);
    clearTableSelection();
    await refresh();
    ElMessage.success('操作成功!');
  } catch {
    // 用户取消或接口失败时保留选择。
  } finally {
    resetRunning.value = false;
  }
};
const handleUnlock = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  try {
    await ElMessageBox.confirm('确定将选择账号解封?', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    unlockRunning.value = true;
    await unlock(ids.value);
    clearTableSelection();
    await refresh();
    ElMessage.success('操作成功!');
  } catch {
    // 用户取消或接口失败时保留选择。
  } finally {
    unlockRunning.value = false;
  }
};

const grantVisible = ref(false);
const grantSubmitting = ref(false);
const grantTargetIds = ref('');
const grantTarget = ref<GrantTarget>();
const grantTreeData = ref<TreeNode[]>([]);
const grantKeys = ref<TreeKey[]>([]);
const grantLinked = ref(false);
const grantTargetCount = ref(0);
const grantDetail = useRemoteDetail<GrantModel, GrantTarget>(async target => {
  const response = await getRoleTree(target.tenantId);
  return { tree: response.data.data, keys: target.keys };
});
const { loading: grantLoading, failed: grantFailed } = grantDetail;

const clearGrant = () => {
  grantDetail.clear();
  grantTargetIds.value = '';
  grantTarget.value = undefined;
  grantTargetCount.value = 0;
  grantTreeData.value = [];
  grantKeys.value = [];
  grantLinked.value = false;
};
const loadGrant = async (target: GrantTarget) => {
  const result = await grantDetail.load(target);
  if (!result) return;
  grantTreeData.value = result.tree;
  grantKeys.value = result.keys;
};
const openGrant = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  const tenantIds = new Set(selectedRows.value.map(row => row.tenantId ?? ''));
  if (website.tenantMode && tenantIds.size !== 1) {
    ElMessage.warning('只能为同一租户的用户批量配置角色');
    return;
  }
  clearGrant();
  const target: GrantTarget = {
    tenantId: website.tenantMode ? selectedRows.value[0].tenantId : undefined,
    keys: selectedRows.value.length === 1 ? splitIds(selectedRows.value[0].roleId) : [],
  };
  grantTarget.value = target;
  grantTargetIds.value = ids.value;
  grantTargetCount.value = selectedRows.value.length;
  grantVisible.value = true;
  void loadGrant(target);
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
    await grant(grantTargetIds.value, grantKeys.value.join(','));
    grantVisible.value = false;
    clearGrant();
    clearTableSelection();
    await refresh();
    ElMessage.success('操作成功!');
  } catch {
    // 配置失败时保留勾选状态供重试。
  } finally {
    grantSubmitting.value = false;
  }
};

const isExcelFile = (fileName: string) => /\.(xls|xlsx)$/i.test(fileName);
const validateImportFile = (file: File) => {
  if (isExcelFile(file.name)) return true;
  ElMessage.warning('请选择 .xls 或 .xlsx 格式文件');
  return false;
};
const openImport = () => {
  importFiles.value = [];
  importVisible.value = true;
};
const handleImportRequest = async (options: UploadRequestOptions) => {
  importing.value = true;
  try {
    await importUsers(options.file);
    importVisible.value = false;
    importFiles.value = [];
    uploadRef.value?.clearFiles();
    await refresh();
    ElMessage.success('导入成功!');
  } finally {
    importing.value = false;
  }
};
const submitImport = () => {
  const rawFile = importFiles.value[0]?.raw;
  if (!rawFile) {
    ElMessage.warning('请选择需要导入的 Excel 文件');
    return;
  }
  if (!validateImportFile(rawFile)) return;
  uploadRef.value?.submit();
};
const closeImport = () => {
  if (importing.value) return;
  importVisible.value = false;
  importFiles.value = [];
  uploadRef.value?.clearFiles();
};
const handleImportBeforeClose = (done: () => void) => {
  if (importing.value) return;
  importFiles.value = [];
  uploadRef.value?.clearFiles();
  done();
};

const showDownloadError = (error: object) => {
  if (!axios.isAxiosError(error) && error instanceof Error) ElMessage.error(error.message);
};
const handleExport = async () => {
  try {
    await ElMessageBox.confirm('是否按当前已执行查询条件导出用户数据?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    exportLoading.value = true;
    const response = await exportUsers({ ...query.value });
    await downloadBlob(response, '用户数据.xlsx');
  } catch (error) {
    showDownloadError(error);
  } finally {
    exportLoading.value = false;
  }
};
const handleTemplateDownload = async () => {
  templateLoading.value = true;
  try {
    const response = await downloadUserTemplate();
    await downloadBlob(response, '用户导入模板.xlsx');
  } catch (error) {
    showDownloadError(error);
  } finally {
    templateLoading.value = false;
  }
};

const handleMoreAction = (command: string) => {
  const actions: { [key: string]: () => void } = {
    grant: openGrant,
    reset: () => void handleResetPassword(),
    unlock: () => void handleUnlock(),
    import: openImport,
    export: () => void handleExport(),
  };
  actions[command]?.();
};

onMounted(() => {
  void load();
  if (website.tenantMode) void tenantState.load();
});
</script>

<style scoped lang="scss">
.user-management-page {
  min-width: 0;
}

.user-more-icon {
  margin-left: 6px;
}

.user-grant-dialog {
  min-height: 260px;
}

.user-grant-alert {
  margin-bottom: 16px;
}

.user-template-button {
  margin-top: 16px;
}

:deep(.el-select),
:deep(.el-tree-select),
:deep(.el-date-editor) {
  width: 100%;
}
</style>
