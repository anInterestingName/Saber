export type DictionaryValue = string | number;

export interface DictionaryItem {
  dictKey: DictionaryValue;
  dictValue: string;
}

export interface TenantOption {
  tenantId: string;
  tenantName: string;
}

export interface BladeResponse<T> {
  code: number;
  data: T;
  msg?: string;
}
