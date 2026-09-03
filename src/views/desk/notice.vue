<template>
  <div class="notice-management-page">
    <search-panel
      :model="searchForm"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item label="通知标题">
          <el-input v-model="searchForm.title" clearable placeholder="请输入通知标题" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item label="通知类型">
          <dict-select
            v-model="searchForm.category"
            code="notice"
            value-type="number"
            placeholder="请选择通知类型"
          />
        </el-form-item>
      </el-col>
    </search-panel>

    <list-panel title="通知公告列表">
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
        <el-table-column prop="title" label="通知标题" min-width="220" show-overflow-tooltip />
        <el-table-column prop="category" label="通知类型" min-width="130">
          <template #default="{ row }">
            <dict-tag code="notice" :value="row.category" value-type="number" />
          </template>
        </el-table-column>
        <el-table-column
          prop="releaseTime"
          label="通知日期"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="contentSummary"
          label="通知内容"
          min-width="280"
          show-overflow-tooltip
        />
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
              @view="openDetail(row as NoticeListItem, 'view')"
              @edit="openDetail(row as NoticeListItem, 'edit')"
              @delete="handleRowDelete(row as NoticeListItem)"
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
      entity-name="通知公告"
      :submitting="submitting"
      :loading="detailLoading"
      :confirm-disabled="formUnavailable"
      width="880px"
      destroy-on-close
      @confirm="handleSubmit"
      @cancel="handleDialogCancel"
    >
      <el-result v-if="detailFailed" status="error" title="通知公告详情加载失败">
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
          <el-col :span="24">
            <el-form-item label="通知标题" prop="title">
              <el-input v-model="form.title" placeholder="请输入通知标题" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="通知类型" prop="category">
              <dict-select
                v-model="form.category"
                code="notice"
                value-type="number"
                :disabled="mode === 'view'"
                placeholder="请选择通知类型"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="通知日期" prop="releaseTime">
              <el-date-picker
                v-model="form.releaseTime"
                type="datetime"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="请选择通知日期"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="通知内容">
              <el-alert
                v-if="contentCompatibilityRisk"
                class="notice-management-page__editor-alert"
                type="warning"
                :closable="false"
                title="历史内容包含当前安全白名单不支持的结构，仅允许查看，不能直接覆盖保存。"
                show-icon
              />
              <el-alert
                v-if="editorFailed"
                class="notice-management-page__editor-alert"
                type="error"
                :closable="false"
                title="富文本编辑器加载失败，已禁止提交。"
                show-icon
              >
                <template #default>
                  <el-button type="primary" link :icon="Refresh" @click="retryEditor">
                    重新加载编辑器
                  </el-button>
                </template>
              </el-alert>
              <notice-editor
                v-if="mode === 'add' || detailData"
                :key="editorVersion"
                v-model="form.content"
                :disabled="mode === 'view' || detailLoading"
                :rows="3"
                @ready="handleEditorReady"
                @error="handleEditorError"
                @uploading="handleEditorUploading"
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
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import ListPagination from '@/components/list-pagination/main.vue';
import FormDialog from '@/components/form-dialog/main.vue';
import RowActions from '@/components/row-actions/main.vue';
import DictSelect from '@/components/dict-select/main.vue';
import DictTag from '@/components/dict-tag/main.vue';
import NoticeEditor from '@/views/desk/components/notice-editor.vue';
import { useCrudPermission } from '@/composables/useCrudPermission';
import { usePagedList } from '@/composables/usePagedList';
import { useRemoteDetail } from '@/composables/useRemoteDetail';
import { useTableSelection } from '@/composables/useTableSelection';
import { add, getList, getNotice, remove, update } from '@/api/desk/notice';
import type { CrudMode } from '@/types/crud';
import type { PaginationChange } from '@/types/list';
import {
  extractNoticeText,
  hasNoticeHtmlCompatibilityRisk,
  isNoticeHtmlEmpty,
  sanitizeNoticeHtml,
} from '@/utils/noticeHtml';

interface NoticeEntity {
  id: string;
  title?: string;
  category?: number;
  categoryName?: string;
  releaseTime?: string;
  content?: string;
}

type NoticeListItem = Omit<NoticeEntity, 'content'> & { contentSummary: string };

interface NoticeQuery {
  title?: string;
  category?: number;
}

interface NoticeForm {
  id?: string;
  title: string;
  category?: number;
  releaseTime: string;
  content: string;
}

type NoticeListResponse = Awaited<ReturnType<typeof getList>>;

