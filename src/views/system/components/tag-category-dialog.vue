<template>
  <form-dialog
    v-model="visible"
    :mode="internalMode"
    entity-name="标签分类"
    :loading="detailLoading"
    :submitting="submitting"
    :confirm-disabled="loadFailed || !canSaveCurrentMode"
    :width="internalMode === 'view' ? '800px' : '640px'"
    destroy-on-close
    @confirm="handleSubmit"
    @cancel="resetDialog"
  >
    <el-result
      v-if="loadFailed"
      icon="error"
      title="分类详情加载失败"
      sub-title="旧详情已清空，请重新加载后继续"
    >
      <template #extra>
        <el-button type="primary" :disabled="!localCategoryId" @click="loadDetail">
          重新加载
        </el-button>
      </template>
    </el-result>

    <template v-else-if="internalMode === 'view'">
      <section v-if="detailData" class="tag-category-detail" aria-label="标签分类详情">
        <dl class="tag-category-detail__grid">
          <div class="tag-category-detail__item">
            <dt>分类名称</dt>
            <dd>{{ detailData.categoryName }}</dd>
          </div>
          <div class="tag-category-detail__item">
            <dt>分类编码</dt>
            <dd><code>{{ detailData.categoryCode }}</code></dd>
          </div>
          <div class="tag-category-detail__item">
            <dt>选择规则</dt>
            <dd>{{ selectionRuleText }}</dd>
          </div>
          <div class="tag-category-detail__item">
            <dt>状态</dt>
            <dd>
              <el-tag :type="detailData.status === 1 ? 'success' : 'info'" effect="light">
                {{ detailData.statusName || (detailData.status === 1 ? '启用' : '停用') }}
              </el-tag>
            </dd>
          </div>
          <div class="tag-category-detail__item">
            <dt>标签数量</dt>
            <dd>{{ detailData.tagCount }}</dd>
          </div>
          <div class="tag-category-detail__item">
            <dt>排序</dt>
            <dd>{{ detailData.sort }}</dd>
          </div>
          <div class="tag-category-detail__item">
            <dt>创建时间</dt>
            <dd>{{ formatTime(detailData.createTime) }}</dd>
          </div>
          <div class="tag-category-detail__item">
            <dt>更新时间</dt>
            <dd>{{ formatTime(detailData.updateTime) }}</dd>
          </div>
          <div class="tag-category-detail__item tag-category-detail__item--remark">
            <dt>说明</dt>
            <dd>{{ detailData.remark || '-' }}</dd>
          </div>
        </dl>
      </section>
    </template>

    <el-form
      v-else
      ref="formRef"
      :model="form"
      :rules="formRules"
      :disabled="detailLoading || loadFailed"
      label-width="92px"
      status-icon
    >
      <el-alert
        v-if="conflict"
        class="tag-category-dialog__alert"
        type="error"
        title="分类已被其他操作修改，本地输入已保留"
        :closable="false"
        show-icon
      >
        <template #default>
          请重新加载最新详情后再编辑；重新加载会替换当前输入。
          <el-button type="primary" link @click="loadDetail">重新加载最新详情</el-button>
        </template>
      </el-alert>

      <el-form-item label="分类名称" prop="categoryName">
        <el-input v-model="form.categoryName" maxlength="100" placeholder="请输入分类名称" />
      </el-form-item>
      <el-form-item label="分类编码" prop="categoryCode">
        <el-input
          v-model="form.categoryCode"
          :disabled="internalMode !== 'add'"
          maxlength="64"
          placeholder="小写字母开头，可包含数字和下划线"
          @blur="normalizeCode"
        />
      </el-form-item>
      <el-form-item label="选择模式" prop="selectionMode">
        <el-segmented v-model="form.selectionMode" :options="selectionOptions" />
      </el-form-item>
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12">
          <el-form-item label="最大选择数" prop="maxSelectCount">
            <el-input-number
              v-model="form.maxSelectCount"
              :min="1"
              :max="100"
              :precision="0"
              :disabled="form.selectionMode === 1"
              controls-position="right"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="排序" prop="sort">
            <el-input-number
              v-model="form.sort"
              :min="0"
              :precision="0"
              controls-position="right"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="说明" prop="remark">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
          placeholder="请输入分类说明"
        />
      </el-form-item>
    </el-form>
  </form-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { ElForm, ElMessage, type FormRules } from 'element-plus';
