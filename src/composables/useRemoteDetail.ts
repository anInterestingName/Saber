import { ref, type Ref } from 'vue';

export const useRemoteDetail = <T, ID>(loader: (id: ID) => Promise<T>) => {
  const data = ref(null) as Ref<T | null>;
  const loading = ref(false);
  const failed = ref(false);
  let latestRequest = 0;

  const load = async (id: ID) => {
    const request = ++latestRequest;
    data.value = null;
    failed.value = false;
    loading.value = true;

    try {
      const result = await loader(id);
      if (request !== latestRequest) return null;
      data.value = result;
      return result;
    } catch {
      if (request === latestRequest) {
        data.value = null;
        failed.value = true;
      }
      return null;
    } finally {
      if (request === latestRequest) loading.value = false;
    }
  };

  const clear = () => {
    latestRequest += 1;
    data.value = null;
    loading.value = false;
    failed.value = false;
  };

  return { data, loading, failed, load, clear };
};
