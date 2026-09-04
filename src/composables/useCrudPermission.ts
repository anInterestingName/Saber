import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/store/user';
import { validData } from '@/utils/util';

export const useCrudPermission = (moduleName: string) => {
  const { permission } = storeToRefs(useUserStore());
  const hasPermission = (action: string) =>
    computed(() => validData(permission.value[`${moduleName}_${action}`], false));

  return {
    add: hasPermission('add'),
    view: hasPermission('view'),
    edit: hasPermission('edit'),
    delete: hasPermission('delete'),
  };
};