import FormDialog from '@/components/form-dialog/main.vue';
import { BladeBusinessError } from '@/axios';
import { useRemoteDetail } from '@/composables/useRemoteDetail';
import {
  createTagCategory,
  getTagCategoryDetail,
  updateTagCategory,
  type TagCategoryDetail,
  type TagSelectionMode,
} from '@/api/system/tag';
import type { CrudMode } from '@/types/crud';

interface TagCategoryDialogProps {
  modelValue: boolean;
  mode: CrudMode;
  categoryId?: string;
  canCreate?: boolean;
  canEdit?: boolean;
}

interface CategoryForm {
  id?: string;
  categoryCode: string;
  categoryName: string;
  selectionMode: TagSelectionMode;
  maxSelectCount: number;
  sort: number;
  remark: string;
  lockVersion?: string;
}

const props = withDefaults(defineProps<TagCategoryDialogProps>(), {
  categoryId: undefined,
  canCreate: false,
  canEdit: false,
});

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  saved: [];
}>();

const createInitialForm = (): CategoryForm => ({
  categoryCode: '',
  categoryName: '',
  selectionMode: 1,
  maxSelectCount: 1,
  sort: 0,
  remark: '',
});

const form = ref<CategoryForm>(createInitialForm());
const internalMode = ref<CrudMode>('add');
const localCategoryId = ref('');
const submitting = ref(false);
const conflict = ref(false);
const formRef = ref<InstanceType<typeof ElForm>>();
const selectionOptions = [
  { label: '单选', value: 1 },
  { label: '多选', value: 2 },
];

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});
const canSaveCurrentMode = computed(() =>
  internalMode.value === 'add' ? props.canCreate : props.canEdit
);

const detail = useRemoteDetail<TagCategoryDetail, string>(async id => {
  const response = await getTagCategoryDetail(id);
  return response.data.data;
});
const { data: detailData, loading: detailLoading, failed: loadFailed } = detail;
const selectionRuleText = computed(() => {
  if (!detailData.value) return '-';
  return detailData.value.selectionMode === 1
    ? '单选'
    : `多选，最多 ${detailData.value.maxSelectCount} 项`;
});

const validateCode = (_rule: object, value: string, callback: (error?: Error) => void) => {
  if (!value) callback(new Error('请输入分类编码'));
  else if (!/^[a-z][a-z0-9_]{0,63}$/.test(value.trim().toLowerCase())) {
    callback(new Error('编码需以小写字母开头，仅包含小写字母、数字和下划线'));
  } else callback();
};

const formRules: FormRules = {
  categoryName: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { max: 100, message: '分类名称不能超过 100 个字符', trigger: 'blur' },
  ],
  categoryCode: [{ validator: validateCode, trigger: 'blur' }],
  selectionMode: [{ required: true, message: '请选择选择模式', trigger: 'change' }],
  maxSelectCount: [{ required: true, message: '请输入最大选择数', trigger: 'change' }],
  sort: [{ required: true, message: '请输入排序', trigger: 'change' }],
};

watch(
  () => form.value.selectionMode,
  selectionMode => {
    if (selectionMode === 1) form.value.maxSelectCount = 1;
  }
);

const formatTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');
const normalizeCode = () => {
  form.value.categoryCode = form.value.categoryCode.trim().toLowerCase();
};
const applyDetail = (value: TagCategoryDetail) => {
  form.value = {
    id: value.id,
    categoryCode: value.categoryCode,
    categoryName: value.categoryName,
    selectionMode: value.selectionMode,
    maxSelectCount: value.maxSelectCount,
    sort: value.sort,
    remark: value.remark ?? '',
    lockVersion: value.lockVersion,
  };
};

