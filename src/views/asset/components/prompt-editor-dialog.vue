<template>
  <el-dialog
    v-model="visible"
    class="prompt-editor-dialog"
    append-to-body
    align-center
    width="min(1120px, calc(100vw - 32px))"
    destroy-on-close
    :close-on-click-modal="!saving"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    :before-close="handleBeforeClose"
    :title="dialogTitle"
    @closed="resetDialog"
  >
    <div v-loading="loading" class="prompt-editor-dialog__body">
      <el-result
        v-if="loadFailed"
        icon="error"
        title="提示词详情加载失败"
        sub-title="旧详情已清空，请重新加载后继续"
      >
        <template #extra>
          <el-button type="primary" :disabled="!localPromptId" @click="loadDetail">
            重新加载
          </el-button>
        </template>
      </el-result>

      <el-form
        v-else
        ref="formRef"
        :model="form"
        :rules="formRules"
        :disabled="readonly"
        label-width="92px"
        status-icon
      >
        <section class="prompt-editor-section">
          <div class="prompt-editor-section__heading">
            <h3>基本信息</h3>
          </div>
          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item label="名称" prop="promptName">
                <el-input
                  v-model="form.promptName"
                  maxlength="100"
                  placeholder="请输入提示词名称"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="编码" prop="promptCode">
                <el-input
                  v-model="form.promptCode"
                  :disabled="readonly || internalMode !== 'add'"
                  maxlength="64"
                  placeholder="请输入稳定编码"
                  @blur="normalizeCode"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-descriptions v-if="internalMode !== 'add'" :column="4" border>
            <el-descriptions-item label="状态">
              <el-tag :type="statusType">{{ statusLabel }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="当前版本">
              {{ currentVersionNo ? `V${currentVersionNo}` : '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="草稿修订">{{ draftRevision || '-' }}</el-descriptions-item>
            <el-descriptions-item label="草稿变更">
              {{ draftDirty ? '有待发布变更' : '无待发布变更' }}
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="prompt-editor-section">
          <div class="prompt-editor-section__heading">
            <h3>提示词内容</h3>
            <p>
              固定指令和用户模板至少填写一项，模板变量使用 <code v-pre>{{ variableName }}</code
              >。
            </p>
          </div>
          <el-form-item label="固定指令" prop="fixedInstruction">
            <el-input
              v-model="form.fixedInstruction"
              type="textarea"
              :rows="8"
              maxlength="32768"
              show-word-limit
              placeholder="请输入固定指令"
            />
          </el-form-item>
          <el-form-item label="用户模板" prop="userTemplate">
            <el-input
              v-model="form.userTemplate"
              type="textarea"
              :rows="8"
              maxlength="32768"
              show-word-limit
              placeholder="请输入用户输入模板"
            />
          </el-form-item>
        </section>

        <section class="prompt-editor-section">
          <el-form-item class="prompt-editor-variables-item">
            <prompt-variable-editor
              v-model="form.variables"
              :disabled="readonly"
              :issues="warnings"
            />
          </el-form-item>
        </section>

        <section v-if="warnings.length" class="prompt-editor-section">
          <div class="prompt-editor-section__heading">
            <h3>服务端警告</h3>
          </div>
          <div class="prompt-editor-warnings">
            <el-alert
              v-for="(warning, index) in warnings"
              :key="index"
              :title="formatIssue(warning)"
              type="warning"
              :closable="false"
              show-icon
            />
          </div>
        </section>

        <el-alert
          v-if="conflictSummary"
          class="prompt-editor-conflict"
          title="检测到并发修改，本地输入已保留"
          type="error"
          :closable="false"
          show-icon
        >
          <template #default>
            最新草稿修订为 {{ conflictSummary.draftRevision }}，并发版本为
            {{ conflictSummary.lockVersion }}。请核对后关闭并重新加载，当前内容不会自动覆盖服务器。
          </template>
        </el-alert>
      </el-form>
    </div>

    <template #footer>
      <div class="prompt-editor-dialog__footer">
        <el-button :disabled="saving" @click="closeDialog">
          {{ readonly ? '关闭' : '取消' }}
        </el-button>
        <el-button
          v-if="canPreview && !loadFailed"
          :icon="View"
          :disabled="loading || saving"
          @click="previewVisible = true"
        >
          预览
        </el-button>
        <el-button
          v-if="!readonly && canSaveCurrentMode && !loadFailed"
          type="primary"
          :icon="DocumentChecked"
          :loading="saving"
          :disabled="loading || saving"
          @click="saveDraft"
        >
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>

  <prompt-preview-drawer v-model="previewVisible" :snapshot="previewSnapshot" />
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { DocumentChecked, View } from '@element-plus/icons-vue';
import { ElForm, ElMessage, type FormRules } from 'element-plus';
import PromptVariableEditor from './prompt-variable-editor.vue';
import PromptPreviewDrawer from './prompt-preview-drawer.vue';
import { BladeBusinessError } from '@/axios';
import {
  createPrompt,
  getPromptDetail,
  updatePrompt,
  type PromptDetail,
  type PromptDraftPayload,
  type PromptMutation,
  type PromptValidationIssue,
} from '@/api/ai/prompt';
import type { CrudMode } from '@/types/crud';
import { normalizePromptVariable } from '../promptVariable';

interface PromptEditorDialogProps {
  modelValue: boolean;
  mode: CrudMode;
  promptId?: string;
  canPreview?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
}

const props = withDefaults(defineProps<PromptEditorDialogProps>(), {
  promptId: undefined,
  canPreview: false,
  canCreate: false,
  canEdit: false,
});

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  saved: [mutation: PromptMutation];
}>();

const createInitialForm = (): PromptDraftPayload => ({
  promptName: '',
  promptCode: '',
  fixedInstruction: '',
  userTemplate: '',
  variables: [],
});

const form = ref<PromptDraftPayload>(createInitialForm());
const internalMode = ref<CrudMode>('add');
const localPromptId = ref('');
const lockVersion = ref('');
const draftRevision = ref('');
const draftDirty = ref(false);
const status = ref(0);
const statusName = ref('');
const currentVersionNo = ref<number>();
const warnings = ref<PromptValidationIssue[]>([]);
const conflictSummary = ref<PromptDetail | null>(null);
const loading = ref(false);
const loadFailed = ref(false);
const saving = ref(false);
const previewVisible = ref(false);
const formRef = ref<InstanceType<typeof ElForm>>();
let latestDetailRequest = 0;
let latestConflictRequest = 0;

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});
const readonly = computed(() => internalMode.value === 'view');
const canSaveCurrentMode = computed(() =>
  internalMode.value === 'add' ? props.canCreate : props.canEdit
);
const dialogTitle = computed(() => {
  const prefix: { [key in CrudMode]: string } = { add: '新增', edit: '编辑', view: '查看' };
  return `${prefix[internalMode.value]}提示词`;
});
const previewSnapshot = computed<PromptDraftPayload | null>(() =>
  loadFailed.value
    ? null
    : {
        ...form.value,
        variables: form.value.variables.map(variable => ({ ...variable })),
      }
);
const statusType = computed(() => {
  if (status.value === 1) return 'success';
  if (status.value === 2) return 'danger';
  return 'info';
});
const statusLabel = computed(() => {
  if (statusName.value) return statusName.value;
  if (status.value === 0) return '草稿';
  if (status.value === 1) return '已发布';
  if (status.value === 2) return '已停用';
  return `未知状态 (${status.value})`;
});

