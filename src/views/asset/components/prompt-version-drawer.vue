<template>
  <el-drawer
    v-model="visible"
    class="prompt-version-drawer"
    append-to-body
    direction="rtl"
    title="提示词版本历史"
    size="min(1040px, 100vw)"
    @closed="resetState"
  >
    <div class="prompt-version-drawer__body">
      <el-alert
        v-if="detailFailed"
        title="最新提示词详情加载失败，回滚入口已禁用"
        type="error"
        :closable="false"
        show-icon
      />

      <div class="prompt-version-layout">
        <section class="prompt-version-list">
          <div class="prompt-version-heading">
            <div>
              <h3>版本列表</h3>
              <p>按版本号倒序，共 {{ page.total }} 个版本。</p>
            </div>
            <el-tooltip content="刷新版本" placement="top">
              <el-button
                circle
                :icon="Refresh"
                :loading="listLoading"
                aria-label="刷新版本"
                @click="loadContext"
              />
            </el-tooltip>
          </div>

          <div v-loading="listLoading" class="prompt-version-list__content">
            <el-result v-if="listFailed" icon="error" title="版本列表加载失败" sub-title="请重试">
              <template #extra>
                <el-button type="primary" @click="loadVersions">重新加载</el-button>
              </template>
            </el-result>
            <el-empty v-else-if="versions.length === 0" description="暂无发布版本" />
            <button
              v-for="version in versions"
              v-else
              :key="version.id"
              type="button"
              class="prompt-version-item"
              :class="{ 'prompt-version-item--active': selectedVersionId === version.id }"
              :aria-pressed="selectedVersionId === version.id"
              @click="selectVersion(version.id)"
            >
              <span class="prompt-version-item__topline">
                <strong>V{{ version.versionNo }}</strong>
                <el-tag
                  v-if="version.id === latestDetail?.currentVersionId"
                  size="small"
                  type="success"
                >
                  当前版本
                </el-tag>
                <el-tag size="small" :type="getSourceType(version.sourceType)">
                  {{ getSourceLabel(version.sourceType) }}
                </el-tag>
              </span>
              <span class="prompt-version-item__note">{{
                version.changeNote || '无变更说明'
              }}</span>
              <span class="prompt-version-item__meta">
                <span :title="`发布人 ${version.publishUser || '-'}`">
                  发布人 {{ version.publishUser || '-' }}
                </span>
                <time :title="formatTime(version.publishTime)">
                  {{ formatListTime(version.publishTime) }}
                </time>
              </span>
            </button>
          </div>

          <el-pagination
            v-if="page.total > page.pageSize"
            class="prompt-version-pagination"
            small
            background
            layout="prev, pager, next"
            :current-page="page.currentPage"
            :page-size="page.pageSize"
            :total="page.total"
            :disabled="listLoading"
            @current-change="changePage"
          />
        </section>

        <section class="prompt-version-detail">
          <div class="prompt-version-heading">
            <div>
              <h3>版本详情</h3>
              <p>历史快照不可编辑，正文和变量按纯文本展示。</p>
            </div>
            <el-button
              v-if="canRollbackSelected"
              type="warning"
              :icon="RefreshLeft"
              @click="requestRollback"
            >
              回滚到此版本
            </el-button>
          </div>

          <div v-loading="versionLoading" class="prompt-version-detail__content">
            <el-result
              v-if="versionFailed"
              icon="error"
              title="版本详情加载失败"
              sub-title="旧快照已清空"
            >
              <template #extra>
                <el-button :disabled="!selectedVersionId" @click="loadVersionDetail">
                  重新加载
                </el-button>
              </template>
            </el-result>
            <el-empty v-else-if="!selectedVersion" description="请选择版本" />
            <template v-else>
              <div class="prompt-version-summary">
                <div class="prompt-version-summary__main">
                  <div class="prompt-version-summary__title">
                    <strong>V{{ selectedVersion.versionNo }}</strong>
                    <el-tag
                      v-if="selectedVersion.id === latestDetail?.currentVersionId"
                      size="small"
                      type="success"
                    >
                      当前版本
                    </el-tag>
                    <el-tag
                      size="small"
                      effect="plain"
                      :type="getSourceType(selectedVersion.sourceType)"
                    >
                      {{ getSourceLabel(selectedVersion.sourceType) }}
                    </el-tag>
                  </div>
                  <div class="prompt-version-summary__identity">
                    <span>{{ selectedVersion.promptName }}</span>
                    <code>{{ selectedVersion.promptCode }}</code>
                  </div>
                  <p>{{ selectedVersion.changeNote || '无变更说明' }}</p>
                </div>
                <div class="prompt-version-summary__meta">
                  <span>发布人 {{ selectedVersion.publishUser || '-' }}</span>
                  <span>{{ formatTime(selectedVersion.publishTime) }}</span>
                </div>
              </div>

              <el-tabs v-model="activeDetailTab" class="prompt-version-tabs">
                <el-tab-pane label="内容快照" name="content">
                  <div class="prompt-version-content-list">
                    <section class="prompt-version-content">
                      <div class="prompt-version-content__heading">
                        <h4>固定指令</h4>
                        <el-tooltip content="复制固定指令" placement="top">
                          <el-button
                            text
                            circle
                            :icon="CopyDocument"
                            :disabled="!selectedVersion.fixedInstruction"
                            aria-label="复制固定指令"
                            @click="copyText(selectedVersion.fixedInstruction, '固定指令')"
                          />
                        </el-tooltip>
                      </div>
                      <el-scrollbar class="prompt-version-content__scrollbar">
                        <pre>{{ selectedVersion.fixedInstruction || '-' }}</pre>
                      </el-scrollbar>
                    </section>

                    <section class="prompt-version-content">
                      <div class="prompt-version-content__heading">
                        <h4>用户模板</h4>
                        <el-tooltip content="复制用户模板" placement="top">
                          <el-button
                            text
                            circle
                            :icon="CopyDocument"
                            :disabled="!selectedVersion.userTemplate"
                            aria-label="复制用户模板"
                            @click="copyText(selectedVersion.userTemplate, '用户模板')"
                          />
                        </el-tooltip>
                      </div>
                      <el-scrollbar class="prompt-version-content__scrollbar">
                        <pre>{{ selectedVersion.userTemplate || '-' }}</pre>
                      </el-scrollbar>
                    </section>
                  </div>
                </el-tab-pane>

                <el-tab-pane
                  :label="`变量快照 (${selectedVersion.variables.length})`"
                  name="variables"
                >
                  <div v-if="selectedVersion.variables.length" class="prompt-version-variable-forms">
                    <section
                      v-for="(variable, index) in selectedVersion.variables"
                      :key="variable.name"
                      class="prompt-version-variable-form"
                    >
                      <div class="prompt-version-variable-form__heading">
                        <strong>变量 {{ index + 1 }}</strong>
                        <div>
                          <el-tag size="small" effect="plain">
                            {{ getVariableTypeLabel(variable.type) }}
                          </el-tag>
                          <el-tag
                            size="small"
                            effect="plain"
                            :type="variable.required ? 'danger' : 'info'"
                          >
                            {{ variable.required ? '必填' : '选填' }}
                          </el-tag>
                        </div>
                      </div>

                      <el-form label-position="top" class="prompt-version-readonly-form">
                        <el-row :gutter="16">
                          <el-col :xs="24" :sm="12">
                            <el-form-item label="变量名">
                              <el-input :model-value="variable.name" readonly />
                            </el-form-item>
                          </el-col>
                          <el-col :xs="24" :sm="12">
                            <el-form-item label="显示名称">
                              <el-input :model-value="variable.displayName || '-'" readonly />
                            </el-form-item>
                          </el-col>
                          <el-col :xs="24" :sm="12">
                            <el-form-item label="变量类型">
                              <el-input :model-value="getVariableTypeLabel(variable.type)" readonly />
                            </el-form-item>
                          </el-col>
                          <el-col :xs="24" :sm="12">
                            <el-form-item label="最大长度">
                              <el-input :model-value="variable.maxLength?.toString() || '-'" readonly />
                            </el-form-item>
                          </el-col>
                          <el-col :xs="24" :sm="12">
                            <el-form-item label="默认值">
                              <el-input
                                :model-value="formatValue(variable.defaultValue)"
                                type="textarea"
                                :rows="2"
                                resize="none"
                                readonly
                              />
                            </el-form-item>
                          </el-col>
                          <el-col :xs="24" :sm="12">
                            <el-form-item label="示例值">
                              <el-input
                                :model-value="formatValue(variable.exampleValue)"
                                type="textarea"
                                :rows="2"
                                resize="none"
                                readonly
                              />
                            </el-form-item>
                          </el-col>
                          <el-col :span="24">
                            <el-form-item label="变量说明">
                              <el-input
                                :model-value="variable.description || '-'"
                                type="textarea"
                                :rows="2"
                                resize="none"
                                readonly
                              />
                            </el-form-item>
                          </el-col>
                        </el-row>
                      </el-form>
                    </section>
                  </div>
                  <el-empty v-else description="当前版本没有变量" :image-size="64" />
                </el-tab-pane>

                <el-tab-pane label="技术信息" name="metadata">
                  <el-form label-position="top" class="prompt-version-readonly-form">
                    <el-row :gutter="16">
                      <el-col :xs="24" :sm="12">
                        <el-form-item label="发布来源">
                          <el-input
                            :model-value="getSourceLabel(selectedVersion.sourceType)"
                            readonly
                          />
                        </el-form-item>
                      </el-col>
                      <el-col :xs="24" :sm="12">
                        <el-form-item label="来源版本">
                          <el-input :model-value="selectedVersion.sourceVersionId || '-'" readonly />
                        </el-form-item>
                      </el-col>
                      <el-col :xs="24" :sm="12">
                        <el-form-item label="草稿修订">
                          <el-input
                            :model-value="selectedVersion.sourceDraftRevision || '-'"
                            readonly
                          />
                        </el-form-item>
                      </el-col>
                      <el-col :xs="24" :sm="12">
                        <el-form-item label="发布人">
                          <el-input :model-value="selectedVersion.publishUser || '-'" readonly />
                        </el-form-item>
                      </el-col>
                      <el-col :span="24">
                        <el-form-item label="发布时间">
                          <el-input :model-value="formatTime(selectedVersion.publishTime)" readonly />
                        </el-form-item>
                      </el-col>
                      <el-col :span="24">
                        <el-form-item label="内容哈希">
                          <el-input :model-value="selectedVersion.contentHash || '-'" readonly>
                            <template #suffix>
                              <el-tooltip content="复制内容哈希" placement="top">
                                <el-button
                                  text
                                  circle
                                  :icon="CopyDocument"
                                  :disabled="!selectedVersion.contentHash"
                                  aria-label="复制内容哈希"
                                  @click="copyText(selectedVersion.contentHash, '内容哈希')"
                                />
                              </el-tooltip>
                            </template>
                          </el-input>
                        </el-form-item>
                      </el-col>
                      <el-col :span="24">
                        <el-form-item label="变更说明">
                          <el-input
                            :model-value="selectedVersion.changeNote || '-'"
                            type="textarea"
                            :rows="4"
                            resize="none"
                            readonly
                          />
                        </el-form-item>
                      </el-col>
                    </el-row>
                  </el-form>
                </el-tab-pane>
              </el-tabs>
            </template>
          </div>
        </section>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { CopyDocument, Refresh, RefreshLeft } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import {
  getPromptDetail,
  getPromptVersionDetail,
  getPromptVersionList,
  type PromptDetail,
  type PromptValue,
  type PromptVariableType,
  type PromptVersion,
} from '@/api/ai/prompt';
import type { PageState } from '@/types/list';

