import type {
  AiConfigOptions,
  ConfigMutation,
  ConfigStatus,
  ModelDetail,
  ModelListItem,
  ModelQuery,
  ProviderDetail,
  ProviderListItem,
  ProviderQuery,
} from '@/api/ai/modelConfig';
import type { PageResult } from '@/types/list';
import type { BladeResponse } from '@/types/option';
import { validateNull } from '@/utils/validate';

const longMax = '9223372036854775807';

export const isConfigId = (value: string | null | undefined) =>
  typeof value === 'string' &&
  /^[1-9]\d{0,18}$/.test(value) &&
  (value.length < longMax.length || value <= longMax);

export const isLockVersion = (value: string | null | undefined) =>
  value === '0' || isConfigId(value);

const requireResponse = <T>(response: BladeResponse<T>) => {
  if (!response || response.code !== 200 || response.data == null) {
    throw new Error('配置接口响应不完整，请重新加载');
  }
  return response.data;
};

const requireResource = (item: ProviderListItem | ModelListItem) => {
  if (
    !item ||
    !isConfigId(item.id) ||
    !isLockVersion(item.lockVersion) ||
    !isConfigId(item.ownerUserId) ||
    typeof item.tenantId !== 'string' ||
    !item.tenantId.trim() ||
    (item.status !== 0 && item.status !== 1)
  ) {
    throw new Error('配置记录或归属响应不完整，请重新加载');
  }
};

export const readProviderItem = (item: ProviderListItem): ProviderListItem => {
  requireResource(item);
  if (
    typeof item.providerCode !== 'string' ||
    typeof item.providerName !== 'string' ||
    typeof item.baseUrl !== 'string' ||
    typeof item.credentialConfigured !== 'boolean' ||
    (item.presetDictId != null && !isConfigId(item.presetDictId))
  ) {
    throw new Error('供应商响应不完整，请重新加载');
  }
  return {
    id: item.id,
    providerCode: item.providerCode,
    providerName: item.providerName,
    presetDictId: item.presetDictId ?? null,
    baseUrl: item.baseUrl,
    tenantId: item.tenantId,
    ownerUserId: item.ownerUserId,
    status: item.status,
    credentialConfigured: item.credentialConfigured,
    lockVersion: item.lockVersion,
    updateTime: item.updateTime,
  };
};

export const readModelItem = (item: ModelListItem): ModelListItem => {
  requireResource(item);
  if (
    !isConfigId(item.providerId) ||
    typeof item.modelCode !== 'string' ||
    typeof item.modelName !== 'string' ||
    typeof item.upstreamModelId !== 'string' ||
    typeof item.apiProtocol !== 'string' ||
    typeof item.capabilityType !== 'string'
  ) {
    throw new Error('模型响应不完整，请重新加载');
  }
  return {
    id: item.id,
    providerId: item.providerId,
    modelCode: item.modelCode,
    modelName: item.modelName,
    upstreamModelId: item.upstreamModelId,
    apiProtocol: item.apiProtocol,
    capabilityType: item.capabilityType,
    tenantId: item.tenantId,
    ownerUserId: item.ownerUserId,
    status: item.status,
    lockVersion: item.lockVersion,
    updateTime: item.updateTime,
  };
};

export const readConfigPage = <T>(
  response: BladeResponse<PageResult<T>>,
  readItem: (item: T) => T
): PageResult<T> => {
  const result = requireResponse(response);
  if (!Array.isArray(result.records) || !Number.isSafeInteger(result.total) || result.total < 0) {
    throw new Error('配置分页响应不完整，请重新加载');
  }
  return { records: result.records.map(readItem), total: result.total };
};

export const readProviderDetail = (
  response: BladeResponse<ProviderDetail>,
  expectedId: string
): ProviderDetail => {
  const detail = requireResponse(response);
  const item = readProviderItem(detail);
  if (item.id !== expectedId) throw new Error('供应商详情与当前记录不一致');
  return {
    ...item,
    createUser: detail.createUser,
    createTime: detail.createTime,
    updateUser: detail.updateUser,
  };
};

