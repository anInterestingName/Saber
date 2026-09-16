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
    <el-button
      v-for="action in inlineActions"
      :key="action.key"
      :type="action.danger ? 'danger' : 'primary'"
      link
      :icon="action.icon"
      :disabled="disabled || action.disabled"
      @click="emit('action', action.key)"
    >
      {{ action.label }}
    </el-button>
    <el-dropdown v-if="overflowActions.length" trigger="click" :disabled="disabled">
      <el-button type="primary" link :icon="MoreFilled" :disabled="disabled">更多</el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="(action, index) in overflowActions"
            :key="action.key"
            :divided="action.divided || (action.danger && index > 0)"
            :icon="action.icon"
            :disabled="disabled || action.disabled"
            @click="emit('action', action.key)"
          >
            <span :class="{ 'row-actions__danger': action.danger }">{{ action.label }}</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';
import { Delete, Edit, MoreFilled, View } from '@element-plus/icons-vue';

interface RowActionItem {
  key: string;
  label: string;
  icon?: Component;
  danger?: boolean;
  divided?: boolean;
  disabled?: boolean;
}

interface RowActionsProps {
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  actions?: RowActionItem[];
  maxInline?: number;
  disabled?: boolean;
}

const props = withDefaults(defineProps<RowActionsProps>(), {
  showView: false,
  showEdit: false,
  showDelete: false,
  actions: () => [],
  maxInline: 3,
  disabled: false,
});

const emit = defineEmits<{
  view: [];
  edit: [];
  delete: [];
  action: [key: string];
}>();

const baseActionCount = computed(
  () => Number(props.showView) + Number(props.showEdit) + Number(props.showDelete)
);
const inlineActionCapacity = computed(() => Math.max(props.maxInline - baseActionCount.value, 0));
const inlineActions = computed(() => props.actions.slice(0, inlineActionCapacity.value));
const overflowActions = computed(() => props.actions.slice(inlineActionCapacity.value));
</script>

<style scoped lang="scss">
.row-actions {
  display: inline-flex;
  max-width: 100%;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  gap: var(--saber-space-1);

  :deep(.el-button) {
    min-width: 52px;
    height: 32px;
    margin-left: 0;
    padding: var(--saber-space-1) var(--saber-space-2);
  }
}

.row-actions__danger {
  color: var(--el-color-danger);
}
</style>
