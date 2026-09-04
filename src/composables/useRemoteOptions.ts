import { ref, type Ref } from 'vue';

type RemoteOptionArgument = string | number | boolean | object | null | undefined;

export const useRemoteOptions = <T, Args extends readonly RemoteOptionArgument[] = readonly []>(
  loader: (...args: Args) => Promise<T[]>
) => {
  const options = ref([]) as Ref<T[]>;
  const loading = ref(false);
  const failed = ref(false);
  let latestRequest = 0;

  const load = async (...args: Args) => {
    const request = ++latestRequest;
    options.value = [];
    failed.value = false;
    loading.value = true;

    try {
      const result = await loader(...args);
      if (request === latestRequest) options.value = result;
    } catch {
      if (request === latestRequest) failed.value = true;
    } finally {
      if (request === latestRequest) loading.value = false;
    }
  };

  const clear = () => {
    latestRequest += 1;
    options.value = [];
    loading.value = false;
    failed.value = false;
  };

  return { options, loading, failed, load, clear };
};