export const readModelDetail = (
  response: BladeResponse<ModelDetail>,
  expectedId: string
): ModelDetail => {
  const detail = requireResponse(response);
  const item = readModelItem(detail);
  if (item.id !== expectedId) throw new Error('模型详情与当前记录不一致');
  if (
    !Array.isArray(detail.inputTypes) ||
    !detail.inputTypes.every(value => typeof value === 'string') ||
    (detail.contextWindow !== null &&
      (!Number.isInteger(detail.contextWindow) ||
        detail.contextWindow < 1 ||
        detail.contextWindow > 2147483647)) ||
    (detail.reasoningEfforts !== null &&
      (typeof detail.reasoningEfforts !== 'object' ||
        Array.isArray(detail.reasoningEfforts) ||
        !Object.values(detail.reasoningEfforts).every(value => typeof value === 'string')))
  ) {
    throw new Error('模型参数响应不完整，请重新加载');
  }
  return {
    ...item,
    contextWindow: detail.contextWindow,
    inputTypes: [...detail.inputTypes],
    reasoningEfforts:
      detail.reasoningEfforts === null
        ? null
        : Object.fromEntries(Object.entries(detail.reasoningEfforts)),
    createUser: detail.createUser,
    createTime: detail.createTime,
    updateUser: detail.updateUser,
  };
};

export const readConfigOptions = (response: BladeResponse<AiConfigOptions>): AiConfigOptions => {
  const options = requireResponse(response);
  if (
    !Array.isArray(options.providerPresets) ||
    !options.providerPresets.every(
      item => item && isConfigId(item.id) && typeof item.value === 'string'
    ) ||
    !Array.isArray(options.apiProtocols) ||
    !options.apiProtocols.every(item => item && typeof item.value === 'string' && !!item.value) ||
    !Array.isArray(options.capabilityTypes) ||
    !options.capabilityTypes.every(item => item && typeof item.value === 'string' && !!item.value)
  ) {
    throw new Error('配置选项响应不完整，请重新加载');
  }
  return {
    providerPresets: options.providerPresets.map(item => ({ id: item.id, value: item.value })),
    apiProtocols: options.apiProtocols.map(item => ({ value: item.value })),
    capabilityTypes: options.capabilityTypes.map(item => ({ value: item.value })),
  };
};

export const readConfigMutation = (
  response: BladeResponse<ConfigMutation>,
  expectedId?: string
): ConfigMutation => {
  const mutation = requireResponse(response);
  if (
    !isConfigId(mutation.id) ||
    !isLockVersion(mutation.lockVersion) ||
    (expectedId !== undefined && mutation.id !== expectedId)
  ) {
    throw new Error('写入结果不完整，请先核验记录，勿直接重复提交');
  }
  return { id: mutation.id, lockVersion: mutation.lockVersion };
};

export const readConfigRemoval = (response: BladeResponse<boolean>) => {
  if (requireResponse(response) !== true) {
    throw new Error('删除结果未确认，请先核验记录，勿直接重复提交');
  }
};

const cleanQueryText = (value?: string) => {
  const text = value?.trim();
  return validateNull(text) ? undefined : text;
};

export const buildProviderQuery = (form: ProviderQuery): ProviderQuery => ({
  name: cleanQueryText(form.name),
  code: cleanQueryText(form.code),
  status: form.status === 0 || form.status === 1 ? form.status : undefined,
});

export const buildModelQuery = (
  form: ModelQuery,
  provider?: ProviderDetail | null
): ModelQuery => ({
  code: cleanQueryText(form.code),
  status: form.status === 0 || form.status === 1 ? form.status : undefined,
  providerId: provider?.id,
  tenantId: provider?.tenantId,
  ownerUserId: provider?.ownerUserId,
});

export const getProtocolLabel = (value: string) => {
  const labels: { [value: string]: string } = {
    'openai-completions': 'OpenAI Chat Completions',
    'openai-responses': 'OpenAI Responses',
    'anthropic-messages': 'Anthropic Messages',
  };
  return Object.hasOwn(labels, value) ? labels[value] : value;
};

export const getCapabilityLabel = (value: string) => {
  const labels: { [value: string]: string } = { text: '文本', image: '图像', video: '视频' };
  return Object.hasOwn(labels, value) ? labels[value] : value;
};

export const getPresetLabel = (id: string | null, options: AiConfigOptions | null) => {
  if (!id) return '自定义';
  const preset = options?.providerPresets.find(item => item.id === id);
  return preset?.value ?? (options ? `${id}（已失效）` : id);
};

export const getStatusLabel = (status: ConfigStatus) => (status === 1 ? '启用' : '停用');