const validateContent = (_rule: object, _value: string, callback: (error?: Error) => void) => {
  if (!form.value.fixedInstruction?.trim() && !form.value.userTemplate?.trim()) {
    callback(new Error('固定指令和用户模板不能同时为空'));
  } else callback();
};

const formRules = computed<FormRules>(() => {
  const rules: FormRules = {
    promptName: [
      { required: true, message: '请输入提示词名称', trigger: 'blur' },
      { max: 100, message: '提示词名称不能超过 100 个字符', trigger: 'blur' },
    ],
    promptCode: [
      { required: true, message: '请输入提示词编码', trigger: 'blur' },
      { max: 64, message: '提示词编码不能超过 64 个字符', trigger: 'blur' },
    ],
    fixedInstruction: [{ validator: validateContent, trigger: 'blur' }],
    userTemplate: [{ validator: validateContent, trigger: 'blur' }],
  };
  form.value.variables.forEach((variable, index) => {
    rules[`variables.${index}.name`] = [
      { required: true, message: '请输入变量名', trigger: 'blur' },
      {
        validator: (_rule: object, value: string, callback: (error?: Error) => void) => {
          if (!value) {
            callback();
            return;
          }
          if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(value)) {
            callback(new Error(`变量“${value}”名称不符合规则`));
            return;
          }
          const duplicated = form.value.variables.some(
            (item, itemIndex) => itemIndex !== index && item.name === value
          );
          if (duplicated) callback(new Error(`变量“${value}”重复定义`));
          else callback();
        },
        trigger: 'blur',
      },
    ];
    rules[`variables.${index}.displayName`] = [
      { required: true, message: '请输入显示名称', trigger: 'blur' },
    ];
    if (variable.type === 'TEXT' || variable.type === 'MULTILINE_TEXT') {
      rules[`variables.${index}.maxLength`] = [
        {
          validator: (_rule: object, value: number, callback: (error?: Error) => void) => {
            if (value === undefined) {
              callback();
              return;
            }
            if (value <= 0) callback(new Error('最大长度必须大于 0'));
            else callback();
          },
          trigger: 'change',
        },
      ];
    }
  });
  return rules;
});

