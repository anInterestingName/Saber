import { computed, ref, type Ref } from 'vue';

type RowId = string | number;

export const useTableSelection = <T>(getRowId?: (row: T) => RowId) => {
  const selectedRows = ref([]) as Ref<T[]>;
  const resolveRowId = getRowId ?? ((row: T) => (row as T & { id: RowId }).id);
  const selectedIds = computed(() => selectedRows.value.map(row => resolveRowId(row)));
  const ids = computed(() => selectedIds.value.join(','));

  const handleSelectionChange = (rows: T[]) => {
    selectedRows.value = rows;
  };

  const clearSelection = () => {
    selectedRows.value = [];
  };

  return {
    selectedRows,
    selectedIds,
    ids,
    handleSelectionChange,
    clearSelection,
  };
};
