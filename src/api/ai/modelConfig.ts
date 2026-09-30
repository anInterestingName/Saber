import request from '@/axios';
import type { BladeResponse } from '@/types/option';
import type { PageResult } from '@/types/list';

export type ConfigStatus = 0 | 1;

export interface ProviderListItem {
  id: string;
  providerCode: string;
  providerName: string;
  presetDictId: string | null;
  baseUrl: string;
  tenantId: string;
  ownerUserId: string;
  status: ConfigStatus;
  credentialConfigured: boolean;
  lockVersion: string;
  updateTime: string | null;
}

export interface ProviderDetail extends ProviderListItem {
  createUser: string | null;
  createTime: string | null;
  updateUser: string | null;
}

export interface ModelListItem {
  id: string;
  providerId: string;
  modelCode: string;
  modelName: string;
  upstreamModelId: string;
  apiProtocol: string;
  capabilityType: string;
  tenantId: string;
  ownerUserId: string;
  status: ConfigStatus;
  lockVersion: string;
  updateTime: string | null;
}

export interface ReasoningEffortMap {
  [key: string]: string;
}

export interface ModelDetail extends ModelListItem {
  contextWindow: number | null;
  inputTypes: string[];
  reasoningEfforts: ReasoningEffortMap | null;
  createUser: string | null;
  createTime: string | null;
  updateUser: string | null;
}

export interface ProviderPreset {
  id: string;
  value: string;
}

export interface ConfigOption {
  value: string;
}

export interface AiConfigOptions {
  providerPresets: ProviderPreset[];
  apiProtocols: ConfigOption[];
  capabilityTypes: ConfigOption[];
}

export interface ConfigMutation {
  id: string;
  lockVersion: string;
}

export interface ProviderQuery {
  tenantId?: string;
  ownerUserId?: string;
  code?: string;
  name?: string;
  status?: ConfigStatus;
}

export interface ModelQuery {
  providerId?: string;
  tenantId?: string;
  ownerUserId?: string;
  code?: string;
  status?: ConfigStatus;
}

export interface ProviderCreatePayload {
  providerCode: string;
  providerName: string;
  baseUrl: string;
  presetDictId?: string | null;
  apiKeyValue?: string;
  ownerUserId?: string;
  tenantId?: string;
  status: 0;
}

export interface ProviderUpdatePayload {
  id: string;
  lockVersion: string;
  providerName: string;
  baseUrl: string;
  presetDictId: string | null;
  apiKeyValue?: string;
  tenantId?: string;
}

export interface ModelCreatePayload {
  providerId: string;
  modelCode: string;
  modelName: string;
  upstreamModelId: string;
  apiProtocol: string;
  capabilityType: string;
  contextWindow?: number | null;
  inputTypes: string[];
  reasoningEfforts?: ReasoningEffortMap | null;
  tenantId?: string;
  status: 0;
}

export interface ModelUpdatePayload {
  id: string;
  lockVersion: string;
  modelName: string;
  upstreamModelId: string;
  apiProtocol: string;
  capabilityType: string;
  contextWindow: number | null;
  inputTypes: string[];
  reasoningEfforts: ReasoningEffortMap | null;
  tenantId?: string;
}

export interface ConfigRemovePayload {
  id: string;
  lockVersion: string;
  tenantId?: string;
}

export interface ConfigStatusPayload extends ConfigRemovePayload {
  status: ConfigStatus;
}

const newCredential = (value?: string) => {
  if (value == null || value === '') return undefined;
  if (!value.trim()) throw new Error('新凭据不能仅包含空白字符');
  return value;
};

export const getConfigOptions = () =>
  request<BladeResponse<AiConfigOptions>>({
    url: '/blade-ai/ai/config/options',
    method: 'get',
  });

export const getProviderList = (current: number, size: number, params: ProviderQuery) =>
  request<BladeResponse<PageResult<ProviderListItem>>>({
    url: '/blade-ai/ai/provider/list',
    method: 'get',
    params: {
      current,
      size,
      tenantId: params.tenantId,
      ownerUserId: params.ownerUserId,
      code: params.code,
      name: params.name,
      status: params.status,
    },
  });

export const getProviderDetail = (id: string) =>
  request<BladeResponse<ProviderDetail>>({
    url: '/blade-ai/ai/provider/detail',
    method: 'get',
    params: { id },
  });

