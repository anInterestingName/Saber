<template>
  <section class="prompt-variable-editor">
    <div class="prompt-variable-editor__header">
      <div>
        <h3>变量定义</h3>
        <p>按模板引用顺序维护变量，最多 {{ maxVariables }} 项。</p>
      </div>
      <el-button
        v-if="!disabled"
        type="primary"
        plain
        :icon="Plus"
        :disabled="modelValue.length >= maxVariables"
        @click="addVariable"
      >
        添加变量
      </el-button>
    </div>

    <el-empty v-if="modelValue.length === 0" description="暂无变量定义" :image-size="72" />

    <el-collapse v-else v-model="activeNames" class="prompt-variable-editor__collapse">
      <el-collapse-item
        v-for="(variable, index) in modelValue"
        :key="localKeys[index]"
        :name="localKeys[index]"
      >
        <template #title>
          <div class="prompt-variable-editor__title">
            <span class="prompt-variable-editor__index">{{ index + 1 }}</span>
            <strong>{{ variable.name || '未命名变量' }}</strong>
            <el-tag size="small" type="info">{{ getTypeLabel(variable.type) }}</el-tag>
            <el-tag v-if="variable.required" size="small" type="warning">必填</el-tag>
            <el-tag v-if="getIssues(variable.name).length" size="small" type="danger">
              {{ getIssues(variable.name).length }} 项问题
            </el-tag>
          </div>
        </template>

        <div class="prompt-variable-editor__body">
          <div v-if="getIssues(variable.name).length" class="prompt-variable-editor__issues">
            <div v-for="(issue, issueIndex) in getIssues(variable.name)" :key="issueIndex">
              {{ issue.message }}
            </div>
          </div>

          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item label="变量名" :prop="`variables.${index}.name`">
                <el-input
                  :model-value="variable.name"
                  :disabled="disabled"
                  maxlength="64"
                  placeholder="如 customer_name"
                  @update:model-value="updateField(index, 'name', $event.trim())"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="显示名称" :prop="`variables.${index}.displayName`">
                <el-input
                  :model-value="variable.displayName"
                  :disabled="disabled"
                  maxlength="100"
                  placeholder="请输入显示名称"
                  @update:model-value="updateField(index, 'displayName', $event)"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="8">
              <el-form-item label="类型" :prop="`variables.${index}.type`" required>
                <el-select
                  :model-value="variable.type"
                  :disabled="disabled"
                  @update:model-value="handleTypeChange(index, $event)"
                >
                  <el-option
                    v-for="option in typeOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="8">
              <el-form-item label="是否必填" :prop="`variables.${index}.required`">
                <el-switch
                  :model-value="variable.required"
                  :disabled="disabled"
                  @update:model-value="updateField(index, 'required', Boolean($event))"
                />
              </el-form-item>
            </el-col>
            <el-col v-if="isPromptTextType(variable.type)" :xs="24" :md="8">
              <el-form-item label="最大长度" :prop="`variables.${index}.maxLength`">
                <el-input-number
                  :model-value="variable.maxLength"
                  :disabled="disabled"
                  :min="1"
                  :max="32768"
                  controls-position="right"
                  @update:model-value="
                    updateField(index, 'maxLength', $event ?? DEFAULT_PROMPT_TEXT_MAX_LENGTH)
                  "
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="默认值" :prop="`variables.${index}.defaultValue`">
                <el-select
                  v-if="variable.type === 'BOOLEAN'"
                  :model-value="variable.defaultValue"
                  :disabled="disabled"
                  clearable
                  placeholder="未设置"
                  @update:model-value="
                    updateField(index, 'defaultValue', typeof $event === 'boolean' ? $event : null)
                  "
                >
                  <el-option label="true" :value="true" />
                  <el-option label="false" :value="false" />
                </el-select>
                <el-input-number
                  v-else-if="variable.type === 'NUMBER'"
                  :model-value="getNumberValue(variable.defaultValue)"
                  :disabled="disabled"
                  controls-position="right"
                  @update:model-value="updateField(index, 'defaultValue', $event ?? null)"
                />
                <el-input
                  v-else
                  :model-value="getTextValue(variable.defaultValue)"
                  :disabled="disabled"
                  :type="variable.type === 'MULTILINE_TEXT' ? 'textarea' : 'text'"
                  :rows="3"
                  clearable
                  placeholder="未设置"
                  @update:model-value="updateField(index, 'defaultValue', $event)"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="示例值" :prop="`variables.${index}.exampleValue`">
                <el-select
                  v-if="variable.type === 'BOOLEAN'"
                  :model-value="variable.exampleValue"
                  :disabled="disabled"
                  clearable
                  placeholder="未设置"
                  @update:model-value="
                    updateField(index, 'exampleValue', typeof $event === 'boolean' ? $event : null)
                  "
                >
                  <el-option label="true" :value="true" />
                  <el-option label="false" :value="false" />
                </el-select>
                <el-input-number
                  v-else-if="variable.type === 'NUMBER'"
                  :model-value="getNumberValue(variable.exampleValue)"
                  :disabled="disabled"
                  controls-position="right"
                  @update:model-value="updateField(index, 'exampleValue', $event ?? null)"
                />
                <el-input
                  v-else
                  :model-value="getTextValue(variable.exampleValue)"
                  :disabled="disabled"
                  :type="variable.type === 'MULTILINE_TEXT' ? 'textarea' : 'text'"
                  :rows="3"
                  clearable
                  placeholder="未设置"
                  @update:model-value="updateField(index, 'exampleValue', $event)"
                />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="输入说明" :prop="`variables.${index}.description`">
                <el-input
                  :model-value="variable.description"
                  :disabled="disabled"
                  maxlength="500"
                  show-word-limit
                  placeholder="说明变量用途、格式或取值范围"
                  @update:model-value="updateField(index, 'description', $event)"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <div v-if="!disabled" class="prompt-variable-editor__actions">
            <el-tooltip content="上移" placement="top">
              <el-button
                circle
                :icon="ArrowUp"
                :disabled="index === 0"
                aria-label="上移变量"
                @click="moveVariable(index, -1)"
              />
            </el-tooltip>
            <el-tooltip content="下移" placement="top">
              <el-button
                circle
                :icon="ArrowDown"
                :disabled="index === modelValue.length - 1"
                aria-label="下移变量"
                @click="moveVariable(index, 1)"
              />
            </el-tooltip>
            <el-button type="danger" link :icon="Delete" @click="removeVariable(index)">
              删除变量
            </el-button>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ArrowDown, ArrowUp, Delete, Plus } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';
