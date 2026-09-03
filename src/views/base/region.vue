<template>
  <basic-container class="region-page">
    <div class="region-toolbar">
      <el-button
        v-if="canAdd"
        type="primary"
        :icon="Plus"
        :disabled="operationLocked"
        @click="openAddChild"
      >
        新增下级
      </el-button>
      <el-button
        v-if="canDelete"
        type="danger"
        plain
        :icon="Delete"
        :loading="deleting"
        :disabled="submitting"
        @click="handleDelete"
      >
        删除
      </el-button>
      <el-button v-if="canDebug" :icon="VideoPlay" :disabled="operationLocked" @click="openDebug">
        调试
      </el-button>
      <el-tooltip content="重新加载区划树" placement="top">
        <el-button
          circle
          :icon="Refresh"
          :loading="rootLoading"
          :disabled="operationLocked"
          aria-label="重新加载区划树"
          @click="rebuildTree"
        />
      </el-tooltip>
    </div>

    <div class="region-layout">
      <section class="region-tree-panel" aria-label="行政区划树">
        <h2 class="region-section-title">行政区划</h2>
        <el-alert
          v-if="rootFailed"
          class="region-tree-alert"
          title="区划树加载失败"
          type="error"
          :closable="false"
          show-icon
        >
          <template #default>
            <el-button type="primary" link :icon="Refresh" @click="rebuildTree">
              重新加载
            </el-button>
          </template>
        </el-alert>
        <div v-loading="rootLoading" class="region-tree-scroll">
          <el-tree
            v-if="!rootFailed"
            :key="treeVersion"
            ref="treeRef"
            node-key="id"
            lazy
            highlight-current
            :load="loadTreeNode"
            :props="treeProps"
            @node-click="handleNodeClick"
          >
            <template #default="{ data }">
              <span class="region-tree-node">
                <span class="region-tree-node__label">{{ data.title || data.name }}</span>
                <el-tooltip v-if="failedNodeCodes.has(String(data.id))" content="重新加载下级区划">
                  <el-button
                    class="region-tree-node__retry"
                    type="danger"
                    link
                    :icon="Refresh"
                    :loading="retryingNodeCodes.has(String(data.id))"
                    aria-label="重新加载下级区划"
                    @click.stop="retryChildren(data as RegionTreeNode)"
                  />
                </el-tooltip>
              </span>
            </template>
          </el-tree>
        </div>
      </section>

      <section class="region-form-panel" aria-label="行政区划表单">
        <div class="region-form-header">
          <h2 class="region-section-title">区划信息</h2>
          <el-tag :type="modeTagType" effect="plain">{{ modeLabel }}</el-tag>
        </div>

        <el-alert
          v-if="mode === 'idle'"
          class="region-form-alert"
          title="请从左侧选择一项区划"
          type="info"
          :closable="false"
          show-icon
        />
        <el-alert
          v-else-if="mode === 'error'"
          class="region-form-alert"
          title="区划详情加载失败"
          type="error"
          :closable="false"
          show-icon
        >
          <template #default>
            <el-button type="primary" link :icon="Refresh" @click="retryDetail">
              重新加载
            </el-button>
          </template>
        </el-alert>
        <el-alert
          v-if="dictionaryFailed"
          class="region-form-alert"
          title="区划等级加载失败，请在等级字段重试"
          type="error"
          :closable="false"
          show-icon
        />

        <el-form
          ref="formRef"
          v-loading="formLoading"
          :model="form"
          :rules="formRules"
          :disabled="formDisabled"
          label-width="100px"
        >
          <el-form-item label="父区划编号">
            <el-input :model-value="form.parentCode" readonly />
          </el-form-item>
          <el-form-item label="父区划名称">
            <el-input :model-value="form.parentName" readonly />
          </el-form-item>
          <el-form-item v-if="mode === 'add-child'" label="区划子编号" prop="subCode">
            <el-input v-model="form.subCode" maxlength="12">
              <template v-if="codePrefix" #prepend>{{ codePrefix }}</template>
            </el-input>
          </el-form-item>
          <el-form-item label="完整区划编号">
            <el-input :model-value="mode === 'add-child' ? codePreview : form.code" readonly />
          </el-form-item>
          <el-form-item v-if="mode === 'edit'" label="区划子编号">
            <el-input :model-value="form.subCode" readonly />
          </el-form-item>
          <el-form-item label="区划名称" prop="name">
            <el-input v-model="form.name" maxlength="32" show-word-limit />
          </el-form-item>
          <el-form-item label="区划等级" prop="level">
            <dict-select
              :model-value="form.level"
              code="region"
              value-type="number"
              placeholder="请选择区划等级"
              @update:model-value="handleLevelChange"
              @load-error="dictionaryFailed = true"
              @load-success="dictionaryFailed = false"
            />
          </el-form-item>
          <el-form-item label="区划排序" prop="sort">
            <el-input-number v-model="form.sort" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="区划备注" prop="remark">
            <el-input
              v-model="form.remark"
              type="textarea"
              :rows="5"
              maxlength="255"
              show-word-limit
            />
          </el-form-item>
        </el-form>

        <div v-if="mode === 'edit' || mode === 'add-child'" class="region-form-actions">
          <el-button :disabled="operationLocked" @click="handleCancel">取消</el-button>
          <el-button
            type="primary"
            :loading="submitting"
            :disabled="deleting || dictionaryFailed"
            @click="handleSubmit"
          >
            保存
          </el-button>
        </div>
      </section>
    </div>

    <el-dialog
      v-model="debugVisible"
      class="region-debug-dialog"
      title="行政区划数据调试"
      width="480px"
      append-to-body
      align-center
      destroy-on-close
      @closed="clearDebugState"
    >
      <el-form :model="debugForm" label-width="64px">
        <el-form-item label="省份">
          <el-select
            v-model="debugForm.province"
            clearable
            filterable
            :loading="provinceState.loading.value"
            placeholder="请选择省份"
            @change="handleProvinceChange"
          >
            <el-option
              v-for="item in provinceState.options.value"
              :key="item.code"
              :label="item.name"
              :value="item.code"
            />
            <template #empty>
              <el-button
                v-if="provinceState.failed.value"
                type="primary"
                link
                :icon="Refresh"
                @click="provinceState.load('00')"
              >
                重新加载
              </el-button>
              <span v-else>暂无数据</span>
            </template>
          </el-select>
        </el-form-item>
        <el-form-item label="地市">
          <el-select
            v-model="debugForm.city"
            clearable
            filterable
            :disabled="!debugForm.province"
            :loading="cityState.loading.value"
            placeholder="请选择地市"
            @change="handleCityChange"
          >
            <el-option
              v-for="item in cityState.options.value"
              :key="item.code"
              :label="item.name"
              :value="item.code"
            />
            <template #empty>
              <el-button
                v-if="cityState.failed.value && debugForm.province"
                type="primary"
                link
                :icon="Refresh"
                @click="cityState.load(debugForm.province)"
              >
                重新加载
              </el-button>
              <span v-else>暂无数据</span>
            </template>
          </el-select>
        </el-form-item>
        <el-form-item label="区县">
          <el-select
            v-model="debugForm.district"
            clearable
            filterable
            :disabled="!debugForm.city"
            :loading="districtState.loading.value"
            placeholder="请选择区县"
          >
            <el-option
              v-for="item in districtState.options.value"
              :key="item.code"
              :label="item.name"
              :value="item.code"
            />
            <template #empty>
              <el-button
                v-if="districtState.failed.value && debugForm.city"
                type="primary"
                link
                :icon="Refresh"
                @click="districtState.load(debugForm.city)"
              >
                重新加载
              </el-button>
              <span v-else>暂无数据</span>
            </template>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="debugVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </basic-container>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { Delete, Plus, Refresh, VideoPlay } from '@element-plus/icons-vue';
