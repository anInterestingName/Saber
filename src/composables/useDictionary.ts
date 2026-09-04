import { ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';
import { getDictionary } from '@/api/system/dict';
import type { DictionaryItem } from '@/types/option';

const dictionaryCache = new Map<string, Promise<DictionaryItem[]>>();

const requestDictionary = (code: string) => {
  const cachedRequest = dictionaryCache.get(code);
  if (cachedRequest) return cachedRequest;

  const request = getDictionary(code)
    .then(response => response.data.data)
    .catch(error => {
      dictionaryCache.delete(code);
      throw error;
    });
  dictionaryCache.set(code, request);
  return request;
};

export const useDictionary = (code: MaybeRefOrGetter<string>) => {
  const items = ref([]) as Ref<DictionaryItem[]>;
  const loading = ref(false);
  const failed = ref(false);
  let latestRequest = 0;

  const load = async () => {
    const currentCode = toValue(code);
    const request = ++latestRequest;
    items.value = [];
    failed.value = false;
    if (!currentCode) return;

    loading.value = true;
    try {
      const result = await requestDictionary(currentCode);
      if (request === latestRequest) items.value = result;
    } catch {
      if (request === latestRequest) failed.value = true;
    } finally {
      if (request === latestRequest) loading.value = false;
    }
  };

  watch(() => toValue(code), load, { immediate: true });

  return { items, loading, failed, load };
};