const loadDetail = async () => {
  if (!localCategoryId.value) return;
  conflict.value = false;
  const value = await detail.load(localCategoryId.value);
  if (value) applyDetail(value);
  await nextTick(() => formRef.value?.clearValidate());
};

const prepareDialog = () => {
  resetDialog();
  internalMode.value = props.mode;
  localCategoryId.value = props.categoryId ?? '';
  if (internalMode.value !== 'add') void loadDetail();
  else void nextTick(() => formRef.value?.clearValidate());
};

watch(
  () => props.modelValue,
  value => {
    if (value) prepareDialog();
    else resetDialog();
  }
);

const handleSubmit = async () => {
  if (!formRef.value || submitting.value || !canSaveCurrentMode.value) return;
  form.value.categoryName = form.value.categoryName.trim();
  normalizeCode();
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  conflict.value = false;
  try {
    const remark = form.value.remark.trim() || undefined;
    if (internalMode.value === 'add') {
      await createTagCategory({
        categoryCode: form.value.categoryCode,
        categoryName: form.value.categoryName,
        selectionMode: form.value.selectionMode,
        maxSelectCount: form.value.maxSelectCount,
        sort: form.value.sort,
        remark,
      });
    } else if (form.value.id && form.value.lockVersion) {
      await updateTagCategory({
        id: form.value.id,
        categoryName: form.value.categoryName,
        selectionMode: form.value.selectionMode,
        maxSelectCount: form.value.maxSelectCount,
        sort: form.value.sort,
        remark,
        lockVersion: form.value.lockVersion,
      });
    }
    ElMessage.success('保存成功');
    emit('saved');
    visible.value = false;
  } catch (error) {
    if (error instanceof BladeBusinessError && error.code === 48112) conflict.value = true;
  } finally {
    submitting.value = false;
  }
};

function resetDialog() {
  detail.clear();
  form.value = createInitialForm();
  internalMode.value = 'add';
  localCategoryId.value = '';
  submitting.value = false;
  conflict.value = false;
  formRef.value?.clearValidate();
}
</script>

<style scoped lang="scss">
.tag-category-dialog__alert {
  margin-bottom: 20px;
}

.tag-category-detail__grid {
  display: grid;
  padding: 0;
  margin: 0;
  gap: 14px 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.tag-category-detail__item {
  display: grid;
  min-height: 64px;
  overflow: hidden;
  border: 1px solid var(--saber-border);
  border-radius: 6px;
  background: var(--saber-surface);
  grid-template-columns: 112px minmax(0, 1fr);

  dt,
  dd {
    display: flex;
    min-width: 0;
    align-items: center;
    padding: 14px 16px;
    margin: 0;
    line-height: 1.6;
  }

  dt {
    border-right: 1px solid var(--saber-border);
    color: var(--saber-text-secondary);
    background: var(--saber-surface-muted);
    font-weight: 600;
  }

  dd {
    color: var(--saber-text-primary);
    overflow-wrap: anywhere;
  }

  code {
    color: var(--saber-text-primary);
  }
}

.tag-category-detail__item--remark {
  min-height: 112px;
  grid-column: 1 / -1;
  grid-template-columns: 1fr;

  dt {
    padding-bottom: 8px;
    border-right: 0;
  }

  dd {
    align-items: flex-start;
    padding-top: 12px;
    white-space: pre-wrap;
  }
}

:deep(.el-input-number),
:deep(.el-segmented) {
  width: 100%;
}

@media (max-width: 767px) {
  .tag-category-detail__grid {
    grid-template-columns: 1fr;
  }

  .tag-category-detail__item--remark {
    grid-column: auto;
  }
}

@media (max-width: 479px) {
  .tag-category-detail__item {
    grid-template-columns: 96px minmax(0, 1fr);

    dt,
    dd {
      padding-right: 12px;
      padding-left: 12px;
    }
  }

  .tag-category-detail__item--remark {
    grid-template-columns: 1fr;
  }
}
</style>