interface PromptVersionDrawerProps {
  modelValue: boolean;
  promptId?: string;
  canRollback?: boolean;
  refreshKey?: number;
}

const props = withDefaults(defineProps<PromptVersionDrawerProps>(), {
  promptId: undefined,
  canRollback: false,
  refreshKey: 0,
});

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  rollbackRequest: [version: PromptVersion];
}>();

const versions = ref<PromptVersion[]>([]);
const selectedVersionId = ref('');
const selectedVersion = ref<PromptVersion | null>(null);
const latestDetail = ref<PromptDetail | null>(null);
const page = ref<PageState>({ currentPage: 1, pageSize: 10, total: 0 });
const listLoading = ref(false);
const listFailed = ref(false);
const versionLoading = ref(false);
const versionFailed = ref(false);
const detailFailed = ref(false);
const activeDetailTab = ref('content');
let latestListRequest = 0;
let latestVersionRequest = 0;
let latestDetailRequest = 0;
let loadedDetailPromptId = '';

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});
const canRollbackSelected = computed(
  () =>
    props.canRollback &&
    Boolean(latestDetail.value?.actions.rollbackable) &&
    Boolean(selectedVersion.value) &&
    selectedVersion.value?.id !== latestDetail.value?.currentVersionId &&
    !listLoading.value &&
    !versionLoading.value &&
    !detailFailed.value
);

