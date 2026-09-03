<template>
  <div v-loading="loading" class="tree-check-panel">
    <div class="tree-check-panel__toolbar">
      <div class="tree-check-panel__linkage">
        <span>节点联动</span>
        <el-tooltip content="开启后勾选父节点会联动子节点" placement="top">
          <el-icon><QuestionFilled /></el-icon>
        </el-tooltip>
        <el-switch
          :model-value="linked"
          :disabled="operationsDisabled"
          aria-label="节点联动"
          @change="handleLinkedChange"
        />
      </div>
      <div class="tree-check-panel__actions">
        <el-button :disabled="operationsDisabled" @click="handleCheckAll">全选</el-button>
        <el-button :disabled="operationsDisabled" @click="handleInvert">反选</el-button>
      </div>
    </div>
    <div class="tree-check-panel__content" :style="contentStyle">
      <el-tree
        ref="treeRef"
        :data="displayData"
        node-key="id"
        show-checkbox
        default-expand-all
        :check-strictly="!linked"
        :empty-text="emptyText"
        :props="treeProps"
        @check="handleCheck"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { QuestionFilled } from '@element-plus/icons-vue';
import { ElTree } from 'element-plus';
import type { TreeKey, TreeNode } from '@/types/tree';

interface TreeCheckPanelProps {
  modelValue: TreeKey[];
  linked: boolean;
  data: TreeNode[];
  loading?: boolean;
  disabled?: boolean;
  maxHeight?: string | number;
  emptyText?: string;
}

interface DisplayTreeNode extends TreeNode {
  disabled: boolean;
  children?: DisplayTreeNode[];
}

const props = withDefaults(defineProps<TreeCheckPanelProps>(), {
  loading: false,
  disabled: false,
  maxHeight: 'min(52vh, 480px)',
  emptyText: '暂无可选数据',
});

const emit = defineEmits<{
  'update:modelValue': [keys: TreeKey[]];
  'update:linked': [linked: boolean];
}>();

const treeRef = ref<InstanceType<typeof ElTree>>();
const syncing = ref(false);
const treeProps = { children: 'children', label: 'title', disabled: 'disabled' };
const displayData = computed<DisplayTreeNode[]>(() => {
  const mapNodes = (nodes: TreeNode[]): DisplayTreeNode[] =>
    nodes.map(node => ({
      ...node,
      disabled: props.disabled,
      children: node.children?.length ? mapNodes(node.children) : undefined,
    }));
  return mapNodes(props.data);
});
const operationsDisabled = computed(
  () => props.loading || props.disabled || props.data.length === 0
);
const contentStyle = computed(() => ({
  maxHeight: typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight,
}));

const collectKeys = (rows: TreeNode[], leavesOnly = false, keys: TreeKey[] = []) => {
  rows.forEach(row => {
    const hasChildren = Boolean(row.children?.length);
    if (!leavesOnly || !hasChildren) keys.push(row.id);
    if (hasChildren) collectKeys(row.children ?? [], leavesOnly, keys);
  });
  return keys;
};

const syncCheckedKeys = async (keys: TreeKey[]) => {
  syncing.value = true;
  await nextTick();
  treeRef.value?.setCheckedKeys(keys, false);
  await nextTick();
  syncing.value = false;
};

watch(
  () => [props.data, props.modelValue, props.disabled] as const,
  () => void syncCheckedKeys(props.modelValue),
  { immediate: true, deep: true }
);

const emitCurrentKeys = () => {
  if (syncing.value) return;
  emit('update:modelValue', treeRef.value?.getCheckedKeys(false) as TreeKey[]);
};

const handleCheck = () => emitCurrentKeys();

const handleLinkedChange = async (value: string | number | boolean) => {
  const retainedKeys = [
    ...(treeRef.value?.getCheckedKeys(false) as TreeKey[]),
    ...(treeRef.value?.getHalfCheckedKeys() as TreeKey[]),
  ];
  const linked = Boolean(value);
  emit('update:linked', linked);
  await syncCheckedKeys([...new Set(retainedKeys)]);
  emitCurrentKeys();
};

const handleCheckAll = async () => {
  const keys = collectKeys(props.data, props.linked);
  await syncCheckedKeys(keys);
  emit('update:modelValue', treeRef.value?.getCheckedKeys(false) as TreeKey[]);
};

const handleInvert = async () => {
  const candidates = collectKeys(props.data, props.linked);
  const current = new Set(treeRef.value?.getCheckedKeys(false) as TreeKey[]);
  await syncCheckedKeys(candidates.filter(key => !current.has(key)));
  emit('update:modelValue', treeRef.value?.getCheckedKeys(false) as TreeKey[]);
};
</script>

<style scoped lang="scss">
.tree-check-panel {
  min-height: 220px;
  border: 1px solid var(--saber-border);
  border-radius: 6px;
  background: var(--saber-surface);
}

.tree-check-panel__toolbar {
  display: flex;
  min-height: 48px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--saber-border);
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tree-check-panel__linkage,
.tree-check-panel__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tree-check-panel__linkage {
  color: var(--saber-text-secondary);
}

.tree-check-panel__content {
  min-height: 170px;
  padding: 12px;
  overflow: auto;
}

@media (max-width: 767px) {
  .tree-check-panel__toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
