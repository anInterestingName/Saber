import { ref, type Ref } from 'vue';
import type { PageListOptions, PageState } from '@/types/list';

export const usePagedList = <T, Q extends object, R>(options: PageListOptions<T, Q, R>) => {
  const data = ref([]) as Ref<T[]>;
  const query = ref(options.createInitialQuery()) as Ref<Q>;
  const page = ref<PageState>({
    currentPage: 1,
    pageSize: options.initialPageSize ?? 10,
    total: 0,
  });
  const loading = ref(false);
  let latestRequest = 0;

  const load = async () => {
    const request = ++latestRequest;
    loading.value = true;

    try {
      const response = await options.fetcher(page.value.currentPage, page.value.pageSize, {
        ...query.value,
      });
      if (request !== latestRequest) return;

      const result = options.resolveResponse(response);
      data.value = result.records;
      page.value.total = result.total;
    } catch {
      // 普通请求错误已由 Axios 统一提示，列表只负责恢复局部状态。
    } finally {
      if (request === latestRequest) loading.value = false;
    }
  };

  const search = (nextQuery: Q) => {
    query.value = { ...nextQuery };
    page.value.currentPage = 1;
    return load();
  };

  const reset = () => {
    query.value = options.createInitialQuery();
    page.value.currentPage = 1;
    return load();
  };

  const refresh = () => load();

  const changePage = (currentPage: number) => {
    page.value.currentPage = currentPage;
    return load();
  };

  const changeSize = (pageSize: number) => {
    page.value.pageSize = pageSize;
    page.value.currentPage = 1;
    return load();
  };

  return {
    data,
    query,
    page,
    loading,
    load,
    search,
    reset,
    refresh,
    changePage,
    changeSize,
  };
};