import {
  ElForm,
  ElMessage,
  ElMessageBox,
  ElTree,
  type FormItemRule,
  type FormRules,
  type LoadFunction,
} from 'element-plus';
import { useStore } from 'vuex';
import DictSelect from '@/components/dict-select/main.vue';
import { useRemoteDetail } from '@/composables/useRemoteDetail';
import { useRemoteOptions } from '@/composables/useRemoteOptions';
import { getDetail, getLazyTree, getRegionOptions, remove, submit } from '@/api/base/region';
import { validData } from '@/utils/util';
import type { DictionaryValue } from '@/types/option';
import type { TreeNode } from '@/types/tree';

interface RegionTreeNode extends TreeNode {
  id: string;
  parentId?: string;
  title?: string;
  name?: string;
  hasChildren?: boolean;
  isLeaf?: boolean;
  children?: RegionTreeNode[];
}

interface RegionEntity {
  code: string;
  parentCode: string;
  parentName?: string;
  name: string;
  level: number;
  sort: number;
  remark?: string;
}

interface RegionOption {
  code: string;
  name: string;
}

interface RegionForm extends Partial<RegionEntity> {
  subCode?: string;
}

interface ParentContext {
  code: string;
  name: string;
  level: number;
}

interface DebugForm {
  province?: string;
  city?: string;
  district?: string;
}

