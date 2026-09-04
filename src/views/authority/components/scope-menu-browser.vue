<template>
  <div class="scope-menu-browser">
    <search-panel
      :model="searchForm"
      :loading="rootLoading"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="菜单名称">
          <el-input v-model="searchForm.name" clearable placeholder="请输入菜单名称" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-form-item label="菜单编号">
          <el-input v-model="searchForm.code" clearable placeholder="请输入菜单编号" />
        </el-form-item>
      </el-col>
    </search-panel>

    <list-panel :title="title">
      <template #tools>
        <el-tooltip content="刷新" placement="top">
          <el-button
            circle
            :icon="Refresh"
            :loading="rootLoading"
            aria-label="刷新"
            @click="handleRefresh"
          />
        </el-tooltip>
      </template>

      <el-alert
        v-if="rootFailed"
        class="scope-menu-browser__alert"
        title="菜单加载失败，请重试"
        type="error"
        :closable="false"
        show-icon
      >
        <template #default>
          <el-button type="primary" link :icon="Refresh" @click="handleRefresh">
            重新加载
          </el-button>
        </template>
      </el-alert>

      <el-table
        :key="treeVersion"
        ref="tableRef"
        v-loading="rootLoading"
        :data="rootRows"
        row-key="id"
        lazy
        :load="loadChildren"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      >
        <el-table-column type="index" label="#" width="60" align="center" />
        <el-table-column prop="name" label="菜单名称" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="scope-menu-browser__name">
              <i v-if="row.source" :class="row.source" aria-hidden="true" />
              <span>{{ row.name || '-' }}</span>
              <el-tooltip v-if="failedNodeIds.has(String(row.id))" content="重新加载子菜单">
                <el-button
                  class="scope-menu-browser__retry"
                  type="danger"
                  link
                  :icon="Refresh"
                  :loading="retryingNodeIds.has(String(row.id))"
                  aria-label="重新加载子菜单"
                  @click.stop="retryChildren(row as ScopeMenuEntity)"
                />
              </el-tooltip>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="菜单编号" min-width="180" show-overflow-tooltip />
        <el-table-column prop="path" label="路由地址" min-width="220" show-overflow-tooltip />
        <el-table-column prop="sort" label="排序" width="90" align="center" />
        <el-table-column v-if="canConfigure" label="操作" fixed="right" width="130" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              :icon="Setting"
              :disabled="rootLoading || !row.id"
              @click="handleConfigure(row as ScopeMenuEntity)"
            >
              权限配置
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </list-panel>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Refresh, Setting } from '@element-plus/icons-vue';
import type { TableInstance } from 'element-plus';
import SearchPanel from '@/components/search-panel/main.vue';
import ListPanel from '@/components/list-panel/main.vue';
import { getLazyMenuList } from '@/api/system/menu';
import type { TreeNode } from '@/types/tree';

interface ScopeMenuEntity extends TreeNode {
  id: string;
  name?: string;
  code?: string;
  path?: string;
  source?: string;
  sort?: number;
  hasChildren?: boolean;
  children?: ScopeMenuEntity[];
}

interface ScopeMenuQuery {
  name?: string;
  code?: string;
}

interface ScopeMenuBrowserProps {
  title: string;
  canConfigure?: boolean;
}

const props = withDefaults(defineProps<ScopeMenuBrowserProps>(), {
  canConfigure: false,
});

const emit = defineEmits<{
  configure: [menu: ScopeMenuEntity];
}>();

const createInitialQuery = (): ScopeMenuQuery => ({ name: '', code: '' });
const searchForm = ref<ScopeMenuQuery>(createInitialQuery());
const executedQuery = ref<ScopeMenuQuery>({});
const rootRows = ref<ScopeMenuEntity[]>([]);
const rootLoading = ref(false);
const rootFailed = ref(false);
const failedNodeIds = ref(new Set<string>());
const retryingNodeIds = ref(new Set<string>());
const treeVersion = ref(0);
const tableRef = ref<TableInstance>();
let rootRequestId = 0;

const toRequestQuery = (query: ScopeMenuQuery): ScopeMenuQuery => ({
  name: query.name?.trim() || undefined,
  code: query.code?.trim() || undefined,
});

const replaceSetValue = (target: typeof failedNodeIds, value: string, add: boolean) => {
  const next = new Set(target.value);
  if (add) next.add(value);
  else next.delete(value);
  target.value = next;
};

const loadRoot = async () => {
  const request = ++rootRequestId;
  const currentTreeVersion = ++treeVersion.value;
  rootRows.value = [];
  rootFailed.value = false;
  failedNodeIds.value = new Set();
  retryingNodeIds.value = new Set();
  rootLoading.value = true;

  const query = toRequestQuery(executedQuery.value);
  const parentId = query.name || query.code ? '' : 0;
  try {
    const response = await getLazyMenuList<ScopeMenuEntity>(parentId, query);
    if (request !== rootRequestId || currentTreeVersion !== treeVersion.value) return;
    rootRows.value = response.data.data;
  } catch {
    if (request === rootRequestId && currentTreeVersion === treeVersion.value) {
      rootFailed.value = true;
    }
  } finally {
    if (request === rootRequestId && currentTreeVersion === treeVersion.value) {
      rootLoading.value = false;
    }
  }
};

const loadChildren = async (
  row: ScopeMenuEntity,
  _treeNode: object,
  resolve: (rows: ScopeMenuEntity[]) => void
) => {
  const currentTreeVersion = treeVersion.value;
  try {
    const response = await getLazyMenuList<ScopeMenuEntity>(row.id);
    if (currentTreeVersion !== treeVersion.value) {
      resolve([]);
      return;
    }
    replaceSetValue(failedNodeIds, row.id, false);
    resolve(response.data.data);
  } catch {
    if (currentTreeVersion === treeVersion.value) {
      replaceSetValue(failedNodeIds, row.id, true);
    }
    resolve([]);
  }
};

const retryChildren = async (row: ScopeMenuEntity) => {
  const nodeId = String(row.id);
  if (retryingNodeIds.value.has(nodeId)) return;
  const currentTreeVersion = treeVersion.value;
  replaceSetValue(retryingNodeIds, nodeId, true);
  try {
    const response = await getLazyMenuList<ScopeMenuEntity>(row.id);
    if (currentTreeVersion !== treeVersion.value) return;
    tableRef.value?.updateKeyChildren(row.id, response.data.data);
    replaceSetValue(failedNodeIds, nodeId, false);
  } catch {
    if (currentTreeVersion === treeVersion.value) {
      replaceSetValue(failedNodeIds, nodeId, true);
    }
  } finally {
    replaceSetValue(retryingNodeIds, nodeId, false);
  }
};

const handleSearch = () => {
  executedQuery.value = toRequestQuery(searchForm.value);
  void loadRoot();
};

const handleReset = () => {
  searchForm.value = createInitialQuery();
  executedQuery.value = {};
  void loadRoot();
};

const handleRefresh = () => void loadRoot();

const handleConfigure = (menu: ScopeMenuEntity) => {
  if (!props.canConfigure || !menu.id) return;
  emit('configure', { ...menu, children: undefined });
};

onMounted(() => void loadRoot());
onBeforeUnmount(() => {
  rootRequestId += 1;
  treeVersion.value += 1;
});
</script>

<style scoped lang="scss">
.scope-menu-browser {
  min-width: 0;
}

.scope-menu-browser__alert {
  margin-bottom: 16px;
}

.scope-menu-browser__name {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.scope-menu-browser__retry {
  flex: 0 0 auto;
}
</style>
