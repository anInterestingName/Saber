import request from '@/axios';
import type { BladeResponse } from '@/types/option';
import type { PageResult } from '@/types/list';

export type PromptValue = string | number | boolean | null;
export type PromptVariableType = 'TEXT' | 'MULTILINE_TEXT' | 'NUMBER' | 'BOOLEAN';

export interface PromptValueMap {
  [name: string]: PromptValue;
}

export interface PromptVariable {
  name: string;
  displayName: string;
  type: PromptVariableType;
  required: boolean;
  defaultValue: PromptValue;
  exampleValue: PromptValue;
  maxLength?: number;
  description?: string;
}

export interface PromptActionState {
  editable: boolean;
  removable: boolean;
  publishable: boolean;
  disableable: boolean;
  rollbackable: boolean;
}

export interface PromptValidationIssue {
  field?: string;
  variableName?: string;
  message: string;
}

export interface PromptListItem {
  id: string;
  promptCode: string;
  promptName: string;
  status: number;
  statusName?: string;
  currentVersionNo?: number;
  draftDirty: boolean;
  lockVersion: string;
  createUser?: string;
  updateUser?: string;
  createTime?: string;
  updateTime?: string;
  actions: PromptActionState;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  versionNo: number;
  promptCode: string;
  promptName: string;
  fixedInstruction?: string;
  userTemplate?: string;
  variables: PromptVariable[];
  sourceType: number;
  sourceVersionId?: string;
  sourceDraftRevision: string;
  contentHash?: string;
  changeNote?: string;
  publishUser?: string;
  publishTime?: string;
}

export interface PromptDetail {
  id: string;
  promptCode: string;
  promptName: string;
  fixedInstruction?: string;
  userTemplate?: string;
  variables: PromptVariable[];
  draftRevision: string;
  draftDirty: boolean;
  status: number;
  statusName?: string;
  currentVersionId?: string;
  currentVersionNo?: number;
  lockVersion: string;
  createTime?: string;
  updateTime?: string;
  currentVersion?: PromptVersion;
  actions: PromptActionState;
  warnings: PromptValidationIssue[];
}

export interface PromptMutation {
  id: string;
  status: number;
  lockVersion: string;
  draftRevision: string;
  versionId?: string;
  versionNo?: number;
  warnings: PromptValidationIssue[];
}

export interface PromptMessage {
  role: string;
  content: string;
}

export interface PromptRenderResult {
  valid: boolean;
  promptCode?: string;
  versionId?: string;
  versionNo?: number;
  fixedInstruction?: string;
  userMessage?: string;
  messages: PromptMessage[];
  referencedVariables: string[];
  unresolvedVariables: string[];
  errors: PromptValidationIssue[];
  warnings: PromptValidationIssue[];
}

export interface PromptQuery {
  name?: string;
  code?: string;
  status?: number;
}

export interface PromptDraftPayload {
  promptName: string;
  promptCode: string;
  fixedInstruction?: string;
  userTemplate?: string;
  variables: PromptVariable[];
}

export type PromptCreatePayload = PromptDraftPayload;

export interface PromptUpdatePayload extends PromptDraftPayload {
  id: string;
  lockVersion: string;
}

export interface PromptCopyPayload {
  sourcePromptId: string;
  promptName: string;
  promptCode: string;
}

export interface PromptDeletePayload {
  id: string;
  lockVersion: string;
}

export interface PromptPreviewPayload {
  fixedInstruction?: string;
  userTemplate?: string;
  variables: PromptVariable[];
  testVariables: PromptValueMap;
}

export interface PromptPublishPayload {
  id: string;
  lockVersion: string;
  changeNote: string;
}

export interface PromptDisablePayload {
  id: string;
  lockVersion: string;
  disableNote: string;
}

export interface PromptRollbackPayload extends PromptPublishPayload {
  targetVersionId: string;
}

export const getPromptList = (current: number, size: number, params: PromptQuery) =>
  request<BladeResponse<PageResult<PromptListItem>>>({
    url: '/blade-ai/prompt/list',
    method: 'get',
    params: { ...params, current, size },
  });

export const getPromptDetail = (id: string) =>
  request<BladeResponse<PromptDetail>>({
    url: '/blade-ai/prompt/detail',
    method: 'get',
    params: { id },
  });

export const createPrompt = (data: PromptCreatePayload) =>
  request<BladeResponse<PromptMutation>>({
    url: '/blade-ai/prompt/create',
    method: 'post',
    data,
  });

export const updatePrompt = (data: PromptUpdatePayload) =>
  request<BladeResponse<PromptMutation>>({
    url: '/blade-ai/prompt/update',
    method: 'post',
    data,
  });

export const copyPrompt = (data: PromptCopyPayload) =>
  request<BladeResponse<PromptMutation>>({
    url: '/blade-ai/prompt/copy',
    method: 'post',
    data,
  });

export const removePrompt = (data: PromptDeletePayload) =>
  request<BladeResponse<boolean>>({
    url: '/blade-ai/prompt/remove',
    method: 'post',
    data,
  });

export const previewPrompt = (data: PromptPreviewPayload) =>
  request<BladeResponse<PromptRenderResult>>({
    url: '/blade-ai/prompt/preview',
    method: 'post',
    data,
  });

export const publishPrompt = (data: PromptPublishPayload) =>
  request<BladeResponse<PromptMutation>>({
    url: '/blade-ai/prompt/publish',
    method: 'post',
    data,
  });

export const disablePrompt = (data: PromptDisablePayload) =>
  request<BladeResponse<PromptMutation>>({
    url: '/blade-ai/prompt/disable',
    method: 'post',
    data,
  });

export const getPromptVersionList = (promptId: string, current: number, size: number) =>
  request<BladeResponse<PageResult<PromptVersion>>>({
    url: '/blade-ai/prompt/version/list',
    method: 'get',
    params: { promptId, current, size },
  });

export const getPromptVersionDetail = (promptId: string, versionId: string) =>
  request<BladeResponse<PromptVersion>>({
    url: '/blade-ai/prompt/version/detail',
    method: 'get',
    params: { promptId, versionId },
  });

export const rollbackPrompt = (data: PromptRollbackPayload) =>
  request<BladeResponse<PromptMutation>>({
    url: '/blade-ai/prompt/rollback',
    method: 'post',
    data,
  });
