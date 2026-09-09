<template>
  <el-drawer
    v-model="visible"
    class="prompt-preview-drawer"
    append-to-body
    direction="rtl"
    title="提示词预览"
    size="min(760px, 100vw)"
    :close-on-click-modal="!previewing"
    :close-on-press-escape="!previewing"
    :show-close="!previewing"
    :before-close="handleBeforeClose"
    @closed="resetState"
  >
    <div class="prompt-preview-drawer__body">
      <section class="prompt-preview-section">
        <div class="prompt-preview-section__heading">
          <div>
            <h3>测试变量</h3>
            <p>只有启用“提供该值”的变量会进入本次预览请求。</p>
          </div>
          <div class="prompt-preview-section__commands">
            <el-button :disabled="previewing" @click="fillExamples">填充示例值</el-button>
            <el-button :disabled="previewing" @click="clearValues">清空测试值</el-button>
          </div>
        </div>

        <el-empty
          v-if="!snapshot?.variables.length"
          description="当前提示词没有变量"
          :image-size="64"
        />
        <div v-else class="prompt-preview-fields">
          <div
            v-for="(variable, index) in snapshot.variables"
            :key="`${variable.name}-${index}`"
            class="prompt-preview-field"
          >
            <div class="prompt-preview-field__meta">
              <div>
                <strong>{{ variable.displayName || variable.name || `变量 ${index + 1}` }}</strong>
                <span>{{ variable.name }} · {{ getTypeLabel(variable.type) }}</span>
              </div>
              <el-checkbox
                :model-value="getFieldState(variable.name).enabled"
                :disabled="previewing || !variable.name"
                @update:model-value="setEnabled(variable.name, Boolean($event))"
              >
                提供该值
              </el-checkbox>
            </div>

            <div v-if="getFieldState(variable.name).enabled" class="prompt-preview-field__input">
              <el-select
                v-if="variable.type === 'BOOLEAN'"
                :model-value="getFieldState(variable.name).value"
                :disabled="previewing"
                placeholder="请选择布尔值"
                @update:model-value="setValue(variable.name, $event)"
              >
                <el-option label="true" :value="true" />
                <el-option label="false" :value="false" />
              </el-select>
              <el-input-number
                v-else-if="variable.type === 'NUMBER'"
                :model-value="getNumberValue(getFieldState(variable.name).value)"
                :disabled="previewing"
                controls-position="right"
                @update:model-value="setValue(variable.name, $event ?? null)"
              />
              <el-input
                v-else
                :model-value="getTextValue(getFieldState(variable.name).value)"
                :disabled="previewing"
                :type="variable.type === 'MULTILINE_TEXT' ? 'textarea' : 'text'"
                :rows="4"
                :maxlength="variable.maxLength"
                show-word-limit
                placeholder="请输入测试值"
                @update:model-value="setValue(variable.name, $event)"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="prompt-preview-section">
        <div class="prompt-preview-section__heading">
          <div>
            <h3>校验结果</h3>
            <p>模板解析和变量校验由后端执行。</p>
          </div>
          <el-button
            type="primary"
            :icon="VideoPlay"
            :loading="previewing"
            :disabled="!snapshot || previewing"
            @click="runPreview"
          >
            执行预览
          </el-button>
        </div>

        <el-empty v-if="!result && !previewFailed" description="尚未执行预览" :image-size="64" />
        <el-result
          v-else-if="previewFailed"
          icon="error"
          title="预览请求失败"
          sub-title="请检查当前内容后重试"
        />
        <template v-else-if="result">
          <el-alert
            :title="result.valid ? '模板校验通过' : '模板校验未通过'"
            :type="result.valid ? 'success' : 'error'"
            :closable="false"
            show-icon
          />

          <div v-if="result.errors.length" class="prompt-preview-issues">
            <h4>错误</h4>
            <div v-for="(issue, index) in result.errors" :key="index" class="issue issue--error">
              <strong>{{ formatIssueTarget(issue) }}</strong>
              <span>{{ issue.message }}</span>
            </div>
          </div>
          <div v-if="result.warnings.length" class="prompt-preview-issues">
            <h4>警告</h4>
            <div
              v-for="(issue, index) in result.warnings"
              :key="index"
              class="issue issue--warning"
            >
              <strong>{{ formatIssueTarget(issue) }}</strong>
              <span>{{ issue.message }}</span>
            </div>
          </div>

          <el-descriptions v-if="result.referencedVariables.length" :column="1" border>
            <el-descriptions-item label="已引用变量">
              {{ result.referencedVariables.join('、') }}
            </el-descriptions-item>
            <el-descriptions-item v-if="result.unresolvedVariables.length" label="未解析变量">
              {{ result.unresolvedVariables.join('、') }}
            </el-descriptions-item>
          </el-descriptions>
        </template>
      </section>

      <section v-if="result?.valid" class="prompt-preview-section">
        <div class="prompt-preview-section__heading">
          <div>
            <h3>最终消息</h3>
            <p>按后端返回顺序展示，正文只作为纯文本处理。</p>
          </div>
        </div>
        <div v-if="result.messages.length" class="prompt-preview-messages">
          <div v-for="(message, index) in result.messages" :key="index" class="prompt-message">
            <el-tag size="small" :type="message.role === 'SYSTEM' ? 'info' : 'primary'">
              {{ message.role }}
            </el-tag>
            <pre>{{ message.content }}</pre>
          </div>
        </div>
        <el-empty v-else description="后端未返回消息" :image-size="64" />
      </section>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { VideoPlay } from '@element-plus/icons-vue';