const normalizeCode = () => {
  form.value.promptCode = form.value.promptCode.trim().toLowerCase();
};

const applyDetailMetadata = (detail: PromptDetail) => {
  localPromptId.value = detail.id;
  lockVersion.value = detail.lockVersion;
  draftRevision.value = detail.draftRevision;
  draftDirty.value = detail.draftDirty;
  status.value = detail.status;
  statusName.value = detail.statusName ?? '';
  currentVersionNo.value = detail.currentVersionNo;
  warnings.value = detail.warnings ?? [];
};

const applyDetail = (detail: PromptDetail) => {
  form.value = {
    promptName: detail.promptName,
    promptCode: detail.promptCode,
    fixedInstruction: detail.fixedInstruction ?? '',
    userTemplate: detail.userTemplate ?? '',
    variables: (detail.variables ?? []).map(normalizePromptVariable),
  };
  applyDetailMetadata(detail);
};

const loadDetail = async () => {
  if (!localPromptId.value) return;
  const request = ++latestDetailRequest;
  loading.value = true;
  loadFailed.value = false;
  try {
    const response = await getPromptDetail(localPromptId.value);
    if (request !== latestDetailRequest) return;
    applyDetail(response.data.data);
    await nextTick(() => formRef.value?.clearValidate());
  } catch {
    if (request === latestDetailRequest) {
      form.value = createInitialForm();
      warnings.value = [];
      loadFailed.value = true;
    }
  } finally {
    if (request === latestDetailRequest) loading.value = false;
  }
};

const prepareDialog = () => {
  resetDialog();
  internalMode.value = props.mode;
  localPromptId.value = props.promptId ?? '';
  if (props.mode !== 'add') void loadDetail();
  else void nextTick(() => formRef.value?.clearValidate());
};

watch(
  () => props.modelValue,
  value => {
    if (value) prepareDialog();
  }
);

const buildDraftPayload = (): PromptDraftPayload => ({
  promptName: form.value.promptName.trim(),
  promptCode: form.value.promptCode.trim().toLowerCase(),
  fixedInstruction: form.value.fixedInstruction,
  userTemplate: form.value.userTemplate,
  variables: form.value.variables.map(variable =>
    normalizePromptVariable({
      ...variable,
      name: variable.name.trim(),
      displayName: variable.displayName.trim(),
      description: variable.description?.trim() || undefined,
    })
  ),
});

const loadConflictSummary = async () => {
  if (!localPromptId.value) return;
  const request = ++latestConflictRequest;
  const promptId = localPromptId.value;
  try {
    const response = await getPromptDetail(promptId);
    if (request === latestConflictRequest && visible.value && localPromptId.value === promptId) {
      conflictSummary.value = response.data.data;
    }
  } catch {
    if (request === latestConflictRequest) conflictSummary.value = null;
  }
};