type RegionMode = 'idle' | 'loading' | 'edit' | 'add-child' | 'error';

const ROOT_CODE = '00';
const MAX_CODE_LENGTH = 12;
const createInitialForm = (): RegionForm => ({
  code: '',
  parentCode: '',
  parentName: '',
  subCode: '',
  name: '',
  level: undefined,
  sort: undefined,
  remark: '',
});
const createInitialDebugForm = (): DebugForm => ({
  province: undefined,
  city: undefined,
  district: undefined,
});

const store = useStore();
const canAdd = computed(() => validData(store.getters.permission?.region_add, false));
const canDelete = computed(() => validData(store.getters.permission?.region_delete, false));
const canDebug = computed(() => validData(store.getters.permission?.region_debug, false));
const treeRef = ref<InstanceType<typeof ElTree>>();
const formRef = ref<InstanceType<typeof ElForm>>();
const treeVersion = ref(0);
const rootLoading = ref(false);
const rootFailed = ref(false);
const failedNodeCodes = ref(new Set<string>());
const retryingNodeCodes = ref(new Set<string>());
const selectedCode = ref('');
const parentContext = ref<ParentContext>();
const mode = ref<RegionMode>('idle');
const form = ref<RegionForm>(createInitialForm());
const submitting = ref(false);
const deleting = ref(false);
const dictionaryFailed = ref(false);

const treeProps = {
  label: 'title',
  children: 'children',
  isLeaf: 'isLeaf',
};

const detail = useRemoteDetail<RegionEntity, string>(async code => {
  const response = await getDetail<RegionEntity>(code);
  return response.data.data;
});
const { loading: detailLoading } = detail;
const operationLocked = computed(() => submitting.value || deleting.value);
const formLoading = computed(() => mode.value === 'loading' || detailLoading.value);
const formDisabled = computed(
  () =>
    mode.value === 'idle' ||
    mode.value === 'loading' ||
    mode.value === 'error' ||
    operationLocked.value
);
const codePrefix = computed(() =>
  form.value.parentCode === ROOT_CODE ? '' : form.value.parentCode ?? ''
);
const codePreview = computed(() => `${codePrefix.value}${form.value.subCode ?? ''}`);
const modeLabel = computed(() => {
  const labels: { [key in RegionMode]: string } = {
    idle: '待选择',
    loading: '加载中',
    edit: '编辑',
    'add-child': '新增下级',
    error: '加载失败',
  };
  return labels[mode.value];
});
const modeTagType = computed(() => {
  if (mode.value === 'error') return 'danger';
  if (mode.value === 'edit' || mode.value === 'add-child') return 'primary';
  return 'info';
});