import type {
  PromptDraftPayload,
  PromptRenderResult,
  PromptValidationIssue,
  PromptValue,
  PromptValueMap,
  PromptVariableType,
} from '@/api/ai/prompt';
import { previewPrompt } from '@/api/ai/prompt';

interface PreviewFieldState {
  enabled: boolean;
  value: PromptValue;
}

interface PromptPreviewDrawerProps {
  modelValue: boolean;
  snapshot: PromptDraftPayload | null;
}

const props = defineProps<PromptPreviewDrawerProps>();
const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
}>();

const fieldStates = ref<{ [name: string]: PreviewFieldState }>({});
const result = ref<PromptRenderResult | null>(null);
const previewing = ref(false);
const previewFailed = ref(false);
let latestRequest = 0;

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

const typeLabels: { [key in PromptVariableType]: string } = {
  TEXT: '单行文本',
  MULTILINE_TEXT: '多行文本',
  NUMBER: '数字',
  BOOLEAN: '布尔值',
};

const getTypeLabel = (type: PromptVariableType) => typeLabels[type];
const getTextValue = (value: PromptValue) => (typeof value === 'string' ? value : '');
const getNumberValue = (value: PromptValue) => (typeof value === 'number' ? value : undefined);
const getFieldState = (name: string): PreviewFieldState =>
  fieldStates.value[name] ?? { enabled: false, value: null };

const initializeFields = () => {
  const next: { [name: string]: PreviewFieldState } = {};
  props.snapshot?.variables.forEach(variable => {
    if (variable.name) next[variable.name] = { enabled: false, value: null };
  });
  fieldStates.value = next;
};

const resetState = () => {
  latestRequest += 1;
  previewing.value = false;
  previewFailed.value = false;
  result.value = null;
  fieldStates.value = {};
};

watch(
  () => props.modelValue,
  value => {
    if (value) {
      resetState();
      initializeFields();
    }
  }
);

const setEnabled = (name: string, enabled: boolean) => {
  fieldStates.value = {
    ...fieldStates.value,
    [name]: { ...getFieldState(name), enabled },
  };
};

const setValue = (name: string, value: PromptValue) => {
  fieldStates.value = {
    ...fieldStates.value,
    [name]: { ...getFieldState(name), value },
  };
};

const clearValues = () => initializeFields();

const fillExamples = () => {
  const next = { ...fieldStates.value };
  props.snapshot?.variables.forEach(variable => {
    if (variable.name && variable.exampleValue !== null) {
      next[variable.name] = { enabled: true, value: variable.exampleValue };
    }
  });
  fieldStates.value = next;
};

