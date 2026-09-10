<template>
  <form-dialog
    v-model="visible"
    :mode="internalMode"
    entity-name="标签"
    :loading="detailLoading"
    :submitting="submitting"
    :confirm-disabled="loadFailed || !treeReady || !canSaveCurrentMode"
    width="640px"
    destroy-on-close
    @confirm="handleSubmit"
    @cancel="resetDialog"
  >
    <el-result
      v-if="loadFailed"
      icon="error"
      title="标签详情加载失败"
      sub-title="旧详情已清空，请重新加载后继续"
    >
      <template #extra>
        <el-button type="primary" :disabled="!localTagId" @click="loadDetail"> 重新加载 </el-button>
      </template>
    </el-result>

    <template v-else-if="internalMode === 'view'">
      <el-descriptions v-if="detailData" :column="2" border>
        <el-descriptions-item label="标签名称">{{ detailData.tagName }}</el-descriptions-item>
        <el-descriptions-item label="标签编码">
          <code>{{ detailData.tagCode }}</code>
        </el-descriptions-item>
        <el-descriptions-item label="所属分类">{{ categoryName }}</el-descriptions-item>
        <el-descriptions-item label="父标签">{{ parentName }}</el-descriptions-item>
        <el-descriptions-item label="层级">第 {{ detailData.depth }} 级</el-descriptions-item>
        <el-descriptions-item label="排序">{{ detailData.sort }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="detailData.status === 1 ? 'success' : 'info'">
            {{ detailData.statusName || (detailData.status === 1 ? '启用' : '停用') }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">{{
          formatTime(detailData.updateTime)
        }}</el-descriptions-item>
        <el-descriptions-item label="说明" :span="2">{{
          detailData.remark || '-'
        }}</el-descriptions-item>
      </el-descriptions>
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
        v-if="!treeReady"
        class="tag-editor-dialog__alert"
        type="error"
        title="完整标签树未加载成功，当前不能提交层级变更"
        :closable="false"
        show-icon
      />
      <el-alert
        v-if="conflict"
        class="tag-editor-dialog__alert"
        type="error"
        title="标签已被其他操作修改，本地输入已保留"
        :closable="false"
        show-icon
      >
        <template #default>
          请重新加载最新详情后再编辑；重新加载会替换当前输入。
          <el-button type="primary" link @click="loadDetail">重新加载最新详情</el-button>
        </template>
      </el-alert>

      <el-form-item label="所属分类">
        <el-input :model-value="`${categoryName} (${categoryCode})`" disabled />
      </el-form-item>
      <el-form-item label="标签名称" prop="tagName">
        <el-input v-model="form.tagName" maxlength="100" placeholder="请输入标签名称" />
      </el-form-item>
      <el-form-item label="标签编码" prop="tagCode">
        <el-input
          v-model="form.tagCode"
          :disabled="internalMode !== 'add'"
          maxlength="64"
          placeholder="小写字母开头，可包含数字和下划线"
          @blur="normalizeCode"
        />
      </el-form-item>
      <el-form-item label="父标签" prop="parentId">
        <el-tree-select
          v-model="form.parentId"
          :data="parentOptions"
          node-key="value"
          check-strictly
          filterable
          default-expand-all
          :render-after-expand="false"
          placeholder="请选择父标签"
        />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number
          v-model="form.sort"
          :min="0"
          :precision="0"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="说明" prop="remark">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
          placeholder="请输入标签说明"
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
  createTag,
  getTagDetail,
  updateTag,
  type TagDetail,
  type TagTreeNode,
} from '@/api/system/tag';
import type { CrudMode } from '@/types/crud';
import { collectDescendantIds, findTagNode, mapTagTreeSelectOptions } from '../tagTree';

interface TagEditorDialogProps {
  modelValue: boolean;
  mode: CrudMode;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  tagId?: string;
  parentId?: string;
  tree: TagTreeNode[];
  treeReady: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
}

interface TagForm {
  id?: string;
  parentId: string;
  tagCode: string;
  tagName: string;
  sort: number;
  remark: string;
  lockVersion?: string;
}

const props = withDefaults(defineProps<TagEditorDialogProps>(), {
  tagId: undefined,
  parentId: '0',
  canCreate: false,
  canEdit: false,
});

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  saved: [];
}>();