import type {
  PromptValidationIssue,
  PromptValue,
  PromptVariable,
  PromptVariableType,
} from '@/api/ai/prompt';
import {
  DEFAULT_PROMPT_TEXT_MAX_LENGTH,
  isPromptTextType,
  normalizePromptVariable,
} from '../promptVariable';

interface PromptVariableEditorProps {
  modelValue: PromptVariable[];
  disabled?: boolean;
  issues?: PromptValidationIssue[];
}

const props = withDefaults(defineProps<PromptVariableEditorProps>(), {
  disabled: false,
  issues: () => [],
});

const emit = defineEmits<{
  'update:modelValue': [variables: PromptVariable[]];
}>();

const maxVariables = 100;
const localKeys = ref<string[]>([]);
const activeNames = ref<string[]>([]);
let keySequence = 0;

const typeOptions: Array<{ label: string; value: PromptVariableType }> = [
  { label: '单行文本', value: 'TEXT' },
  { label: '多行文本', value: 'MULTILINE_TEXT' },
  { label: '数字', value: 'NUMBER' },
  { label: '布尔值', value: 'BOOLEAN' },
];

const createKey = () => `prompt-variable-${++keySequence}`;
const getTypeLabel = (type: PromptVariableType) =>
  typeOptions.find(option => option.value === type)?.label ?? type;
const getTextValue = (value: PromptValue) => (typeof value === 'string' ? value : '');
const getNumberValue = (value: PromptValue) => (typeof value === 'number' ? value : undefined);
const getIssues = (name: string) => props.issues.filter(issue => issue.variableName === name);

watch(
  () => props.modelValue.length,
  length => {
    while (localKeys.value.length < length) localKeys.value.push(createKey());
    if (localKeys.value.length > length) localKeys.value.splice(length);
    if (length > 0 && activeNames.value.length === 0) activeNames.value = [localKeys.value[0]];
  },
  { immediate: true }
);

const replaceVariables = (variables: PromptVariable[]) => {
  emit('update:modelValue', variables);
};

const updateField = <K extends keyof PromptVariable>(
  index: number,
  field: K,
  value: PromptVariable[K]
) => {
  const variables = props.modelValue.map((variable, variableIndex) =>
    variableIndex === index ? { ...variable, [field]: value } : variable
  );
  replaceVariables(variables);
};

const addVariable = () => {
  if (props.modelValue.length >= maxVariables) return;
  const key = createKey();
  localKeys.value.push(key);
  activeNames.value = [...activeNames.value, key];
  replaceVariables([
    ...props.modelValue,
    {
      name: '',
      displayName: '',
      type: 'TEXT',
      required: false,
      defaultValue: null,
      exampleValue: null,
      maxLength: DEFAULT_PROMPT_TEXT_MAX_LENGTH,
    },
  ]);
};

