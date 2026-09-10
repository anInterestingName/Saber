<template>
  <detail-drawer
    v-model="visible"
    :title="category ? `${category.categoryName} - 标签管理` : '标签管理'"
    size="min(960px, 92vw)"
    :loading="loading"
    @close="resetDrawer"
  >
    <template v-if="category">
      <el-descriptions class="tag-tree-summary" :column="summaryColumns" border>
        <el-descriptions-item label="分类编码">
          <code>{{ category.categoryCode }}</code>
        </el-descriptions-item>
        <el-descriptions-item label="选择规则">{{ selectionRuleText }}</el-descriptions-item>
        <el-descriptions-item label="分类状态">
          <el-tag :type="category.status === 1 ? 'success' : 'info'">
            {{ category.statusName || (category.status === 1 ? '启用' : '停用') }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="标签数量">{{ displayedTagCount }}</el-descriptions-item>
      </el-descriptions>

      <div class="tag-tree-toolbar">
        <el-form class="tag-tree-toolbar__filters" :model="filterForm" inline>
          <el-form-item label="名称">
            <el-input v-model="filterForm.name" clearable placeholder="筛选标签名称" />
          </el-form-item>
          <el-form-item label="编码">
            <el-input v-model="filterForm.code" clearable placeholder="筛选标签编码" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" clearable placeholder="全部状态">
              <el-option label="启用" :value="1" />
              <el-option label="停用" :value="0" />
            </el-select>
          </el-form-item>
        </el-form>
        <div class="tag-tree-toolbar__actions">
          <el-button :icon="RefreshLeft" :disabled="!isFiltered" @click="resetFilter">
            重置筛选
          </el-button>
          <el-button
            v-if="canCreate"
            type="primary"
            :icon="Plus"
            :disabled="!treeReady || Boolean(tagActionId)"
            @click="openAddRoot"
          >
            新增根标签
          </el-button>
          <el-tooltip content="刷新" placement="top">
            <el-button
              circle
              :icon="Refresh"
              :loading="loading"
              :disabled="loading || Boolean(tagActionId)"
              aria-label="刷新标签树"
              @click="loadTree"
            />
          </el-tooltip>
        </div>
      </div>

      <el-result
        v-if="failed"
        icon="error"
        title="标签树加载失败"
        sub-title="旧数据已清空，请重新加载后继续"
      >
        <template #extra>
          <el-button type="primary" @click="loadTree">重新加载</el-button>
        </template>
      </el-result>

      <el-table
        v-else
        :data="filteredTree"
        row-key="id"
        :expand-row-keys="tableExpandedRowKeys"
        :tree-props="{ children: 'children' }"
        @expand-change="handleTableExpandChange"
      >
        <el-table-column prop="tagName" label="标签名称" min-width="190" show-overflow-tooltip />
        <el-table-column prop="tagCode" label="标签编码" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">
            <code>{{ row.tagCode }}</code>
          </template>
        </el-table-column>
        <el-table-column label="层级" width="90" align="center">
          <template #default="{ row }">第 {{ row.depth }} 级</template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-switch
              v-if="canStatus"
              :model-value="row.status === 1"
              :loading="tagActionId === row.id"
              :disabled="Boolean(tagActionId) && tagActionId !== row.id"
              inline-prompt
              active-text="启"
              inactive-text="停"
              @change="value => handleStatusChange(row as TagTreeNode, Boolean(value))"
            />
            <el-tag v-else :type="row.status === 1 ? 'success' : 'info'">
              {{ row.statusName || (row.status === 1 ? '启用' : '停用') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          v-if="hasAnyRowAction"
          label="操作"
          fixed="right"
          width="320"
          align="center"
        >
          <template #default="{ row }">
            <row-actions
              :show-view="canView"
              :show-edit="canEdit"
              :show-delete="canDelete"
              :disabled="Boolean(tagActionId)"
              @view="openView(row as TagTreeNode)"
              @edit="openEdit(row as TagTreeNode)"
              @delete="handleDelete(row as TagTreeNode)"
            >
              <template v-if="canCreate" #extra>
                <el-button
                  type="primary"
                  link
                  :icon="Plus"
                  :disabled="Boolean(tagActionId)"
                  @click="openAddChild(row as TagTreeNode)"
                >
                  新增子标签
                </el-button>
              </template>
            </row-actions>
          </template>
        </el-table-column>

        <template #empty>
          <div class="tag-tree-empty">
            <el-empty
              :description="isFiltered ? '没有符合筛选条件的标签' : '当前分类暂无标签'"
              :image-size="88"
            />
            <el-button
              v-if="canCreate && !isFiltered"
              type="primary"
              :icon="Plus"
              @click="openAddRoot"
            >
              新增根标签
            </el-button>
          </div>
        </template>
      </el-table>
    </template>
  </detail-drawer>

  <tag-editor-dialog
    v-if="category"
    v-model="editorVisible"
    :mode="editorMode"
    :category-id="category.id"
    :category-code="category.categoryCode"
    :category-name="category.categoryName"
    :tag-id="editorTagId"
    :parent-id="editorParentId"
    :tree="data"
    :tree-ready="treeReady"
    :can-create="canCreate"
    :can-edit="canEdit"
    @saved="handleEditorSaved"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Plus, Refresh, RefreshLeft } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import DetailDrawer from '@/components/detail-drawer/main.vue';
import RowActions from '@/components/row-actions/main.vue';
import TagEditorDialog from './tag-editor-dialog.vue';
import { BladeBusinessError } from '@/axios';
import { useTreeList } from '@/composables/useTreeList';
import {
  changeTagStatus,
  getTagTree,
  removeTag,
  type TagCategoryListItem,
  type TagTreeNode,
} from '@/api/system/tag';
import type { CrudMode } from '@/types/crud';
import {
  collectExpandableIds,
  countTagTreeNodes,
  filterTagTree,
  hasTagTreeFilter,
  type TagTreeFilter,
} from '../tagTree';

interface TagTreeDrawerProps {
  modelValue: boolean;
  category: TagCategoryListItem | null;
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canStatus?: boolean;
}

interface TagTreeQuery {
  categoryId: string;
}

const props = withDefaults(defineProps<TagTreeDrawerProps>(), {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canStatus: false,
});

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  changed: [];
}>();

const createInitialFilter = (): TagTreeFilter => ({});
const filterForm = ref<TagTreeFilter>(createInitialFilter());
const treeReady = ref(false);
const tagActionId = ref('');
const editorVisible = ref(false);
const editorMode = ref<CrudMode>('add');
const editorTagId = ref<string>();
const editorParentId = ref('0');
const viewportWidth = ref(window.innerWidth);
let latestTreeRequest = 0;

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});
const summaryColumns = computed(() => {
  if (viewportWidth.value < 768) return 1;
  if (viewportWidth.value < 1200) return 2;
  return 4;
});
const selectionRuleText = computed(() => {
  if (!props.category) return '-';
  return props.category.selectionMode === 1
    ? '单选'
    : `多选，最多 ${props.category.maxSelectCount} 项`;
});
const hasAnyRowAction = computed(
  () => props.canView || props.canCreate || props.canEdit || props.canDelete
);