const validateSubCode: FormItemRule['validator'] = (_rule, value, callback) => {
  if (mode.value !== 'add-child') {
    callback();
    return;
  }
  const subCode = String(value ?? '');
  if (!subCode) {
    callback(new Error('请输入区划子编号'));
    return;
  }
  if (`${codePrefix.value}${subCode}`.length > MAX_CODE_LENGTH) {
    callback(new Error(`完整区划编号不能超过 ${MAX_CODE_LENGTH} 个字符`));
    return;
  }
  callback();
};

const formRules: FormRules = {
  subCode: [{ validator: validateSubCode, trigger: 'blur' }],
  name: [{ required: true, message: '请输入区划名称', trigger: 'blur' }],
  level: [{ required: true, message: '请选择区划等级', trigger: 'change' }],
  sort: [{ required: true, message: '请输入区划排序', trigger: 'change' }],
};

const replaceSetValue = (target: typeof failedNodeCodes, value: string, add: boolean) => {
  const next = new Set(target.value);
  if (add) next.add(value);
  else next.delete(value);
  target.value = next;
};

const normalizeTreeRows = (rows: RegionTreeNode[]) =>
  rows.map(row => ({
    ...row,
    id: String(row.id),
    isLeaf: !row.hasChildren,
  }));

const loadTreeNode: LoadFunction = async (node, resolve) => {
  const currentTreeVersion = treeVersion.value;
  const isRoot = node.level === 0;
  const parentCode = isRoot ? ROOT_CODE : String((node.data as RegionTreeNode).id);
  if (isRoot) {
    rootLoading.value = true;
    rootFailed.value = false;
  }
  try {
    const response = await getLazyTree<RegionTreeNode>(parentCode);
    if (currentTreeVersion !== treeVersion.value) {
      resolve([]);
      return;
    }
    replaceSetValue(failedNodeCodes, parentCode, false);
    resolve(normalizeTreeRows(response.data.data));
  } catch {
    if (currentTreeVersion === treeVersion.value) {
      if (isRoot) rootFailed.value = true;
      else replaceSetValue(failedNodeCodes, parentCode, true);
    }
    resolve([]);
  } finally {
    if (isRoot && currentTreeVersion === treeVersion.value) rootLoading.value = false;
  }
};

const retryChildren = async (row: RegionTreeNode) => {
  const code = String(row.id);
  if (retryingNodeCodes.value.has(code)) return;
  const currentTreeVersion = treeVersion.value;
  replaceSetValue(retryingNodeCodes, code, true);
  try {
    const response = await getLazyTree<RegionTreeNode>(code);
    if (currentTreeVersion !== treeVersion.value) return;
    treeRef.value?.updateKeyChildren(code, normalizeTreeRows(response.data.data));
    replaceSetValue(failedNodeCodes, code, false);
  } catch {
    if (currentTreeVersion === treeVersion.value) {
      replaceSetValue(failedNodeCodes, code, true);
    }
  } finally {
    replaceSetValue(retryingNodeCodes, code, false);
  }
};

const resolveSubCode = (entity: RegionEntity) => {
  if (entity.parentCode === ROOT_CODE) return entity.code;
  return entity.code.startsWith(entity.parentCode)
    ? entity.code.slice(entity.parentCode.length)
    : entity.code;
};

const toEditForm = (entity: RegionEntity): RegionForm => ({
  ...entity,
  subCode: resolveSubCode(entity),
});