const hasConfiguredValue = (variable: PromptVariable) =>
  Boolean(
    variable.name ||
      variable.displayName ||
      variable.defaultValue !== null ||
      variable.exampleValue !== null ||
      (typeof variable.maxLength === 'number' &&
        variable.maxLength !== DEFAULT_PROMPT_TEXT_MAX_LENGTH) ||
      variable.description
  );

const removeVariable = async (index: number) => {
  const variable = props.modelValue[index];
  if (hasConfiguredValue(variable)) {
    try {
      await ElMessageBox.confirm(
        `确定删除变量“${variable.name || variable.displayName || index + 1}”吗？`,
        {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
    } catch {
      return;
    }
  }
  const variables = [...props.modelValue];
  variables.splice(index, 1);
  const [removedKey] = localKeys.value.splice(index, 1);
  activeNames.value = activeNames.value.filter(name => name !== removedKey);
  replaceVariables(variables);
};

const moveVariable = (index: number, offset: -1 | 1) => {
  const target = index + offset;
  if (target < 0 || target >= props.modelValue.length) return;
  const variables = [...props.modelValue];
  [variables[index], variables[target]] = [variables[target], variables[index]];
  [localKeys.value[index], localKeys.value[target]] = [
    localKeys.value[target],
    localKeys.value[index],
  ];
  replaceVariables(variables);
};

const clearIncompatibleValues = (variable: PromptVariable, type: PromptVariableType) => {
  const next = normalizePromptVariable({ ...variable, type });
  if (isPromptTextType(type)) {
    if (typeof next.defaultValue !== 'string') next.defaultValue = null;
    if (typeof next.exampleValue !== 'string') next.exampleValue = null;
  } else {
    if (type === 'NUMBER') {
      if (typeof next.defaultValue !== 'number') next.defaultValue = null;
      if (typeof next.exampleValue !== 'number') next.exampleValue = null;
    } else {
      if (typeof next.defaultValue !== 'boolean') next.defaultValue = null;
      if (typeof next.exampleValue !== 'boolean') next.exampleValue = null;
    }
  }
  return next;
};

const handleTypeChange = async (index: number, type: PromptVariableType) => {
  const variable = props.modelValue[index];
  if (variable.type === type) return;
  const next = clearIncompatibleValues(variable, type);
  const clearsValue =
    next.defaultValue !== variable.defaultValue ||
    next.exampleValue !== variable.exampleValue ||
    (!isPromptTextType(type) && typeof variable.maxLength === 'number');

  if (clearsValue) {
    try {
      await ElMessageBox.confirm('切换类型将清空不兼容的默认值、示例值或最大长度，是否继续？', {
        confirmButtonText: '继续',
        cancelButtonText: '取消',
        type: 'warning',
      });
    } catch {
      return;
    }
  }

  const variables = [...props.modelValue];
  variables[index] = next;
  replaceVariables(variables);
};
</script>

<style scoped lang="scss">
.prompt-variable-editor {
  min-width: 0;
}

.prompt-variable-editor__header {
  display: flex;
  min-height: 40px;
  margin-bottom: 12px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h3,
  p {
    margin: 0;
    letter-spacing: 0;
  }

  h3 {
    color: var(--saber-text-primary);
    font-size: 15px;
    line-height: 24px;
  }

  p {
    color: var(--saber-text-secondary);
    font-size: 13px;
    line-height: 20px;
  }
}

.prompt-variable-editor__collapse {
  border-top: 1px solid var(--saber-border);

  :deep(.el-collapse-item__header) {
    min-height: 48px;
    height: auto;
    background: var(--saber-surface);
  }

  :deep(.el-collapse-item__wrap) {
    background: var(--saber-surface);
  }
}

.prompt-variable-editor__title {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;

  strong {
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.prompt-variable-editor__index {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--saber-border);
  border-radius: 4px;
  color: var(--saber-text-secondary);
  font-size: 12px;
}

.prompt-variable-editor__body {
  padding: 16px 0 4px;

  :deep(.el-form-item) {
    margin-bottom: 24px;
  }
}

.prompt-variable-editor__issues {
  padding: 10px 12px;
  border: 1px solid var(--el-color-danger-light-7);
  border-radius: 4px;
  margin-bottom: 16px;
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  font-size: 13px;
  line-height: 20px;
}

.prompt-variable-editor__actions {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

@media (max-width: 767px) {
  .prompt-variable-editor__header {
    align-items: stretch;
    flex-direction: column;
  }

  .prompt-variable-editor__title strong {
    max-width: 150px;
  }
}
</style>