type TagTreeResponse = Awaited<ReturnType<typeof getTagTree>>;
const { data, query, loading, failed, expandedRowKeys, search, handleExpandChange } = useTreeList<
  TagTreeNode,
  TagTreeQuery,
  TagTreeResponse
>({
  fetcher: treeQuery => getTagTree(treeQuery.categoryId),
  resolveResponse: response => response.data.data,
  createInitialQuery: () => ({ categoryId: '' }),
});

const isFiltered = computed(() => hasTagTreeFilter(filterForm.value));
const filteredTree = computed(() => filterTagTree(data.value, filterForm.value));
const tableExpandedRowKeys = computed(() =>
  isFiltered.value ? collectExpandableIds(filteredTree.value) : expandedRowKeys.value.map(String)
);
const displayedTagCount = computed(() =>
  treeReady.value ? countTagTreeNodes(data.value) : props.category?.tagCount ?? 0
);

const handleResize = () => {
  viewportWidth.value = window.innerWidth;
};

const loadTree = async () => {
  if (!props.category) return;
  const request = ++latestTreeRequest;
  const categoryId = props.category.id;
  treeReady.value = false;
  await search({ categoryId });
  if (request === latestTreeRequest && props.modelValue && props.category?.id === categoryId) {
    treeReady.value = !failed.value;
  }
};

const resetFilter = () => {
  filterForm.value = createInitialFilter();
};

const handleTableExpandChange = (row: TagTreeNode, expanded: boolean | TagTreeNode[]) => {
  const isExpanded = Array.isArray(expanded) ? expanded.some(item => item.id === row.id) : expanded;
  handleExpandChange(row, isExpanded);
};

