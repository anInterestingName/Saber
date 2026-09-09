import type { PromptVariable, PromptVariableType } from '@/api/ai/prompt';

export const DEFAULT_PROMPT_TEXT_MAX_LENGTH = 255;

export const isPromptTextType = (type: PromptVariableType) =>
  type === 'TEXT' || type === 'MULTILINE_TEXT';

export const normalizePromptVariable = (variable: PromptVariable): PromptVariable => {
  const normalized = { ...variable };
  if (isPromptTextType(normalized.type)) {
    if (typeof normalized.maxLength !== 'number') {
      normalized.maxLength = DEFAULT_PROMPT_TEXT_MAX_LENGTH;
    }
  } else {
    delete normalized.maxLength;
  }
  return normalized;
};
