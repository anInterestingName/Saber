<template>
  <el-dialog
    v-model="visible"
    class="prompt-action-dialog"
    append-to-body
    align-center
    width="560px"
    :title="title"
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    :before-close="handleBeforeClose"
    @closed="resetState"
  >
    <el-alert
      :title="consequenceTitle"
      :type="action === 'disable' ? 'error' : 'warning'"
      :closable="false"
    >
      <template #default>{{ consequence }}</template>
    </el-alert>

    <el-descriptions class="prompt-action-dialog__summary" :column="2" border>
      <el-descriptions-item label="名称">{{ detail?.promptName || '-' }}</el-descriptions-item>
      <el-descriptions-item label="编码">{{ detail?.promptCode || '-' }}</el-descriptions-item>
      <el-descriptions-item label="当前版本">
        {{ detail?.currentVersionNo ? `V${detail.currentVersionNo}` : '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="草稿修订">{{
        detail?.draftRevision || '-'
      }}</el-descriptions-item>
      <el-descriptions-item v-if="action === 'rollback'" label="目标版本">
        {{ targetVersion ? `V${targetVersion.versionNo}` : '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="预计结果">
        {{ nextVersionLabel }}
      </el-descriptions-item>
    </el-descriptions>

    <el-form ref="formRef" :model="form" :rules="formRules" label-position="top">
      <el-form-item :label="noteLabel" prop="note">
        <el-input
          v-model="form.note"
          type="textarea"
          :rows="5"
          maxlength="500"
          show-word-limit
          :disabled="submitting"
          :placeholder="`请输入${noteLabel}`"
        />
      </el-form-item>
    </el-form>

    <el-alert
      v-if="conflict"
      title="目标已被其他用户修改，请关闭后重新发起操作"
      type="error"
      :closable="false"
      show-icon
    />

    <template #footer>
      <div class="prompt-action-dialog__footer">
        <el-button :disabled="submitting" @click="visible = false">取消</el-button>
        <el-button
          :type="action === 'disable' ? 'danger' : 'primary'"
          :loading="submitting"
          :disabled="!detail || submitting"
          @click="confirmAction"
        >
          {{ confirmText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { ElForm, ElMessage, type FormRules } from 'element-plus';
import { BladeBusinessError } from '@/axios';
import {
  disablePrompt,
  publishPrompt,
  rollbackPrompt,
  type PromptDetail,
  type PromptMutation,
  type PromptVersion,
} from '@/api/ai/prompt';

export type PromptAction = 'publish' | 'disable' | 'rollback';

interface PromptActionDialogProps {
  modelValue: boolean;
  action: PromptAction;
  detail: PromptDetail | null;
  targetVersion?: PromptVersion | null;
}

const props = withDefaults(defineProps<PromptActionDialogProps>(), {
  targetVersion: null,
});

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  completed: [mutation: PromptMutation];
}>();

const form = ref({ note: '' });
const formRef = ref<InstanceType<typeof ElForm>>();
const submitting = ref(false);
const conflict = ref(false);

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});
const republish = computed(() => props.action === 'publish' && props.detail?.status === 2);
const title = computed(() => {
  if (props.action === 'disable') return '停用提示词';
  if (props.action === 'rollback') return '回滚提示词版本';
  return republish.value ? '重新发布提示词' : '发布提示词';
});
const confirmText = computed(() => {
  if (props.action === 'disable') return '确认停用';
  if (props.action === 'rollback') return '确认回滚';
  return republish.value ? '确认重新发布' : '确认发布';
});
const noteLabel = computed(() => (props.action === 'disable' ? '停用说明' : '变更说明'));
const nextVersionLabel = computed(() => {
  if (props.action === 'disable') return '状态变为已停用';
  return `生成 V${(props.detail?.currentVersionNo ?? 0) + 1}`;
});
const consequenceTitle = computed(() => {
  if (props.action === 'disable') return '停用会立即影响运行时调用';
  if (props.action === 'rollback') return '回滚会生成新版本';
  return republish.value ? '重新发布会恢复运行时可用' : '发布会切换线上版本';
});
const consequence = computed(() => {
  if (props.action === 'disable') return '新业务调用将失败，提示词详情和历史版本仍会保留。';
  if (props.action === 'rollback') {
    return '目标版本内容将作为新版本发布，当前草稿不会被历史快照覆盖。';
  }
  if (republish.value) return '当前提示词已停用，本次操作会生成新版本并恢复运行时可用。';
  return props.detail?.draftDirty
    ? '当前待发布草稿将生成新版本并成为线上版本。'
    : '当前草稿没有待发布标记，但服务端允许再次发布并生成新版本。';
});

const formRules: FormRules = {
  note: [
    { required: true, message: '请输入操作说明', trigger: 'blur' },
    { max: 500, message: '操作说明不能超过 500 个字符', trigger: 'blur' },
  ],
};

watch(
  () => props.modelValue,
  value => {
    if (value) {
      form.value = { note: '' };
      conflict.value = false;
      void nextTick(() => formRef.value?.clearValidate());
    }
  }
);

const confirmAction = async () => {
  if (!props.detail || !formRef.value || submitting.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  if (props.action === 'rollback' && !props.targetVersion) {
    ElMessage.error('回滚目标版本已失效，请重新选择');
    return;
  }
  const note = form.value.note.trim();
  submitting.value = true;
  conflict.value = false;
  try {
    let response;
    if (props.action === 'disable') {
      response = await disablePrompt({
        id: props.detail.id,
        lockVersion: props.detail.lockVersion,
        disableNote: note,
      });
    } else if (props.action === 'rollback') {
      response = await rollbackPrompt({
        id: props.detail.id,
        targetVersionId: props.targetVersion!.id,
        lockVersion: props.detail.lockVersion,
        changeNote: note,
      });
    } else {
      response = await publishPrompt({
        id: props.detail.id,
        lockVersion: props.detail.lockVersion,
        changeNote: note,
      });
    }
    const mutation = response.data.data;
    visible.value = false;
    ElMessage.success(
      props.action === 'disable'
        ? '提示词已停用'
        : `操作成功${mutation.versionNo ? `，当前版本 V${mutation.versionNo}` : ''}`
    );
    emit('completed', mutation);
  } catch (error) {
    if (error instanceof BladeBusinessError && error.code === 48004) conflict.value = true;
  } finally {
    submitting.value = false;
  }
};

const handleBeforeClose = (done: () => void) => {
  if (!submitting.value) done();
};

const resetState = () => {
  form.value = { note: '' };
  conflict.value = false;
  submitting.value = false;
  formRef.value?.clearValidate();
};
</script>

<style lang="scss">
.prompt-action-dialog {
  max-width: calc(100vw - 32px);
  border-radius: 6px;
  background: var(--saber-surface-elevated);
}

.prompt-action-dialog__summary {
  margin: 18px 0;
}

.prompt-action-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.prompt-action-dialog__footer .el-button + .el-button {
  margin-left: 0;
}
</style>
