export interface AuthResponse<T> {
  code: number;
  success: boolean;
  msg: string;
  data: T;
}

export interface CsrfContext {
  headerName: string;
  token: string;
}

export interface AuthCsrfContext extends CsrfContext {
  parameterName: string;
}

export interface LoginContext {
  authorizationPending: boolean;
  authenticated: boolean;
  defaultTenantId: string;
  csrf: AuthCsrfContext;
}

export interface ConsentContext {
  clientId: string;
  clientName: string;
  username: string;
  scopes: Array<{ code: string; description: string; autoApproved: boolean }>;
  csrf: AuthCsrfContext;
}

export interface BffSession {
  subject: string;
  issuer: string;
  clientId: string;
  scope: string[];
  accessTokenExpiresAt: string;
}

export interface UserProfile {
  id: string;
  tenantId: string;
  account: string;
  name?: string;
  avatar?: string;
  realName?: string;
  phone?: string;
  email?: string;
  roles: string[];
}

export interface PermissionNode {
  code?: string;
  children?: PermissionNode[];
}