const loadRegionDetail = async (code: string) => {
  selectedCode.value = code;
  parentContext.value = undefined;
  form.value = createInitialForm();
  dictionaryFailed.value = false;
  mode.value = 'loading';
  const entity = await detail.load(code);
  if (selectedCode.value !== code) return;
  if (!entity) {
    mode.value = 'error';
    return;
  }
  form.value = toEditForm(entity);
  mode.value = 'edit';
  await nextTick();
  formRef.value?.clearValidate();
};

const handleNodeClick = (row: RegionTreeNode) => {
  if (operationLocked.value) return;
  void loadRegionDetail(String(row.id));
};

const retryDetail = () => {
  if (selectedCode.value) void loadRegionDetail(selectedCode.value);
};

const openAddChild = () => {
  if (!canAdd.value) return;
  const current = detail.data.value;
  if (mode.value !== 'edit' || !current || current.code !== selectedCode.value) {
    ElMessage.warning('请先选择一项区划');
    return;
  }
  parentContext.value = {
    code: current.code,
    name: current.name,
    level: current.level,
  };
  form.value = {
    ...createInitialForm(),
    parentCode: current.code,
    parentName: current.name,
    level: Math.min(current.level + 1, 5),
  };
  mode.value = 'add-child';
  dictionaryFailed.value = false;
  nextTick(() => formRef.value?.clearValidate());
};

const handleCancel = () => {
  if (operationLocked.value) return;
  if (mode.value === 'add-child' && parentContext.value) {
    const parentCode = parentContext.value.code;
    void loadRegionDetail(parentCode);
    return;
  }
  if (mode.value === 'edit' && detail.data.value) {
    form.value = toEditForm(detail.data.value);
    dictionaryFailed.value = false;
    nextTick(() => formRef.value?.clearValidate());
  }
};

const handleLevelChange = (value: DictionaryValue | DictionaryValue[] | null | undefined) => {
  if (Array.isArray(value) || value === null || value === undefined || value === '') {
    form.value.level = undefined;
    return;
  }
  form.value.level = Number(value);
  dictionaryFailed.value = false;
};

const clearSelectionAndForm = () => {
  detail.clear();
  selectedCode.value = '';
  parentContext.value = undefined;
  form.value = createInitialForm();
  dictionaryFailed.value = false;
  mode.value = 'idle';
  formRef.value?.clearValidate();
};

const rebuildTree = () => {
  if (operationLocked.value) return;
  treeVersion.value += 1;
  rootFailed.value = false;
  failedNodeCodes.value = new Set();
  retryingNodeCodes.value = new Set();
  clearSelectionAndForm();
};

