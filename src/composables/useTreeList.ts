import { ref, type Ref } from 'vue';
import type { TreeKey, TreeListOptions, TreeNode } from '@/types/tree';

const collectTreeKeys = <T extends TreeNode>(
  rows: T[],
  getRowKey: (row: T) => TreeKey,
  keys = new Set<TreeKey>()
) => {
  rows.forEach(row => {
    keys.add(getRowKey(row));
    if (row.children?.length) collectTreeKeys(row.children as T[], getRowKey, keys);
  });
  return keys;
};

export const useTreeList = <T extends TreeNode, Q extends object, R>(
  options: TreeListOptions<T, Q, R>
) => {
  const data = ref([]) as Ref<T[]>;
  const query = ref(options.createInitialQuery()) as Ref<Q>;
  const loading = ref(false);
  const failed = ref(false);
  const expandedRowKeys = ref<TreeKey[]>([]);
  const getRowKey = options.getRowKey ?? ((row: T) => row.id);
  let latestRequest = 0;

  const load = async (clearBeforeLoad = false) => {
    const request = ++latestRequest;
    if (clearBeforeLoad) data.value = [];
    failed.value = false;
    loading.value = true;

    try {
      const response = await options.fetcher({ ...query.value });
      if (request !== latestRequest) return;

      const rows = options.resolveResponse(response);
      const availableKeys = collectTreeKeys(rows, getRowKey);
      data.value = rows;
      expandedRowKeys.value = expandedRowKeys.value.filter(key => availableKeys.has(key));
    } catch {
      if (request === latestRequest) failed.value = true;
    } finally {
      if (request === latestRequest) loading.value = false;
    }
  };

  const search = (nextQuery: Q) => {
    query.value = { ...nextQuery };
    return load(true);
  };

  const reset = () => {
    query.value = options.createInitialQuery();
    return load(true);
  };

  const refresh = () => load();

  const handleExpandChange = (row: T, expanded: boolean) => {
    const rowKey = getRowKey(row);
    const keys = new Set(expandedRowKeys.value);
    if (expanded) keys.add(rowKey);
    else keys.delete(rowKey);
    expandedRowKeys.value = [...keys];
  };

  return {
    data,
    query,
    loading,
    failed,
    expandedRowKeys,
    load,
    search,
    reset,
    refresh,
    handleExpandChange,
  };
};