const openEditor = (mode: CrudMode, tagId?: string, parentId = '0') => {
  if (!treeReady.value && mode !== 'view') return;
  editorMode.value = mode;
  editorTagId.value = tagId;
  editorParentId.value = parentId;
  editorVisible.value = true;
};
const openAddRoot = () => openEditor('add');
const openAddChild = (row: TagTreeNode) => openEditor('add', undefined, row.id);
const openView = (row: TagTreeNode) => openEditor('view', row.id);
const openEdit = (row: TagTreeNode) => openEditor('edit', row.id);

const recoverActionError = async (error: object) => {
  if (!(error instanceof BladeBusinessError)) return;
  if (error.code === 48101) {
    visible.value = false;
    emit('changed');
  } else if (error.code === 48102 || error.code === 48112) {
    if (error.code === 48112) ElMessage.warning('数据已变化，已重新加载最新标签树');
    await loadTree();
  }
};

const handleStatusChange = async (row: TagTreeNode, enabled: boolean) => {
  if (!props.canStatus || tagActionId.value) return;
  const nextStatus = enabled ? 1 : 0;
  if (nextStatus === row.status) return;

  try {
    await ElMessageBox.confirm(
      enabled
        ? '启用后仍受分类和祖先标签状态影响，确定继续吗？'
        : '停用后该标签及其子树暂不作为有效选项，子标签自身状态不会改变。确定继续吗？',
      `${enabled ? '启用' : '停用'}标签`,
      { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
    );
  } catch {
    return;
  }

  tagActionId.value = row.id;
  try {
    await changeTagStatus({ id: row.id, status: nextStatus, lockVersion: row.lockVersion });
    await loadTree();
    emit('changed');
    ElMessage.success('状态更新成功');
  } catch (error) {
    await recoverActionError(error instanceof Error ? error : new Error('状态更新失败'));
  } finally {
    tagActionId.value = '';
  }
};

const handleDelete = async (row: TagTreeNode) => {
  if (!props.canDelete || tagActionId.value) return;
  if (row.children?.length) {
    ElMessage.warning('请先处理该标签下的子标签');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定删除标签“${row.tagName}”吗？删除后该分类内编码不可复用。`,
      '删除标签',
      { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
    );
  } catch {
    return;
  }

  tagActionId.value = row.id;
  try {
    await removeTag({ id: row.id, lockVersion: row.lockVersion });
    await loadTree();
    emit('changed');
    ElMessage.success('删除成功');
  } catch (error) {
    await recoverActionError(error instanceof Error ? error : new Error('删除失败'));
  } finally {
    tagActionId.value = '';
  }
};

const handleEditorSaved = async () => {
  await loadTree();
  emit('changed');
};

const prepareDrawer = () => {
  filterForm.value = createInitialFilter();
  expandedRowKeys.value = [];
  query.value = { categoryId: props.category?.id ?? '' };
  void loadTree();
};

watch(
  () => [props.modelValue, props.category?.id],
  ([drawerVisible]) => {
    if (drawerVisible) prepareDrawer();
  }
);

function resetDrawer() {
  latestTreeRequest += 1;
  editorVisible.value = false;
  editorTagId.value = undefined;
  editorParentId.value = '0';
  filterForm.value = createInitialFilter();
  data.value = [];
  expandedRowKeys.value = [];
  treeReady.value = false;
}

onMounted(() => window.addEventListener('resize', handleResize));
onBeforeUnmount(() => window.removeEventListener('resize', handleResize));
</script>

<style scoped lang="scss">
.tag-tree-summary {
  margin-bottom: 20px;
}

.tag-tree-toolbar {
  display: flex;
  min-width: 0;
  margin-bottom: 16px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.tag-tree-toolbar__filters {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 12px;

  :deep(.el-form-item) {
    width: min(210px, 100%);
    margin-right: 0;
    margin-bottom: 0;
  }
}

.tag-tree-toolbar__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.tag-tree-empty {
  padding: 16px 0 24px;
  text-align: center;
}

:deep(.el-select) {
  width: 100%;
}

@media (max-width: 767px) {
  .tag-tree-toolbar {
    flex-direction: column;
  }

  .tag-tree-toolbar__filters,
  .tag-tree-toolbar__actions {
    width: 100%;
  }

  .tag-tree-toolbar__filters :deep(.el-form-item) {
    width: 100%;
  }
}
</style>