const variableTypeLabels: { [key in PromptVariableType]: string } = {
  TEXT: '单行文本',
  MULTILINE_TEXT: '多行文本',
  NUMBER: '数字',
  BOOLEAN: '布尔值',
};

const getSourceLabel = (sourceType: number) => {
  if (sourceType === 1) return '普通发布';
  if (sourceType === 2) return '回滚发布';
  return `未知来源 (${sourceType})`;
};
const getSourceType = (sourceType: number) => (sourceType === 2 ? 'warning' : 'primary');
const getVariableTypeLabel = (type: PromptVariableType) => variableTypeLabels[type] ?? type;
const formatTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');
const formatListTime = (value?: string) => (value ? dayjs(value).format('MM-DD HH:mm') : '-');
const formatValue = (value: PromptValue) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

const copyText = async (value: string | undefined, label: string) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    ElMessage.success(`${label}已复制`);
  } catch {
    ElMessage.error('复制失败，请手动复制');
  }
};

const loadLatestDetail = async () => {
  if (!props.promptId) return null;
  const request = ++latestDetailRequest;
  detailFailed.value = false;
  if (loadedDetailPromptId !== props.promptId) latestDetail.value = null;
  try {
    const response = await getPromptDetail(props.promptId);
    if (request !== latestDetailRequest) return null;
    latestDetail.value = response.data.data;
    loadedDetailPromptId = props.promptId;
    return response.data.data;
  } catch {
    if (request === latestDetailRequest) {
      latestDetail.value = null;
      loadedDetailPromptId = '';
      detailFailed.value = true;
    }
    return null;
  }
};

