import { computed } from 'vue';
import { useStore } from 'vuex';
import { validData } from '@/utils/util';

interface PermissionMap {
  [key: string]: boolean | undefined;
}

export const useCrudPermission = (moduleName: string) => {
  const store = useStore();
  const permission = computed<PermissionMap>(() => store.getters.permission ?? {});
  const hasPermission = (action: string) =>
    computed(() => validData(permission.value[`${moduleName}_${action}`], false));

  return {
    add: hasPermission('add'),
    view: hasPermission('view'),
    edit: hasPermission('edit'),
    delete: hasPermission('delete'),
  };
};
