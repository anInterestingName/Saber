import request from '@/axios';
import type { BladeResponse } from '@/types/option';
import type { TreeKey, TreeNode } from '@/types/tree';

export interface RoleGrantTree {
  menu: TreeNode[];
  dataScope: TreeNode[];
  apiScope: TreeNode[];
}

export interface RoleGrantKeys {
  menu: TreeKey[];
  dataScope: TreeKey[];
  apiScope: TreeKey[];
}

interface RoleTreeNode extends TreeNode {
  id: string;
  children?: RoleTreeNode[];
}

export const getList = <T extends TreeNode>(params: object) =>
  request<BladeResponse<T[]>>({
    url: '/blade-system/role/list',
    method: 'get',
    params,
  });

export const grantTree = () =>
  request<BladeResponse<RoleGrantTree>>({
    url: '/blade-system/menu/grant-tree',
    method: 'get',
  });

export const grant = (
  roleIds: TreeKey[],
  menuIds: TreeKey[],
  dataScopeIds: TreeKey[],
  apiScopeIds: TreeKey[]
) =>
  request({
    url: '/blade-system/role/grant',
    method: 'post',
    data: { roleIds, menuIds, dataScopeIds, apiScopeIds },
  });

export const remove = (ids: string) =>
  request({
    url: '/blade-system/role/remove',
    method: 'post',
    params: { ids },
  });

export const add = (row: object) =>
  request({
    url: '/blade-system/role/submit',
    method: 'post',
    data: row,
  });

export const update = (row: object) =>
  request({
    url: '/blade-system/role/submit',
    method: 'post',
    data: row,
  });

export const getDetail = <T>(id: string) =>
  request<BladeResponse<T>>({
    url: '/blade-system/role/detail',
    method: 'get',
    params: { id },
  });

export const getRole = (roleIds: string) =>
  request<BladeResponse<RoleGrantKeys>>({
    url: '/blade-system/menu/role-tree-keys',
    method: 'get',
    params: { roleIds },
  });

export const getGrantKeys = getRole;

export const getRoleTree = <T extends TreeNode = RoleTreeNode>(tenantId?: string) =>
  request<BladeResponse<T[]>>({
    url: '/blade-system/role/tree',
    method: 'get',
    params: { tenantId },
  });
