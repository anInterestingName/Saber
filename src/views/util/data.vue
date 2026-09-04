<template>
  <basic-container>
    <div class="capability-page">
      <header class="capability-page__header">
        <div>
          <h2>平台能力矩阵</h2>
          <p>按使用场景查看当前前端能力及适用边界。</p>
        </div>
        <el-segmented v-model="activeGroup" :options="groupOptions" />
      </header>

      <div class="capability-page__content">
        <section class="capability-page__table" aria-label="能力列表">
          <el-table :data="visibleItems" row-key="name">
            <el-table-column prop="name" label="能力名称" min-width="180" />
            <el-table-column prop="scope" label="适用范围" min-width="260" />
            <el-table-column label="状态" width="96" align="center">
              <template #default="{ row }">
                <el-tag :type="statusType[row.status]" effect="light">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </section>

        <aside class="capability-page__summary" aria-label="分组摘要">
          <h3>{{ activeSummary.title }}</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="定位">{{ activeSummary.purpose }}</el-descriptions-item>
            <el-descriptions-item label="可用能力">
              {{ statusCount.available }} 项
            </el-descriptions-item>
            <el-descriptions-item label="规划能力">
              {{ statusCount.planned }} 项
            </el-descriptions-item>
            <el-descriptions-item label="受限能力">
              {{ statusCount.restricted }} 项
            </el-descriptions-item>
          </el-descriptions>
          <el-alert
            class="capability-page__note"
            :title="activeSummary.note"
            type="info"
            :closable="false"
            show-icon
          />
        </aside>
      </div>
    </div>
  </basic-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { TagProps } from 'element-plus';

type CapabilityGroup = '基础能力' | '协作能力' | '治理能力';
type CapabilityStatus = '可用' | '规划' | '受限';

interface CapabilityItem {
  group: CapabilityGroup;
  name: string;
  scope: string;
  status: CapabilityStatus;
}

interface CapabilitySummary {
  title: string;
  purpose: string;
  note: string;
}

const groupOptions: CapabilityGroup[] = ['基础能力', '协作能力', '治理能力'];
const activeGroup = ref<CapabilityGroup>('基础能力');
const items: CapabilityItem[] = [
  {
    group: '基础能力',
    name: '动态菜单与路由',
    scope: '服务端菜单、站内页面、外链与标签页导航',
    status: '可用',
  },
  {
    group: '基础能力',
    name: '响应式工作区',
    scope: '桌面、平板和移动端管理页面',
    status: '可用',
  },
  {
    group: '基础能力',
    name: '离线业务缓存',
    scope: '需要跨会话保存业务数据的页面',
    status: '受限',
  },
  {
    group: '协作能力',
    name: '国际化标题',
    scope: '菜单、标签页和浏览器标题联动',
    status: '可用',
  },
  {
    group: '协作能力',
    name: '文件上传与下载',
    scope: '使用现有认证与资源服务的业务流程',
    status: '可用',
  },
  {
    group: '协作能力',
    name: '实时协同编辑',
    scope: '多人同时编辑同一业务记录',
    status: '规划',
  },
  {
    group: '治理能力',
    name: '按钮权限',
    scope: '菜单按钮显示与服务端最终授权',
    status: '可用',
  },
  {
    group: '治理能力',
    name: '租户隔离',
    scope: '由后端租户上下文控制的数据访问',
    status: '可用',
  },
  {
    group: '治理能力',
    name: '客户端安全审计',
    scope: '浏览器侧完整操作留痕与集中分析',
    status: '规划',
  },
];

const summaries: Record<CapabilityGroup, CapabilitySummary> = {
  基础能力: {
    title: '基础能力',
    purpose: '支撑菜单导航、页面布局和通用交互。',
    note: '示例仅展示本地数据，不会发起业务写请求。',
  },
  协作能力: {
    title: '协作能力',
    purpose: '覆盖国际化、资源流转和跨角色协作场景。',
    note: '文件能力需由现有后端资源服务与账号权限共同提供。',
  },
  治理能力: {
    title: '治理能力',
    purpose: '呈现权限、租户和安全边界的当前状态。',
    note: '前端权限只控制交互入口，服务端仍是最终安全边界。',
  },
};

const statusType: Record<CapabilityStatus, TagProps['type']> = {
  可用: 'success',
  规划: 'info',
  受限: 'warning',
};

const visibleItems = computed(() => items.filter(item => item.group === activeGroup.value));
const activeSummary = computed(() => summaries[activeGroup.value]);
const statusCount = computed(() => ({
  available: visibleItems.value.filter(item => item.status === '可用').length,
  planned: visibleItems.value.filter(item => item.status === '规划').length,
  restricted: visibleItems.value.filter(item => item.status === '受限').length,
}));
</script>

<style scoped lang="scss">
.capability-page {
  min-width: 0;
}

.capability-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--saber-border);

  h2,
  p {
    margin: 0;
  }

  h2 {
    color: var(--saber-text-primary);
    font-size: 20px;
    line-height: 28px;
  }

  p {
    margin-top: 4px;
    color: var(--saber-text-secondary);
    line-height: 22px;
  }
}

.capability-page__content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 24px;
  padding-top: 20px;
}

.capability-page__table {
  min-width: 0;
  overflow-x: auto;
}

.capability-page__summary {
  min-width: 0;

  h3 {
    margin: 0 0 12px;
    color: var(--saber-text-primary);
    font-size: 16px;
    line-height: 24px;
  }
}

.capability-page__note {
  margin-top: 16px;
}

@media (max-width: 1100px) {
  .capability-page__content {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 767px) {
  .capability-page__header {
    align-items: stretch;
    flex-direction: column;
  }

  :deep(.el-segmented) {
    width: 100%;
  }
}
</style>
