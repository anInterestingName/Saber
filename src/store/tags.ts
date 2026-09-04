import { defineStore } from 'pinia';
import type { LocationQueryRaw, RouteParamsRaw } from 'vue-router';
import website from '@/config/website';
import type { MenuMeta } from '@/types/menu';
import { getStore, removeStore, setStore } from '@/utils/store';

export interface TagItem {
  name?: string;
  path: string;
  fullPath: string;
  params?: RouteParamsRaw;
  query?: LocationQueryRaw;
  meta?: MenuMeta;
}

interface TagInput extends Omit<TagItem, 'name'> {
  name?: string | ((query?: LocationQueryRaw) => string);
}

const isTagItem = (
  value: object | string | number | boolean | null | undefined
): value is TagItem => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return (
    typeof Reflect.get(value, 'path') === 'string' &&
    typeof Reflect.get(value, 'fullPath') === 'string'
  );
};

const getStoredTagList = () => {
  const value = getStore({ name: 'tagList' });
  return Array.isArray(value) ? value.filter(isTagItem) : [];
};

const storedTag = getStore({ name: 'tag' });

export const useTagsStore = defineStore('tags', {
  state: () => ({
    homeTag: {
      ...website.firstPage,
      fullPath: website.firstPage.path,
    } as TagItem,
    currentTag: isTagItem(storedTag) ? storedTag : null,
    tagList: getStoredTagList(),
  }),
  getters: {
    keepAliveNames: state =>
      state.tagList.filter(tag => tag.meta?.keepAlive).map(tag => tag.fullPath),
  },
  actions: {
    addTag(input: TagInput) {
      const resolvedName = typeof input.name === 'function' ? input.name(input.query) : input.name;
      const tag: TagItem = {
        ...input,
        name: resolvedName === undefined ? undefined : String(resolvedName),
      };
      this.currentTag = tag;
      setStore({ name: 'tag', content: tag });
      if (this.tagList.some(item => item.fullPath === tag.fullPath)) return;
      this.tagList.push(tag);
      setStore({ name: 'tagList', content: this.tagList });
    },
    deleteTag(tag: TagItem) {
      this.tagList = this.tagList.filter(item => item.fullPath !== tag.fullPath);
      setStore({ name: 'tagList', content: this.tagList });
    },
    clearTags(tagList: TagItem[] = []) {
      this.tagList = tagList;
      if (tagList.length > 0) {
        setStore({ name: 'tagList', content: tagList });
      } else {
        removeStore({ name: 'tagList' });
      }
    },
    clearCurrentTag() {
      this.currentTag = null;
      removeStore({ name: 'tag' });
    },
    resetTags() {
      this.clearTags();
      this.clearCurrentTag();
    },
    deleteOtherTags() {
      const currentPath = this.currentTag?.fullPath;
      this.tagList = this.tagList.filter(tag =>
        [currentPath, website.firstPage.path].includes(tag.fullPath)
      );
      setStore({ name: 'tagList', content: this.tagList });
    },
  },
});