const loadVersions = async () => {
  if (!props.promptId) return;
  const request = ++latestListRequest;
  listLoading.value = true;
  listFailed.value = false;
  try {
    const response = await getPromptVersionList(
      props.promptId,
      page.value.currentPage,
      page.value.pageSize
    );
    if (request !== latestListRequest) return;
    versions.value = response.data.data.records;
    page.value.total = response.data.data.total;
    const preferred = versions.value.find(
      version => version.id === latestDetail.value?.currentVersionId
    );
    const retained = versions.value.find(version => version.id === selectedVersionId.value);
    const next = retained ?? preferred ?? versions.value[0];
    if (next) await selectVersion(next.id);
    else {
      selectedVersionId.value = '';
      selectedVersion.value = null;
    }
  } catch {
    if (request === latestListRequest) {
      versions.value = [];
      selectedVersionId.value = '';
      selectedVersion.value = null;
      listFailed.value = true;
    }
  } finally {
    if (request === latestListRequest) listLoading.value = false;
  }
};

const loadVersionDetail = async () => {
  if (!props.promptId || !selectedVersionId.value) return;
  const request = ++latestVersionRequest;
  selectedVersion.value = null;
  versionFailed.value = false;
  versionLoading.value = true;
  try {
    const response = await getPromptVersionDetail(props.promptId, selectedVersionId.value);
    if (request === latestVersionRequest) selectedVersion.value = response.data.data;
  } catch {
    if (request === latestVersionRequest) versionFailed.value = true;
  } finally {
    if (request === latestVersionRequest) versionLoading.value = false;
  }
};

const selectVersion = async (versionId: string) => {
  if (selectedVersionId.value === versionId && selectedVersion.value) return;
  selectedVersionId.value = versionId;
  await loadVersionDetail();
};

const loadContext = async () => {
  if (!props.promptId) return;
  await loadLatestDetail();
  await loadVersions();
};

const changePage = (currentPage: number) => {
  page.value.currentPage = currentPage;
  selectedVersionId.value = '';
  selectedVersion.value = null;
  void loadVersions();
};

const requestRollback = () => {
  if (canRollbackSelected.value && selectedVersion.value) {
    emit('rollbackRequest', selectedVersion.value);
  }
};

watch(
  () => props.modelValue,
  value => {
    if (value) {
      page.value.currentPage = 1;
      void loadContext();
    }
  }
);