export const addProvider = (payload: ProviderCreatePayload) =>
  request<BladeResponse<ConfigMutation>>({
    url: '/blade-ai/ai/provider/create',
    method: 'post',
    data: {
      providerCode: payload.providerCode,
      providerName: payload.providerName,
      baseUrl: payload.baseUrl,
      presetDictId: payload.presetDictId,
      apiKeyValue: newCredential(payload.apiKeyValue),
      ownerUserId: payload.ownerUserId,
      tenantId: payload.tenantId,
      status: 0,
    },
  });

export const updateProvider = (payload: ProviderUpdatePayload) =>
  request<BladeResponse<ConfigMutation>>({
    url: '/blade-ai/ai/provider/update',
    method: 'post',
    data: {
      id: payload.id,
      lockVersion: payload.lockVersion,
      providerName: payload.providerName,
      baseUrl: payload.baseUrl,
      presetDictId: payload.presetDictId,
      apiKeyValue: newCredential(payload.apiKeyValue),
      tenantId: payload.tenantId,
    },
  });

export const setProviderStatus = (payload: ConfigStatusPayload) =>
  request<BladeResponse<ConfigMutation>>({
    url: '/blade-ai/ai/provider/status',
    method: 'post',
    data: {
      id: payload.id,
      lockVersion: payload.lockVersion,
      status: payload.status,
      tenantId: payload.tenantId,
    },
  });

export const removeProvider = (payload: ConfigRemovePayload) =>
  request<BladeResponse<boolean>>({
    url: '/blade-ai/ai/provider/remove',
    method: 'post',
    data: { id: payload.id, lockVersion: payload.lockVersion, tenantId: payload.tenantId },
  });

export const getModelList = (current: number, size: number, params: ModelQuery) =>
  request<BladeResponse<PageResult<ModelListItem>>>({
    url: '/blade-ai/ai/model/list',
    method: 'get',
    params: {
      current,
      size,
      providerId: params.providerId,
      tenantId: params.tenantId,
      ownerUserId: params.ownerUserId,
      code: params.code,
      status: params.status,
    },
  });

export const getModelDetail = (id: string) =>
  request<BladeResponse<ModelDetail>>({
    url: '/blade-ai/ai/model/detail',
    method: 'get',
    params: { id },
  });

export const addModel = (payload: ModelCreatePayload) =>
  request<BladeResponse<ConfigMutation>>({
    url: '/blade-ai/ai/model/create',
    method: 'post',
    data: {
      providerId: payload.providerId,
      modelCode: payload.modelCode,
      modelName: payload.modelName,
      upstreamModelId: payload.upstreamModelId,
      apiProtocol: payload.apiProtocol,
      capabilityType: payload.capabilityType,
      contextWindow: payload.contextWindow,
      inputTypes: payload.inputTypes,
      reasoningEfforts: payload.reasoningEfforts,
      tenantId: payload.tenantId,
      status: 0,
    },
  });

export const updateModel = (payload: ModelUpdatePayload) =>
  request<BladeResponse<ConfigMutation>>({
    url: '/blade-ai/ai/model/update',
    method: 'post',
    data: {
      id: payload.id,
      lockVersion: payload.lockVersion,
      modelName: payload.modelName,
      upstreamModelId: payload.upstreamModelId,
      apiProtocol: payload.apiProtocol,
      capabilityType: payload.capabilityType,
      contextWindow: payload.contextWindow,
      inputTypes: payload.inputTypes,
      reasoningEfforts: payload.reasoningEfforts,
      tenantId: payload.tenantId,
    },
  });

export const setModelStatus = (payload: ConfigStatusPayload) =>
  request<BladeResponse<ConfigMutation>>({
    url: '/blade-ai/ai/model/status',
    method: 'post',
    data: {
      id: payload.id,
      lockVersion: payload.lockVersion,
      status: payload.status,
      tenantId: payload.tenantId,
    },
  });

export const removeModel = (payload: ConfigRemovePayload) =>
  request<BladeResponse<boolean>>({
    url: '/blade-ai/ai/model/remove',
    method: 'post',
    data: { id: payload.id, lockVersion: payload.lockVersion, tenantId: payload.tenantId },
  });
