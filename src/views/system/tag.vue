<template>
  <div class="tag-management-page">
    <search-panel
      :model="searchForm"
      :loading="loading"
      label-width="64px"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="名称">
          <el-input v-model="searchForm.name" clearable placeholder="请输入分类名称" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="编码">
          <el-input v-model="searchForm.code" clearable placeholder="请输入分类编码" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部状态">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
      </el-col>
    </search-panel>

    <list-panel title="标签分类列表">
      <template #actions>
        <el-button
          v-if="canCategoryAdd"
          type="primary"
          :icon="Plus"
          :disabled="Boolean(categoryActionId)"
          @click="openCategoryDialog('add')"
        >
          新增分类
        </el-button>
      </template>
      <template #tools>
        <el-tooltip content="刷新" placement="top">
          <el-button
            circle
            :icon="Refresh"
            :loading="loading"
            :disabled="Boolean(categoryActionId)"
            aria-label="刷新分类列表"
            @click="refreshCategories"
          />
        </el-tooltip>
      </template>

      <el-table v-loading="loading" :data="data" row-key="id">
        <el-table-column
          prop="categoryName"
          label="分类名称"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column prop="categoryCode" label="分类编码" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">
            <code>{{ row.categoryCode }}</code>
          </template>
        </el-table-column>
        <el-table-column label="选择规则" min-width="150">
          <template #default="{ row }">{{ getSelectionRule(row as TagCategoryListItem) }}</template>
        </el-table-column>
        <el-table-column label="标签数量" width="100" align="center">
          <template #default="{ row }">
            <el-button
              v-if="canTagView"
              type="primary"
              link
              :disabled="Boolean(categoryActionId)"
              @click="openTagDrawer(row as TagCategoryListItem)"
            >
              {{ row.tagCount }}
            </el-button>
            <span v-else>{{ row.tagCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-switch
              v-if="canCategoryStatus"
              :model-value="row.status === 1"
              :loading="categoryActionId === row.id"
              :disabled="Boolean(categoryActionId) && categoryActionId !== row.id"
              inline-prompt
              active-text="启"
              inactive-text="停"
              @change="value => handleStatusChange(row as TagCategoryListItem, Boolean(value))"
            />
            <el-tag v-else :type="row.status === 1 ? 'success' : 'info'">
              {{ row.statusName || (row.status === 1 ? '启用' : '停用') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" min-width="170">
          <template #default="{ row }">{{ formatTime(row.updateTime) }}</template>
        </el-table-column>
        <el-table-column
          v-if="hasAnyCategoryRowAction"
          label="操作"
          fixed="right"
          width="330"
          align="center"
        >
          <template #default="{ row }">
            <row-actions
              :show-view="canCategoryView"
              :show-edit="canCategoryEdit"
              :show-delete="canCategoryDelete"
              :disabled="Boolean(categoryActionId)"
              @view="openCategoryDialog('view', row as TagCategoryListItem)"
              @edit="openCategoryDialog('edit', row as TagCategoryListItem)"
              @delete="handleDelete(row as TagCategoryListItem)"
            >
              <template v-if="canTagView" #extra>
                <el-button
                  type="primary"
                  link
                  :icon="CollectionTag"
                  :disabled="Boolean(categoryActionId)"
                  @click="openTagDrawer(row as TagCategoryListItem)"
                >
                  管理标签
                </el-button>
              </template>
            </row-actions>
          </template>
        </el-table-column>

        <template #empty>
          <div class="tag-category-empty">
            <el-empty description="暂无标签分类" :image-size="88" />
            <el-button
              v-if="canCategoryAdd"
              type="primary"
              :icon="Plus"
              @click="openCategoryDialog('add')"
            >
              新增分类
            </el-button>
          </div>
        </template>
      </el-table>

      <template #footer>
        <list-pagination
          v-model:current-page="page.currentPage"
          v-model:page-size="page.pageSize"
          :total="page.total"
          :disabled="loading"
          @change="handlePageChange"
        />
      </template>
    </list-panel>

    <tag-category-dialog
      v-model="categoryDialogVisible"
      :mode="categoryDialogMode"
      :category-id="categoryDialogId"
      :can-create="canCategoryAdd"
      :can-edit="canCategoryEdit"
      @saved="handleCategorySaved"
    />

    <tag-tree-drawer
      v-model="tagDrawerVisible"
      :category="selectedCategory"
      :can-view="canTagView"
      :can-create="canTagAdd"
      :can-edit="canTagEdit"
      :can-delete="canTagDelete"
      :can-status="canTagStatus"
      @changed="refreshCategories"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { CollectionTag, Plus, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import ListPagination from '@/components/list-pagination/main.vue';
import RowActions from '@/components/row-actions/main.vue';
import TagCategoryDialog from './components/tag-category-dialog.vue';
import TagTreeDrawer from './components/tag-tree-drawer.vue';
import { BladeBusinessError } from '@/axios';
import { useCrudPermission } from '@/composables/useCrudPermission';
import { usePagedList } from '@/composables/usePagedList';
import { useUserStore } from '@/store/user';
import { validData } from '@/utils/util';
import {
  changeTagCategoryStatus,
  getTagCategoryList,
  removeTagCategory,
  type TagCategoryListItem,
  type TagCategoryQuery,
} from '@/api/system/tag';
import type { CrudMode } from '@/types/crud';
import type { PaginationChange } from '@/types/list';

type TagCategoryListResponse = Awaited<ReturnType<typeof getTagCategoryList>>;

const createInitialQuery = (): TagCategoryQuery => ({});
const searchForm = ref<TagCategoryQuery>(createInitialQuery());
const categoryDialogVisible = ref(false);
const categoryDialogMode = ref<CrudMode>('add');
const categoryDialogId = ref<string>();
const tagDrawerVisible = ref(false);
const selectedCategory = ref<TagCategoryListItem | null>(null);
const categoryActionId = ref('');

const { permission } = storeToRefs(useUserStore());
const {
  add: canCategoryAdd,
  view: canCategoryView,
  edit: canCategoryEdit,
  delete: canCategoryDelete,
} = useCrudPermission('tag_category');
const {
  add: canTagAdd,
  view: canTagView,
  edit: canTagEdit,
  delete: canTagDelete,
} = useCrudPermission('tag');
const canCategoryStatus = computed(() => validData(permission.value.tag_category_status, false));
const canTagStatus = computed(() => validData(permission.value.tag_status, false));
const hasAnyCategoryRowAction = computed(
  () =>
    canCategoryView.value || canCategoryEdit.value || canCategoryDelete.value || canTagView.value
);

const { data, page, loading, load, search, reset, refresh } = usePagedList<
  TagCategoryListItem,
  TagCategoryQuery,
  TagCategoryListResponse
>({
  fetcher: (current, size, query) => getTagCategoryList(current, size, query),
  resolveResponse: response => ({
    records: response.data.data.records,
    total: response.data.data.total,
  }),
  createInitialQuery,
});

const formatTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');
const getSelectionRule = (row: TagCategoryListItem) =>
  row.selectionMode === 1 ? '单选' : `多选，最多 ${row.maxSelectCount} 项`;

const handleSearch = () => {
  void search({
    name: searchForm.value.name?.trim() || undefined,
    code: searchForm.value.code?.trim().toLowerCase() || undefined,
    status: searchForm.value.status,
  });
};

const handleReset = () => {
  searchForm.value = createInitialQuery();
  void reset();
};

const handlePageChange = (nextPage: PaginationChange) => {
  page.value = { ...page.value, ...nextPage };
  void load();
};

const syncSelectedCategory = () => {
  if (!selectedCategory.value) return;
  const latest = data.value.find(item => item.id === selectedCategory.value?.id);
  if (latest) selectedCategory.value = latest;
  else {
    selectedCategory.value = null;
    tagDrawerVisible.value = false;
  }
};

const refreshCategories = async () => {
  await refresh();
  syncSelectedCategory();
};

const openCategoryDialog = (mode: CrudMode, row?: TagCategoryListItem) => {
  categoryDialogMode.value = mode;
  categoryDialogId.value = row?.id;
  categoryDialogVisible.value = true;
};

const handleCategorySaved = () => void refreshCategories();

const openTagDrawer = (row: TagCategoryListItem) => {
  if (!canTagView.value) return;
  selectedCategory.value = row;
  tagDrawerVisible.value = true;
};

const recoverCategoryError = async (error: object) => {
  if (!(error instanceof BladeBusinessError)) return;
  if (error.code === 48101 || error.code === 48112) {
    if (error.code === 48112) ElMessage.warning('数据已变化，已重新加载最新分类列表');
    await refreshCategories();
  }
};

const handleStatusChange = async (row: TagCategoryListItem, enabled: boolean) => {
  if (!canCategoryStatus.value || categoryActionId.value) return;
  const nextStatus = enabled ? 1 : 0;
  if (nextStatus === row.status) return;

  try {
    await ElMessageBox.confirm(
      enabled
        ? '启用分类后，其标签将按自身和祖先状态重新参与有效选项计算。确定继续吗？'
        : '停用分类后，分类内全部标签暂不作为有效选项，标签自身状态不会改变。确定继续吗？',
      `${enabled ? '启用' : '停用'}标签分类`,
      { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
    );
  } catch {
    return;
  }

  categoryActionId.value = row.id;
  try {
    await changeTagCategoryStatus({
      id: row.id,
      status: nextStatus,
      lockVersion: row.lockVersion,
    });
    await refreshCategories();
    ElMessage.success('状态更新成功');
  } catch (error) {
    await recoverCategoryError(error instanceof Error ? error : new Error('状态更新失败'));
  } finally {
    categoryActionId.value = '';
  }
};

const handleDelete = async (row: TagCategoryListItem) => {
  if (!canCategoryDelete.value || categoryActionId.value) return;
  if (row.tagCount > 0) {
    ElMessage.warning('请先删除分类下的全部标签');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定删除分类“${row.categoryName}”吗？删除后该租户内编码不可复用。`,
      '删除标签分类',
      { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
    );
  } catch {
    return;
  }

  categoryActionId.value = row.id;
  try {
    await removeTagCategory({ id: row.id, lockVersion: row.lockVersion });
    await refreshCategories();
    ElMessage.success('删除成功');
  } catch (error) {
    await recoverCategoryError(error instanceof Error ? error : new Error('删除失败'));
  } finally {
    categoryActionId.value = '';
  }
};

onMounted(() => void load());
</script>

<style scoped lang="scss">
.tag-management-page {
  min-width: 0;
}

.tag-category-empty {
  padding: 16px 0 24px;
  text-align: center;
}

:deep(.el-select) {
  width: 100%;
}
</style>