const createInitialForm = (): TagForm => ({
  parentId: props.parentId || '0',
  tagCode: '',
  tagName: '',
  sort: 0,
  remark: '',
});

const form = ref<TagForm>(createInitialForm());
const internalMode = ref<CrudMode>('add');
const localTagId = ref('');
const submitting = ref(false);
const conflict = ref(false);
const formRef = ref<InstanceType<typeof ElForm>>();

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});
const canSaveCurrentMode = computed(() =>
  internalMode.value === 'add' ? props.canCreate : props.canEdit
);
const disabledParentIds = computed(() => {
  const ids = localTagId.value
    ? collectDescendantIds(props.tree, localTagId.value)
    : new Set<string>();
  if (localTagId.value) ids.add(localTagId.value);
  return ids;
});
const parentOptions = computed(() => [
  {
    value: '0',
    label: '顶级标签',
    children: mapTagTreeSelectOptions(props.tree, disabledParentIds.value),
  },
]);

const detail = useRemoteDetail<TagDetail, string>(async id => {
  const response = await getTagDetail(id);
  return response.data.data;
});
const { data: detailData, loading: detailLoading, failed: loadFailed } = detail;
const parentName = computed(() => {
  if (!detailData.value || detailData.value.parentId === '0') return '顶级标签';
  return findTagNode(props.tree, detailData.value.parentId)?.tagName ?? '未知父标签';
});

const validateCode = (_rule: object, value: string, callback: (error?: Error) => void) => {
  if (!value) callback(new Error('请输入标签编码'));
  else if (!/^[a-z][a-z0-9_]{0,63}$/.test(value.trim().toLowerCase())) {
    callback(new Error('编码需以小写字母开头，仅包含小写字母、数字和下划线'));
  } else callback();
};

const formRules: FormRules = {
  tagName: [
    { required: true, message: '请输入标签名称', trigger: 'blur' },
    { max: 100, message: '标签名称不能超过 100 个字符', trigger: 'blur' },
  ],
  tagCode: [{ validator: validateCode, trigger: 'blur' }],
  parentId: [{ required: true, message: '请选择父标签', trigger: 'change' }],
  sort: [{ required: true, message: '请输入排序', trigger: 'change' }],
};

const formatTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');
const normalizeCode = () => {
  form.value.tagCode = form.value.tagCode.trim().toLowerCase();
};
const applyDetail = (value: TagDetail) => {
  form.value = {
    id: value.id,
    parentId: value.parentId || '0',
    tagCode: value.tagCode,
    tagName: value.tagName,
    sort: value.sort,
    remark: value.remark ?? '',
    lockVersion: value.lockVersion,
  };
};

const loadDetail = async () => {
  if (!localTagId.value) return;
  conflict.value = false;
  const value = await detail.load(localTagId.value);
  if (value) applyDetail(value);
  await nextTick(() => formRef.value?.clearValidate());
};

const prepareDialog = () => {
  resetDialog();
  internalMode.value = props.mode;
  localTagId.value = props.tagId ?? '';
  form.value = createInitialForm();
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
  if (!formRef.value || submitting.value || !props.treeReady || !canSaveCurrentMode.value) return;
  form.value.tagName = form.value.tagName.trim();
  normalizeCode();
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  conflict.value = false;
  try {
    const remark = form.value.remark.trim() || undefined;
    if (internalMode.value === 'add') {
      await createTag({
        categoryId: props.categoryId,
        parentId: form.value.parentId || '0',
        tagCode: form.value.tagCode,
        tagName: form.value.tagName,
        sort: form.value.sort,
        remark,
      });
    } else if (form.value.id && form.value.lockVersion) {
      await updateTag({
        id: form.value.id,
        parentId: form.value.parentId || '0',
        tagName: form.value.tagName,
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
  localTagId.value = '';
  submitting.value = false;
  conflict.value = false;
  formRef.value?.clearValidate();
}
</script>

<style scoped lang="scss">
.tag-editor-dialog__alert {
  margin-bottom: 20px;
}

:deep(.el-input-number),
:deep(.el-tree-select) {
  width: 100%;
}
</style>
