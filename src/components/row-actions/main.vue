<template>
  <div class="row-actions">
    <el-button
      v-if="showView"
      type="primary"
      link
      :icon="View"
      :disabled="disabled"
      @click="emit('view')"
    >
      查看
    </el-button>
    <el-button
      v-if="showEdit"
      type="primary"
      link
      :icon="Edit"
      :disabled="disabled"
      @click="emit('edit')"
    >
      编辑
    </el-button>
    <el-button
      v-if="showDelete"
      type="danger"
      link
      :icon="Delete"
      :disabled="disabled"
      @click="emit('delete')"
    >
      删除
    </el-button>
    <slot name="extra" />
  </div>
</template>

<script setup lang="ts">
import { Delete, Edit, View } from '@element-plus/icons-vue';

interface RowActionsProps {
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  disabled?: boolean;
}

withDefaults(defineProps<RowActionsProps>(), {
  showView: false,
  showEdit: false,
  showDelete: false,
  disabled: false,
});

const emit = defineEmits<{
  view: [];
  edit: [];
  delete: [];
}>();
</script>

<style scoped lang="scss">
.row-actions {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  gap: 4px;

  :deep(.el-button) {
    min-width: 52px;
    height: 32px;
    margin-left: 0;
    padding: 4px 6px;
  }
}
</style>