const saveDraft = async () => {
  if (!formRef.value || saving.value) return;
  form.value.promptName = form.value.promptName.trim();
  normalizeCode();
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  conflictSummary.value = null;
  try {
    const payload = buildDraftPayload();
    const response =
      internalMode.value === 'add'
        ? await createPrompt(payload)
        : await updatePrompt({
            ...payload,
            id: localPromptId.value,
            lockVersion: lockVersion.value,
          });
    const mutation = response.data.data;
    localPromptId.value = mutation.id;
    lockVersion.value = mutation.lockVersion;
    draftRevision.value = mutation.draftRevision;
    status.value = mutation.status;
    warnings.value = mutation.warnings ?? [];
    internalMode.value = 'edit';
    draftDirty.value = true;
    ElMessage.success('保存成功');
    emit('saved', mutation);
    visible.value = false;
  } catch (error) {
    if (error instanceof BladeBusinessError && error.code === 48004) {
      void loadConflictSummary();
    }
  } finally {
    saving.value = false;
  }
};

const formatIssue = (issue: PromptValidationIssue) => {
  const target = issue.variableName || issue.field;
  return target ? `${target}：${issue.message}` : issue.message;
};

const closeDialog = () => {
  if (!saving.value) visible.value = false;
};

const handleBeforeClose = (done: () => void) => {
  if (!saving.value) done();
};

function resetDialog() {
  latestDetailRequest += 1;
  latestConflictRequest += 1;
  form.value = createInitialForm();
  internalMode.value = 'add';
  localPromptId.value = '';
  lockVersion.value = '';
  draftRevision.value = '';
  draftDirty.value = false;
  status.value = 0;
  statusName.value = '';
  currentVersionNo.value = undefined;
  warnings.value = [];
  conflictSummary.value = null;
  loading.value = false;
  loadFailed.value = false;
  saving.value = false;
  previewVisible.value = false;
  formRef.value?.clearValidate();
}
</script>

<style lang="scss">
.prompt-editor-dialog {
  display: flex;
  max-height: calc(100vh - 32px);
  max-width: calc(100vw - 32px);
  flex-direction: column;
  overflow: hidden;
  border-radius: 6px;
  background: var(--saber-surface-elevated);
}

.prompt-editor-dialog .el-dialog__header {
  flex: 0 0 auto;
  padding: 18px 24px;
  border-bottom: 1px solid var(--saber-border);
  margin-right: 0;
}

.prompt-editor-dialog .el-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0;
  overflow: auto;
}

.prompt-editor-dialog .el-dialog__footer {
  flex: 0 0 auto;
  padding: 14px 24px;
  border-top: 1px solid var(--saber-border);
}

.prompt-editor-dialog__body {
  min-height: 260px;
  padding: 24px;
}

.prompt-editor-dialog__footer {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.prompt-editor-dialog__footer .el-button + .el-button {
  margin-left: 0;
}

.prompt-editor-section + .prompt-editor-section {
  padding-top: 24px;
  border-top: 1px solid var(--saber-border);
  margin-top: 24px;
}

.prompt-editor-section__heading {
  margin-bottom: 16px;
}

.prompt-editor-section__heading h3,
.prompt-editor-section__heading p {
  margin: 0;
  letter-spacing: 0;
}

.prompt-editor-section__heading h3 {
  color: var(--saber-text-primary);
  font-size: 15px;
  line-height: 24px;
}

.prompt-editor-section__heading p {
  color: var(--saber-text-secondary);
  font-size: 13px;
  line-height: 20px;
}

.prompt-editor-variables-item {
  margin-bottom: 0;
}

.prompt-editor-variables-item > .el-form-item__content {
  display: block;
  margin-left: 0 !important;
}

.prompt-editor-warnings {
  display: grid;
  gap: 8px;
}

.prompt-editor-conflict {
  margin-top: 20px;
}

@media (max-width: 767px) {
  .prompt-editor-dialog .el-dialog__header,
  .prompt-editor-dialog__body,
  .prompt-editor-dialog .el-dialog__footer {
    padding-right: 16px;
    padding-left: 16px;
  }

  .prompt-editor-dialog__footer {
    align-items: stretch;
    flex-direction: column-reverse;
  }

  .prompt-editor-dialog__footer .el-button {
    width: 100%;
  }
}
</style>