watch(
  () => props.refreshKey,
  () => {
    if (props.modelValue) {
      page.value.currentPage = 1;
      selectedVersionId.value = '';
      void loadContext();
    }
  }
);

const resetState = () => {
  latestListRequest += 1;
  latestVersionRequest += 1;
  latestDetailRequest += 1;
  versions.value = [];
  selectedVersionId.value = '';
  selectedVersion.value = null;
  latestDetail.value = null;
  loadedDetailPromptId = '';
  page.value = { currentPage: 1, pageSize: 10, total: 0 };
  listLoading.value = false;
  listFailed.value = false;
  versionLoading.value = false;
  versionFailed.value = false;
  detailFailed.value = false;
  activeDetailTab.value = 'content';
};
</script>

<style lang="scss">
.prompt-version-drawer.el-drawer {
  max-width: 100vw;
  background: var(--saber-surface-elevated);
}

.prompt-version-drawer .el-drawer__header {
  min-height: 60px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--saber-border);
  margin-bottom: 0;
}

.prompt-version-drawer .el-drawer__title {
  color: var(--saber-text-primary);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0;
}

.prompt-version-drawer .el-drawer__body {
  display: flex;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.prompt-version-drawer__body {
  display: flex;
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 0;
  padding: 24px;
  box-sizing: border-box;
  flex-direction: column;
  overflow: hidden;
}

.prompt-version-layout {
  display: grid;
  flex: 1;
  min-width: 0;
  min-height: 0;
  grid-template-columns: 270px minmax(0, 1fr);
  gap: 16px;
}

.prompt-version-drawer__body > .el-alert + .prompt-version-layout {
  margin-top: 16px;
}

.prompt-version-list {
  display: flex;
  min-width: 0;
  min-height: 0;
  padding-right: 16px;
  border-right: 1px solid var(--saber-border);
  box-sizing: border-box;
  flex-direction: column;
}

.prompt-version-detail {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
}

.prompt-version-heading {
  display: flex;
  min-height: 40px;
  margin-bottom: 12px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.prompt-version-heading h3,
.prompt-version-heading p,
.prompt-version-content h4,
.prompt-version-summary p {
  margin: 0;
  letter-spacing: 0;
}

.prompt-version-heading h3,
.prompt-version-content h4 {
  color: var(--saber-text-primary);
  font-size: 15px;
  line-height: 24px;
}

.prompt-version-heading p {
  color: var(--saber-text-secondary);
  font-size: 13px;
  line-height: 20px;
}

.prompt-version-list__content,
.prompt-version-detail__content {
  min-height: 220px;
}

.prompt-version-list__content {
  display: grid;
  flex: 1;
  min-height: 0;
  align-content: start;
  gap: 6px;
  overflow-y: auto;
}

.prompt-version-detail__content {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.prompt-version-item {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--saber-border);
  border-radius: 6px;
  color: var(--saber-text-primary);
  background: var(--saber-surface);
  box-sizing: border-box;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.prompt-version-item:hover,
.prompt-version-item--active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.prompt-version-item:focus-visible {
  outline: 2px solid var(--el-color-primary-light-5);
  outline-offset: 2px;
}

html.dark .prompt-version-item:hover,
html.dark .prompt-version-item--active {
  background: var(--saber-surface-muted);
}

.prompt-version-item__topline {
  display: flex;
  min-height: 24px;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.prompt-version-item__topline > strong,
.prompt-version-item__topline > .el-tag,
.prompt-version-summary__title > strong,
.prompt-version-summary__title > .el-tag {
  flex: 0 0 auto;
}

.prompt-version-item__note {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: var(--saber-text-secondary);
  font-size: 12px;
  line-height: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-version-item__meta {
  display: flex;
  min-width: 0;
  margin-top: 2px;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  color: var(--saber-text-tertiary);
  font-size: 11px;
  line-height: 16px;
}

.prompt-version-item__meta span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-version-item__meta time {
  flex: 0 0 auto;
  white-space: nowrap;
}

.prompt-version-pagination {
  margin-top: 16px;
  justify-content: center;
}

.prompt-version-summary {
  display: flex;
  min-width: 0;
  padding: 14px 16px;
  border-left: 3px solid var(--el-color-primary);
  border-radius: 4px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  background: var(--saber-surface-muted);
}

.prompt-version-summary__main {
  min-width: 0;
}

.prompt-version-summary__title,
.prompt-version-summary__identity,
.prompt-version-summary__meta,
.prompt-version-content__heading {
  display: flex;
  align-items: center;
}

.prompt-version-summary__title {
  min-height: 26px;
  flex-wrap: wrap;
  gap: 6px;
}

.prompt-version-summary__title strong {
  font-size: 18px;
  line-height: 26px;
}

.prompt-version-summary__identity {
  min-width: 0;
  margin-top: 4px;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--saber-text-primary);
  font-size: 14px;
  line-height: 22px;
}

.prompt-version-summary__identity code {
  color: var(--saber-text-secondary);
}

.prompt-version-summary p {
  margin-top: 4px;
  color: var(--saber-text-secondary);
  font-size: 13px;
  line-height: 20px;
}

.prompt-version-summary__meta {
  flex: 0 0 auto;
  align-items: flex-end;
  flex-direction: column;
  color: var(--saber-text-tertiary);
  font-size: 12px;
  line-height: 20px;
  white-space: nowrap;
}

.prompt-version-tabs {
  display: flex;
  flex: 1;
  min-height: 0;
  margin-top: 16px;
  flex-direction: column;
}

.prompt-version-tabs .el-tabs__header {
  flex: 0 0 auto;
}

.prompt-version-tabs .el-tabs__content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.prompt-version-tabs .el-tab-pane {
  min-height: 100%;
}

.prompt-version-content-list {
  display: grid;
  min-height: 100%;
  grid-template-rows: repeat(2, minmax(160px, 1fr));
  gap: 20px;
}

.prompt-version-content + .prompt-version-content {
  padding-top: 20px;
  border-top: 1px solid var(--saber-border);
}

.prompt-version-content {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.prompt-version-content__heading {
  min-height: 32px;
  margin-bottom: 8px;
  justify-content: space-between;
  gap: 12px;
}

.prompt-version-content__scrollbar {
  flex: 1;
  min-height: 72px;
  border-radius: 4px;
  background: var(--saber-surface-muted);
}

.prompt-version-content pre {
  min-height: 72px;
  padding: 12px 14px;
  margin: 0;
  color: var(--saber-text-primary);
  font-family: inherit;
  line-height: 1.7;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.prompt-version-variable-forms {
  display: grid;
  gap: 20px;
}

.prompt-version-variable-form + .prompt-version-variable-form {
  padding-top: 20px;
  border-top: 1px solid var(--saber-border);
}

.prompt-version-variable-form__heading {
  display: flex;
  min-height: 32px;
  margin-bottom: 12px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.prompt-version-variable-form__heading strong {
  color: var(--saber-text-primary);
  font-size: 14px;
  line-height: 22px;
}

.prompt-version-variable-form__heading > div {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.prompt-version-readonly-form {
  min-width: 0;
}

.prompt-version-readonly-form .el-form-item {
  margin-bottom: 14px;
}

.prompt-version-readonly-form .el-form-item__label {
  padding: 0;
  margin-bottom: 4px;
  color: var(--saber-text-secondary);
  font-size: 12px;
  line-height: 20px;
}

.prompt-version-readonly-form .el-input__inner,
.prompt-version-readonly-form .el-textarea__inner {
  color: var(--saber-text-primary);
}

.prompt-version-readonly-form .el-input__wrapper,
.prompt-version-readonly-form .el-textarea__inner {
  background: var(--saber-surface-muted);
}

.prompt-version-readonly-form .el-input__suffix .el-button {
  width: 28px;
  height: 28px;
}

@media (max-width: 1024px) {
  .prompt-version-drawer__body {
    padding: 20px;
  }

  .prompt-version-layout {
    grid-template-columns: 248px minmax(0, 1fr);
  }
}

@media (max-width: 767px) {
  .prompt-version-drawer__body,
  .prompt-version-drawer .el-drawer__header {
    padding-right: 16px;
    padding-left: 16px;
  }

  .prompt-version-heading {
    flex-wrap: wrap;
  }

  .prompt-version-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(180px, 32vh) minmax(0, 1fr);
  }

  .prompt-version-list {
    padding-right: 0;
    padding-bottom: 16px;
    border-right: 0;
    border-bottom: 1px solid var(--saber-border);
  }

  .prompt-version-summary {
    flex-direction: column;
  }

  .prompt-version-summary__meta {
    align-items: flex-start;
  }
}
</style>
