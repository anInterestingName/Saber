<template>
  <div class="prompt-management-page">
    <search-panel
      :model="searchForm"
      :loading="loading"
      label-width="64px"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="名称">
          <el-input v-model="searchForm.name" clearable placeholder="请输入提示词名称" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="编码">
          <el-input v-model="searchForm.code" clearable placeholder="请输入提示词编码" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部状态">
            <el-option label="草稿" :value="0" />
            <el-option label="已发布" :value="1" />
            <el-option label="已停用" :value="2" />
          </el-select>
        </el-form-item>
      </el-col>
    </search-panel>

    <list-panel title="提示词列表">
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
      </template>
      <template #tools>
        <el-tooltip content="刷新" placement="top">
          <el-button circle :icon="Refresh" :loading="loading" aria-label="刷新" @click="refresh" />
        </el-tooltip>
      </template>

      <el-table v-loading="loading" :data="data" row-key="id">
        <el-table-column prop="promptName" label="名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="promptCode" label="编码" min-width="180" show-overflow-tooltip>
          <template #default="{ row }"
            ><code>{{ row.promptCode }}</code></template
          >
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row as PromptListItem) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前版本" width="110" align="center">
          <template #default="{ row }">
            {{ row.currentVersionNo ? `V${row.currentVersionNo}` : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="草稿状态" width="140" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.draftDirty" type="warning">有待发布草稿</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ formatTime(row.updateTime) }}</template>
        </el-table-column>
        <el-table-column
          v-if="hasAnyRowAction"
          label="操作"
          fixed="right"
          width="230"
          align="center"
        >
          <template #default="{ row }">
            <row-actions
              :show-view="canView"
              :show-edit="canEdit && row.actions.editable"
              :disabled="isRowBusy(row.id)"
              @view="openView(row.id)"
              @edit="openEdit(row.id)"
            >
              <template #extra>
                <el-dropdown
                  v-if="hasMoreActions(row as PromptListItem)"
                  trigger="click"
                  :disabled="isRowBusy(row.id)"
                  @command="command => handleMoreAction(command, row as PromptListItem)"
                >
                  <el-button type="primary" link :loading="isRowBusy(row.id)">
                    更多<el-icon class="prompt-more-icon"><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item v-if="canCopy" :icon="CopyDocument" command="copy">
                        复制
                      </el-dropdown-item>
                      <el-dropdown-item v-if="canPreview" :icon="View" command="preview">
                        预览
                      </el-dropdown-item>
                      <el-dropdown-item v-if="canView" :icon="Clock" command="versions">
                        版本历史
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="canPublish && row.actions.publishable"
                        :icon="Promotion"
                        command="publish"
                      >
                        {{ row.status === 2 ? '重新发布' : '发布' }}
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="canDisable && row.actions.disableable"
                        :icon="CircleClose"
                        command="disable"
                      >
                        停用
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="canDelete && row.actions.removable"
                        divided
                        :icon="Delete"
                        command="delete"
                      >
                        <span class="prompt-danger-action">删除</span>
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </row-actions>
          </template>
        </el-table-column>

        <template #empty>
          <div class="prompt-empty">
            <el-empty description="暂无提示词" :image-size="88" />
            <el-button v-if="canAdd" type="primary" :icon="Plus" @click="openAdd">
              新增提示词
            </el-button>
          </div>
        </template>
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

    <prompt-editor-dialog
      v-model="editorVisible"
      :mode="editorMode"
      :prompt-id="editorPromptId"
      :can-preview="canPreview"
      :can-create="canAdd"
      :can-edit="canEdit"
      @saved="handleEditorSaved"
    />

    <prompt-preview-drawer v-model="previewVisible" :snapshot="previewSnapshot" />

    <prompt-version-drawer
      v-model="versionVisible"
      :prompt-id="versionPromptId"
      :can-rollback="canRollback"
      :refresh-key="versionRefreshKey"
      @rollback-request="openRollback"
    />

    <prompt-action-dialog
      v-model="actionVisible"
      :action="actionType"
      :detail="actionDetail"
      :target-version="actionTargetVersion"
      @completed="handleActionCompleted"
    />

    <form-dialog
      v-model="copyVisible"
      mode="add"
      entity-name="提示词副本"
      :submitting="copying"
      width="560px"
      destroy-on-close
      @confirm="submitCopy"
      @cancel="resetCopy"
    >
      <el-form ref="copyFormRef" :model="copyForm" :rules="copyRules" label-width="88px">
        <el-form-item label="来源提示词">
          <span>{{ copySourceName }}</span>
        </el-form-item>
        <el-form-item label="新名称" prop="promptName">
          <el-input v-model="copyForm.promptName" maxlength="100" placeholder="请输入新名称" />
        </el-form-item>
        <el-form-item label="新编码" prop="promptCode">
          <el-input
            v-model="copyForm.promptCode"
            maxlength="64"
            placeholder="请输入新编码"
            @blur="normalizeCopyCode"
          />
        </el-form-item>
      </el-form>
    </form-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import {
  ArrowDown,
  CircleClose,
  Clock,
  CopyDocument,
  Delete,
  Plus,
  Promotion,
  Refresh,
  View,
} from '@element-plus/icons-vue';
import { ElForm, ElMessage, ElMessageBox, type FormRules } from 'element-plus';
import dayjs from 'dayjs';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import ListPagination from '@/components/list-pagination/main.vue';
import RowActions from '@/components/row-actions/main.vue';
import FormDialog from '@/components/form-dialog/main.vue';
import PromptEditorDialog from './components/prompt-editor-dialog.vue';
import PromptPreviewDrawer from './components/prompt-preview-drawer.vue';
import PromptVersionDrawer from './components/prompt-version-drawer.vue';
import PromptActionDialog, { type PromptAction } from './components/prompt-action-dialog.vue';
import { useCrudPermission } from '@/composables/useCrudPermission';
import { usePagedList } from '@/composables/usePagedList';
import { useUserStore } from '@/store/user';
import { validData } from '@/utils/util';
import {
  copyPrompt,
  getPromptDetail,
  getPromptList,
  removePrompt,
  type PromptDetail,
  type PromptDraftPayload,
  type PromptListItem,
  type PromptMutation,
  type PromptQuery,
  type PromptVersion,
} from '@/api/ai/prompt';
import type { CrudMode } from '@/types/crud';
import type { PaginationChange } from '@/types/list';
import { normalizePromptVariable } from './promptVariable';

type PromptListResponse = Awaited<ReturnType<typeof getPromptList>>;
type MoreAction = 'copy' | 'preview' | 'versions' | 'publish' | 'disable' | 'delete';

interface CopyForm {
  promptName: string;
  promptCode: string;
}

const createInitialQuery = (): PromptQuery => ({});
const createCopyForm = (): CopyForm => ({ promptName: '', promptCode: '' });

const searchForm = ref<PromptQuery>(createInitialQuery());
const editorVisible = ref(false);
const editorMode = ref<CrudMode>('add');
const editorPromptId = ref<string>();
const previewVisible = ref(false);
const previewSnapshot = ref<PromptDraftPayload | null>(null);
const versionVisible = ref(false);
const versionPromptId = ref<string>();
const versionRefreshKey = ref(0);
const actionVisible = ref(false);
const actionType = ref<PromptAction>('publish');
const actionDetail = ref<PromptDetail | null>(null);
const actionTargetVersion = ref<PromptVersion | null>(null);
const copyVisible = ref(false);
const copySourceId = ref('');
const copySourceName = ref('');
const copyForm = ref<CopyForm>(createCopyForm());
const copyFormRef = ref<InstanceType<typeof ElForm>>();
const copying = ref(false);
const contextLoadingPromptId = ref('');
const deletingPromptId = ref('');
let latestContextRequest = 0;

const { permission } = storeToRefs(useUserStore());
const {
  add: canAdd,
  view: canView,
  edit: canEdit,
  delete: canDelete,
} = useCrudPermission('prompt');
const canCopy = computed(() => validData(permission.value.prompt_copy, false));
const canPreview = computed(() => validData(permission.value.prompt_preview, false));
const canPublish = computed(() => validData(permission.value.prompt_publish, false));
const canDisable = computed(() => validData(permission.value.prompt_disable, false));
const canRollback = computed(() => validData(permission.value.prompt_rollback, false));
const hasAnyRowAction = computed(
  () =>
    canView.value ||
    canEdit.value ||
    canDelete.value ||
    canCopy.value ||
    canPreview.value ||
    canPublish.value ||
    canDisable.value
);
const operationRunning = computed(() =>
  Boolean(contextLoadingPromptId.value || deletingPromptId.value || copying.value)
);

const { data, page, loading, load, search, reset, refresh } = usePagedList<
  PromptListItem,
  PromptQuery,
  PromptListResponse
>({
  fetcher: (current, size, query) => getPromptList(current, size, query),
  resolveResponse: response => ({
    records: response.data.data.records,
    total: response.data.data.total,
  }),
  createInitialQuery,
});

const copyRules: FormRules = {
  promptName: [
    { required: true, message: '请输入新名称', trigger: 'blur' },
    { max: 100, message: '名称不能超过 100 个字符', trigger: 'blur' },
  ],
  promptCode: [
    { required: true, message: '请输入新编码', trigger: 'blur' },
    { max: 64, message: '编码不能超过 64 个字符', trigger: 'blur' },
  ],
};

const getStatusType = (status: number) => {
  if (status === 1) return 'success';
  if (status === 2) return 'danger';
  return 'info';
};
const getStatusLabel = (row: PromptListItem) => {
  if (row.statusName) return row.statusName;
  if (row.status === 0) return '草稿';
  if (row.status === 1) return '已发布';
  if (row.status === 2) return '已停用';
  return `未知状态 (${row.status})`;
};
const formatTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');
const isRowBusy = (_id: string) => operationRunning.value;
const hasMoreActions = (row: PromptListItem) =>
  canCopy.value ||
  canPreview.value ||
  canView.value ||
  (canPublish.value && row.actions.publishable) ||
  (canDisable.value && row.actions.disableable) ||
  (canDelete.value && row.actions.removable);

const handleSearch = () => {
  void search({
    name: searchForm.value.name?.trim() || undefined,
    code: searchForm.value.code?.trim().toLowerCase() || undefined,
    status: searchForm.value.status,
  });
};

const handleReset = () => {
  searchForm.value = createInitialQuery();
  void reset();
};

const handlePageChange = (nextPage: PaginationChange) => {
  page.value = { ...page.value, ...nextPage };
  void load();
};

const openEditor = (mode: CrudMode, promptId?: string) => {
  editorMode.value = mode;
  editorPromptId.value = promptId;
  editorVisible.value = true;
};
const openAdd = () => openEditor('add');
const openView = (promptId: string) => openEditor('view', promptId);
const openEdit = (promptId: string) => openEditor('edit', promptId);

const loadLatestDetail = async (promptId: string) => {
  const request = ++latestContextRequest;
  contextLoadingPromptId.value = promptId;
  try {
    const response = await getPromptDetail(promptId);
    return request === latestContextRequest ? response.data.data : null;
  } catch {
    return null;
  } finally {
    if (request === latestContextRequest) contextLoadingPromptId.value = '';
  }
};

const openPreview = async (promptId: string) => {
  const detail = await loadLatestDetail(promptId);
  if (!detail) return;
  previewSnapshot.value = {
    promptName: detail.promptName,
    promptCode: detail.promptCode,
    fixedInstruction: detail.fixedInstruction ?? '',
    userTemplate: detail.userTemplate ?? '',
    variables: detail.variables.map(normalizePromptVariable),
  };
  previewVisible.value = true;
};

const openVersions = (promptId: string) => {
  versionPromptId.value = promptId;
  versionVisible.value = true;
};

const isActionAllowed = (detail: PromptDetail, action: PromptAction) => {
  if (action === 'publish') return detail.actions.publishable;
  if (action === 'disable') return detail.actions.disableable;
  return detail.actions.rollbackable;
};

const openAction = async (
  action: PromptAction,
  promptId: string,
  targetVersion: PromptVersion | null = null
) => {
  const detail = await loadLatestDetail(promptId);
  if (!detail) return;
  if (!isActionAllowed(detail, action)) {
    ElMessage.warning('当前状态不允许此操作');
    if (action === 'rollback') versionRefreshKey.value += 1;
    return;
  }
  if (action === 'rollback' && targetVersion?.id === detail.currentVersionId) {
    ElMessage.warning('当前版本无需回滚');
    return;
  }
  actionType.value = action;
  actionDetail.value = detail;
  actionTargetVersion.value = targetVersion;
  actionVisible.value = true;
};

const openRollback = (version: PromptVersion) => {
  if (versionPromptId.value) void openAction('rollback', versionPromptId.value, version);
};

const openCopy = (row: PromptListItem) => {
  copySourceId.value = row.id;
  copySourceName.value = `${row.promptName} (${row.promptCode})`;
  copyForm.value = {
    promptName: `${row.promptName} 副本`,
    promptCode: `${row.promptCode}_copy`,
  };
  copyVisible.value = true;
};

const normalizeCopyCode = () => {
  copyForm.value.promptCode = copyForm.value.promptCode.trim().toLowerCase();
};

const resetCopy = () => {
  copyForm.value = createCopyForm();
  copySourceId.value = '';
  copySourceName.value = '';
  copyFormRef.value?.clearValidate();
};

const submitCopy = async () => {
  if (!copyFormRef.value || !copySourceId.value || copying.value) return;
  copyForm.value.promptName = copyForm.value.promptName.trim();
  normalizeCopyCode();
  const valid = await copyFormRef.value.validate().catch(() => false);
  if (!valid) return;
  copying.value = true;
  try {
    const response = await copyPrompt({
      sourcePromptId: copySourceId.value,
      promptName: copyForm.value.promptName.trim(),
      promptCode: copyForm.value.promptCode,
    });
    const copiedPromptId = response.data.data.id;
    copyVisible.value = false;
    resetCopy();
    ElMessage.success('提示词复制成功');
    await refresh();
    openEdit(copiedPromptId);
  } catch {
    // Axios 已处理错误提示，保留输入供用户修正。
  } finally {
    copying.value = false;
  }
};

const deletePrompt = async (promptId: string) => {
  if (operationRunning.value) return;
  deletingPromptId.value = promptId;
  try {
    const detail = await loadLatestDetail(promptId);
    if (!detail) return;
    if (!detail.actions.removable) {
      ElMessage.warning('当前提示词存在发布历史，不能删除');
      return;
    }
    await ElMessageBox.confirm(
      `确定删除提示词“${detail.promptName}”吗？编码 ${detail.promptCode} 删除后仍不可复用。`,
      '删除提示词',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    await removePrompt({ id: detail.id, lockVersion: detail.lockVersion });
    ElMessage.success('提示词删除成功');
    await refresh();
  } catch {
    // 删除失败时保留当前查询和列表，用户可重新发起操作。
  } finally {
    deletingPromptId.value = '';
  }
};

const handleMoreAction = (command: MoreAction, row: PromptListItem) => {
  if (command === 'copy') openCopy(row);
  else if (command === 'preview') void openPreview(row.id);
  else if (command === 'versions') openVersions(row.id);
  else if (command === 'publish') void openAction('publish', row.id);
  else if (command === 'disable') void openAction('disable', row.id);
  else if (command === 'delete') void deletePrompt(row.id);
};

const handleEditorSaved = async (_mutation: PromptMutation) => {
  await refresh();
};

const handleActionCompleted = async (_mutation: PromptMutation) => {
  versionRefreshKey.value += 1;
  await refresh();
};

watch(previewVisible, value => {
  if (!value) previewSnapshot.value = null;
});

watch(actionVisible, value => {
  if (!value) {
    actionDetail.value = null;
    actionTargetVersion.value = null;
  }
});

watch(versionVisible, value => {
  if (!value) versionPromptId.value = undefined;
});

watch(copyVisible, value => {
  if (!value && !copying.value) resetCopy();
});

onMounted(() => {
  void load();
});
</script>

<style scoped lang="scss">
.prompt-management-page {
  min-width: 0;
}

.prompt-more-icon {
  margin-left: 4px;
}

.prompt-danger-action {
  color: var(--el-color-danger);
}

.prompt-empty {
  display: flex;
  padding-bottom: 20px;
  align-items: center;
  flex-direction: column;
}

:deep(.row-actions .el-dropdown .el-button) {
  min-width: 52px;
  height: 32px;
  padding: 4px 6px;
}

@media (max-width: 767px) {
  :deep(.el-table) {
    min-width: 920px;
  }
}
</style>