const createInitialQuery = (): NoticeQuery => ({});
const createInitialForm = (): NoticeForm => ({
  title: '',
  category: undefined,
  releaseTime: '',
  content: '',
});
const toForm = (entity: NoticeEntity): NoticeForm => ({
  id: entity.id,
  title: entity.title ?? '',
  category: entity.category === undefined ? undefined : Number(entity.category),
  releaseTime: entity.releaseTime ?? '',
  content: sanitizeNoticeHtml(entity.content),
});
const toListItem = (entity: NoticeEntity): NoticeListItem => {
  const { content, ...item } = entity;
  return { ...item, contentSummary: extractNoticeText(content) };
};

const searchForm = ref<NoticeQuery>(createInitialQuery());
const form = ref<NoticeForm>(createInitialForm());
const mode = ref<CrudMode>('add');
const dialogVisible = ref(false);
const submitting = ref(false);
const detailId = ref<string>();
const editorReady = ref(false);
const editorFailed = ref(false);
const editorUploading = ref(false);
const editorVersion = ref(0);
const contentCompatibilityRisk = ref(false);
const formRef = ref<InstanceType<typeof ElForm>>();
const tableRef = ref<TableInstance>();

const formRules: FormRules = {
  title: [{ required: true, message: '请输入通知标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择通知类型', trigger: 'change' }],
  releaseTime: [{ required: true, message: '请选择通知日期', trigger: 'change' }],
};

const { data, page, loading, load, search, reset, refresh } = usePagedList<
  NoticeListItem,
  NoticeQuery,
  NoticeListResponse
>({
  fetcher: (current, size, query) => getList(current, size, query),
  resolveResponse: response => ({
    records: response.data.data.records.map((item: NoticeEntity) => toListItem(item)),
    total: response.data.data.total,
  }),
  createInitialQuery,
});
const { selectedRows, ids, handleSelectionChange, clearSelection } =
  useTableSelection<NoticeListItem>();
const {
  add: canAdd,
  view: canView,
  edit: canEdit,
  delete: canDelete,
} = useCrudPermission('notice');
const {
  data: detailData,
  loading: detailLoading,
  failed: detailFailed,
  load: loadDetail,
  clear: clearDetail,
} = useRemoteDetail<NoticeEntity, string>(async id => {
  const response = await getNotice(id);
  return response.data.data;
});

const formUnavailable = computed(
  () =>
    detailLoading.value ||
    detailFailed.value ||
    contentCompatibilityRisk.value ||
    (mode.value !== 'view' &&
      (!editorReady.value || editorFailed.value || editorUploading.value))
);

const resetEditorState = () => {
  editorReady.value = false;
  editorFailed.value = false;
  editorUploading.value = false;
  contentCompatibilityRisk.value = false;
};

const handleEditorReady = () => {
  editorReady.value = true;
  editorFailed.value = false;
};

const handleEditorError = () => {
  editorReady.value = false;
  editorFailed.value = true;
};

const handleEditorUploading = (uploading: boolean) => {
  editorUploading.value = uploading;
};

const retryEditor = () => {
  editorReady.value = false;
  editorFailed.value = false;
  editorUploading.value = false;
  editorVersion.value += 1;
};

const clearTableSelection = () => {
  clearSelection();
  tableRef.value?.clearSelection();
};

watch(data, clearTableSelection, { flush: 'post' });

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

const openAdd = () => {
  clearDetail();
  resetEditorState();
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
  contentCompatibilityRisk.value = hasNoticeHtmlCompatibilityRisk(detail.content);
  form.value = toForm(detail);
  await nextTick();
  formRef.value?.clearValidate();
};

const openDetail = (row: NoticeListItem, dialogMode: 'edit' | 'view') => {
  clearDetail();
  resetEditorState();
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
  resetEditorState();
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
    contentCompatibilityRisk.value ||
    !editorReady.value ||
    editorFailed.value ||
    editorUploading.value ||
    (mode.value !== 'add' && !detailData.value)
  ) {
    return;
  }
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const submit = mode.value === 'add' ? add : update;
    const content = isNoticeHtmlEmpty(form.value.content)
      ? ''
      : sanitizeNoticeHtml(form.value.content);
    await submit({ ...form.value, content });
    dialogVisible.value = false;
    resetDialogState();
    clearTableSelection();
    await refresh();
    ElMessage.success('操作成功!');
  } catch {
    // Axios 已处理错误提示，保留标题、时间和富文本内容供用户重试。
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

const handleRowDelete = (row: NoticeListItem) => {
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
.notice-management-page {
  min-width: 0;
}

.notice-management-page__editor-alert {
  width: 100%;
  margin-bottom: 12px;
}

:deep(.el-date-editor.el-input) {
  width: 100%;
}
</style>