const handleSubmit = async () => {
  if (!formRef.value || submitting.value || deleting.value || dictionaryFailed.value) return;
  if (mode.value !== 'edit' && mode.value !== 'add-child') return;
  if (mode.value === 'add-child' && !canAdd.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  let code = '';
  let parentCode = '';
  if (mode.value === 'add-child') {
    if (!parentContext.value || parentContext.value.code !== selectedCode.value) return;
    code = codePreview.value;
    parentCode = parentContext.value.code;
  } else {
    const current = detail.data.value;
    if (!current || current.code !== selectedCode.value) return;
    code = current.code;
    parentCode = current.parentCode;
  }
  if (!code || code.length > MAX_CODE_LENGTH || form.value.level === undefined) return;

  const payload: RegionEntity = {
    code,
    parentCode,
    name: form.value.name ?? '',
    level: form.value.level,
    sort: form.value.sort ?? 0,
    remark: form.value.remark ?? '',
  };
  submitting.value = true;
  try {
    await submit(payload);
    ElMessage.success('操作成功!');
    submitting.value = false;
    rebuildTree();
  } catch {
    // Axios 已处理接口错误，保留当前树和表单供重试。
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async () => {
  if (!canDelete.value) return;
  const current = detail.data.value;
  if (mode.value !== 'edit' || !current || current.code !== selectedCode.value) {
    ElMessage.warning('请先选择一项区划');
    return;
  }
  const code = current.code;
  try {
    await ElMessageBox.confirm(`确定将 [${current.name}] 数据删除?`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    if (
      !canDelete.value ||
      mode.value !== 'edit' ||
      selectedCode.value !== code ||
      detail.data.value?.code !== code
    ) {
      return;
    }
    deleting.value = true;
    await remove(code);
    ElMessage.success('操作成功!');
    deleting.value = false;
    rebuildTree();
  } catch {
    // 用户取消或接口失败时保留当前选择和表单。
  } finally {
    deleting.value = false;
  }
};

const debugVisible = ref(false);
const debugForm = ref<DebugForm>(createInitialDebugForm());
const provinceState = useRemoteOptions<RegionOption, [string]>(async code => {
  const response = await getRegionOptions<RegionOption>(code);
  return response.data.data;
});
const cityState = useRemoteOptions<RegionOption, [string]>(async code => {
  const response = await getRegionOptions<RegionOption>(code);
  return response.data.data;
});
const districtState = useRemoteOptions<RegionOption, [string]>(async code => {
  const response = await getRegionOptions<RegionOption>(code);
  return response.data.data;
});

const clearDebugState = () => {
  provinceState.clear();
  cityState.clear();
  districtState.clear();
  debugForm.value = createInitialDebugForm();
};

const openDebug = () => {
  if (!canDebug.value || operationLocked.value) return;
  clearDebugState();
  debugVisible.value = true;
  void provinceState.load(ROOT_CODE);
};

const handleProvinceChange = (code?: string) => {
  cityState.clear();
  districtState.clear();
  debugForm.value.city = undefined;
  debugForm.value.district = undefined;
  if (code) void cityState.load(code);
};

const handleCityChange = (code?: string) => {
  districtState.clear();
  debugForm.value.district = undefined;
  if (code) void districtState.load(code);
};

onBeforeUnmount(() => {
  treeVersion.value += 1;
  detail.clear();
  clearDebugState();
});
</script>

<style scoped lang="scss">
.region-page {
  min-width: 0;

  :deep(.basic-container__card) {
    border: 0;
    border-radius: 6px;
    box-shadow: none;
    background: var(--saber-surface);
  }
}

.region-toolbar {
  display: flex;
  min-height: 32px;
  margin-bottom: 18px;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.region-layout {
  display: grid;
  min-width: 0;
  border-top: 1px solid var(--saber-border);
  grid-template-columns: minmax(260px, 32%) minmax(0, 1fr);
}

.region-tree-panel,
.region-form-panel {
  min-width: 0;
  padding-top: 18px;
}

.region-tree-panel {
  padding-right: 20px;
  border-right: 1px solid var(--saber-border);
}

.region-form-panel {
  padding-left: 24px;
}

.region-section-title {
  margin: 0;
  color: var(--saber-text-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 32px;
  letter-spacing: 0;
}

.region-form-header {
  display: flex;
  margin-bottom: 18px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.region-tree-alert,
.region-form-alert {
  margin-bottom: 16px;
}

.region-tree-scroll {
  min-height: 240px;
  max-height: min(680px, calc(100vh - 220px));
  margin-top: 12px;
  overflow: auto;
}

.region-tree-node {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.region-tree-node__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.region-tree-node__retry {
  flex: 0 0 auto;
}

.region-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

:deep(.el-select),
:deep(.el-input-number) {
  width: 100%;
}

@media (max-width: 767px) {
  .region-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .region-tree-panel {
    padding-right: 0;
    padding-bottom: 20px;
    border-right: 0;
    border-bottom: 1px solid var(--saber-border);
  }

  .region-form-panel {
    padding-left: 0;
  }

  .region-tree-scroll {
    max-height: 360px;
  }
}
</style>

<style lang="scss">
.region-debug-dialog {
  display: flex;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  flex-direction: column;
  overflow: hidden;
}

.region-debug-dialog .el-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
</style>
