import request from '@/axios';
import type { PageResult } from '@/types/list';
import type { BladeResponse } from '@/types/option';

export type TagStatus = 0 | 1;
export type TagSelectionMode = 1 | 2;

export interface TagCategoryQuery {
  name?: string;
  code?: string;
  status?: TagStatus;
}

export interface TagCategoryListItem {
  id: string;
  categoryCode: string;
  categoryName: string;
  selectionMode: TagSelectionMode;
  selectionModeName?: string;
  maxSelectCount: number;
  sort: number;
  status: TagStatus;
  statusName?: string;
  tagCount: number;
  createTime?: string;
  updateTime?: string;
  lockVersion: string;
}

export interface TagCategoryDetail extends TagCategoryListItem {
  remark?: string;
}

export interface TagCategoryCreatePayload {
  categoryCode: string;
  categoryName: string;
  selectionMode: TagSelectionMode;
  maxSelectCount: number;
  sort: number;
  remark?: string;
}

export interface TagCategoryUpdatePayload {
  id: string;
  categoryName: string;
  selectionMode: TagSelectionMode;
  maxSelectCount: number;
  sort: number;
  remark?: string;
  lockVersion: string;
}

export interface TagStatusPayload {
  id: string;
  status: TagStatus;
  lockVersion: string;
}

export interface TagDeletePayload {
  id: string;
  lockVersion: string;
}

export interface TagMutation {
  id: string;
  status: TagStatus;
  lockVersion: string;
}

export interface TagQuery {
  categoryId?: string;
  parentId?: string;
  name?: string;
  code?: string;
  status?: TagStatus;
}

export interface TagListItem {
  id: string;
  categoryId: string;
  parentId: string;
  tagCode: string;
  tagName: string;
  depth: number;
  sort: number;
  status: TagStatus;
  statusName?: string;
  createTime?: string;
  updateTime?: string;
  lockVersion: string;
}

export interface TagTreeNode extends TagListItem {
  ancestors?: string;
  remark?: string;
  children?: TagTreeNode[];
}

export interface TagDetail extends TagListItem {
  ancestors?: string;
  remark?: string;
}

export interface TagOption {
  id: string;
  tagCode: string;
  tagName: string;
  parentId: string;
  depth: number;
  sort: number;
}

export interface TagCreatePayload {
  categoryId: string;
  parentId: string;
  tagCode: string;
  tagName: string;
  sort: number;
  remark?: string;
}

export interface TagUpdatePayload {
  id: string;
  parentId: string;
  tagName: string;
  sort: number;
  remark?: string;
  lockVersion: string;
}

export const getTagCategoryList = (current: number, size: number, params: TagCategoryQuery) =>
  request<BladeResponse<PageResult<TagCategoryListItem>>>({
    url: '/blade-system/tag-category/list',
    method: 'get',
    params: { ...params, current, size },
  });

export const getTagCategoryDetail = (id: string) =>
  request<BladeResponse<TagCategoryDetail>>({
    url: '/blade-system/tag-category/detail',
    method: 'get',
    params: { id },
  });

export const createTagCategory = (data: TagCategoryCreatePayload) =>
  request<BladeResponse<TagMutation>>({
    url: '/blade-system/tag-category/create',
    method: 'post',
    data,
  });

export const updateTagCategory = (data: TagCategoryUpdatePayload) =>
  request<BladeResponse<TagMutation>>({
    url: '/blade-system/tag-category/update',
    method: 'post',
    data,
  });

export const changeTagCategoryStatus = (data: TagStatusPayload) =>
  request<BladeResponse<TagMutation>>({
    url: '/blade-system/tag-category/status',
    method: 'post',
    data,
  });

export const removeTagCategory = (data: TagDeletePayload) =>
  request<BladeResponse<boolean>>({
    url: '/blade-system/tag-category/remove',
    method: 'post',
    data,
  });

export const getTagList = (current: number, size: number, params: TagQuery) =>
  request<BladeResponse<PageResult<TagListItem>>>({
    url: '/blade-system/tag/list',
    method: 'get',
    params: { ...params, current, size },
  });

export const getTagDetail = (id: string) =>
  request<BladeResponse<TagDetail>>({
    url: '/blade-system/tag/detail',
    method: 'get',
    params: { id },
  });

export const getTagTree = (categoryId: string) =>
  request<BladeResponse<TagTreeNode[]>>({
    url: '/blade-system/tag/tree',
    method: 'get',
    params: { categoryId },
  });

export const getTagOptions = (categoryId: string) =>
  request<BladeResponse<TagOption[]>>({
    url: '/blade-system/tag/options',
    method: 'get',
    params: { categoryId },
  });

export const createTag = (data: TagCreatePayload) =>
  request<BladeResponse<TagMutation>>({
    url: '/blade-system/tag/create',
    method: 'post',
    data,
  });

export const updateTag = (data: TagUpdatePayload) =>
  request<BladeResponse<TagMutation>>({
    url: '/blade-system/tag/update',
    method: 'post',
    data,
  });

export const changeTagStatus = (data: TagStatusPayload) =>
  request<BladeResponse<TagMutation>>({
    url: '/blade-system/tag/status',
    method: 'post',
    data,
  });

export const removeTag = (data: TagDeletePayload) =>
  request<BladeResponse<boolean>>({
    url: '/blade-system/tag/remove',
    method: 'post',
    data,
  });
