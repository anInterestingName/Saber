import { readonly, ref } from 'vue';
import { ElMessageBox } from 'element-plus';

interface OverlayCloseGuardOptions {
  submitting: () => boolean;
  dirty: () => boolean;
  title?: string;
  message?: string;
}

export const useOverlayCloseGuard = (options: OverlayCloseGuardOptions) => {
  const confirming = ref(false);

  const canClose = async () => {
    if (options.submitting() || confirming.value) return false;
    if (!options.dirty()) return true;

    confirming.value = true;
    try {
      await ElMessageBox.confirm(
        options.message || '当前修改尚未保存，确定放弃吗？',
        options.title || '放弃未保存修改',
        {
          type: 'warning',
          confirmButtonText: '放弃修改',
          cancelButtonText: '继续编辑',
        }
      );
      return true;
    } catch {
      return false;
    } finally {
      confirming.value = false;
    }
  };

  return {
    confirming: readonly(confirming),
    canClose,
  };
};