const buildTestVariables = () => {
  const values: PromptValueMap = {};
  Object.entries(fieldStates.value).forEach(([name, state]) => {
    if (state.enabled && state.value !== null) values[name] = state.value;
  });
  return values;
};

const runPreview = async () => {
  if (!props.snapshot || previewing.value) return;
  const request = ++latestRequest;
  result.value = null;
  previewFailed.value = false;
  previewing.value = true;
  try {
    const response = await previewPrompt({
      fixedInstruction: props.snapshot.fixedInstruction,
      userTemplate: props.snapshot.userTemplate,
      variables: props.snapshot.variables.map(variable => ({ ...variable })),
      testVariables: buildTestVariables(),
    });
    if (request === latestRequest) result.value = response.data.data;
  } catch {
    if (request === latestRequest) previewFailed.value = true;
  } finally {
    if (request === latestRequest) previewing.value = false;
  }
};

const formatIssueTarget = (issue: PromptValidationIssue) =>
  issue.variableName || issue.field || '模板';

const handleBeforeClose = (done: () => void) => {
  if (!previewing.value) done();
};
</script>

<style lang="scss">
.prompt-preview-drawer.el-drawer {
  max-width: 100vw;
  background: var(--saber-surface-elevated);
}

.prompt-preview-drawer .el-drawer__header {
  min-height: 60px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--saber-border);
  margin-bottom: 0;
}

.prompt-preview-drawer .el-drawer__body {
  padding: 0;
  overflow: auto;
}

.prompt-preview-drawer__body {
  min-width: 0;
  padding: 24px;
}

.prompt-preview-section + .prompt-preview-section {
  padding-top: 24px;
  border-top: 1px solid var(--saber-border);
  margin-top: 24px;
}

.prompt-preview-section__heading {
  display: flex;
  min-height: 40px;
  margin-bottom: 16px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.prompt-preview-section__heading h3,
.prompt-preview-section__heading p,
.prompt-preview-issues h4 {
  margin: 0;
  letter-spacing: 0;
}

.prompt-preview-section__heading h3,
.prompt-preview-issues h4 {
  color: var(--saber-text-primary);
  font-size: 15px;
  line-height: 24px;
}

.prompt-preview-section__heading p {
  color: var(--saber-text-secondary);
  font-size: 13px;
  line-height: 20px;
}

.prompt-preview-section__commands {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.prompt-preview-section__commands .el-button + .el-button {
  margin-left: 0;
}

.prompt-preview-fields,
.prompt-preview-messages {
  display: grid;
  gap: 12px;
}

.prompt-preview-field {
  padding: 14px 16px;
  border: 1px solid var(--saber-border);
  border-radius: 6px;
  background: var(--saber-surface);
}

.prompt-preview-field__meta {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.prompt-preview-field__meta strong,
.prompt-preview-field__meta span {
  display: block;
}

.prompt-preview-field__meta span {
  color: var(--saber-text-secondary);
  font-size: 12px;
  line-height: 18px;
}

.prompt-preview-field__input {
  margin-top: 12px;
}

.prompt-preview-field__input .el-input-number,
.prompt-preview-field__input .el-select {
  width: 100%;
}

.prompt-preview-issues {
  margin-top: 16px;
}

.prompt-preview-issues h4 {
  margin-bottom: 8px;
}

.issue {
  display: flex;
  padding: 8px 10px;
  border-radius: 4px;
  margin-top: 6px;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 20px;
}

.issue--error {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.issue--warning {
  color: var(--el-color-warning-dark-2);
  background: var(--el-color-warning-light-9);
}

.prompt-message {
  padding: 14px 16px;
  border: 1px solid var(--saber-border);
  border-radius: 6px;
  background: var(--saber-surface);
}

.prompt-message pre {
  margin: 12px 0 0;
  color: var(--saber-text-primary);
  font-family: inherit;
  line-height: 1.7;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

@media (max-width: 767px) {
  .prompt-preview-drawer__body,
  .prompt-preview-drawer .el-drawer__header {
    padding-right: 16px;
    padding-left: 16px;
  }

  .prompt-preview-section__heading,
  .prompt-preview-field__meta {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
