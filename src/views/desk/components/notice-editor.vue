<template>
  <div class="notice-editor" :style="editorStyle">
    <div v-if="disabled" class="notice-editor__viewer" v-html="safeViewerHtml"></div>
    <div v-else class="notice-editor__shell">
      <el-skeleton v-if="!editorReady && !editorFailed" class="notice-editor__loading" animated />
      <template v-if="!editorFailed">
        <Toolbar
          class="notice-editor__toolbar"
          :editor="editorRef"
          :default-config="toolbarConfig"
          mode="default"
        />
        <Editor
          v-model="editorHtml"
          class="notice-editor__content"
          :default-config="editorConfig"
          mode="default"
          @on-created="handleCreated"
          @on-change="handleChange"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onErrorCaptured, ref, shallowRef, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import '@wangeditor/editor/dist/css/style.css';
import { uploadFile } from '@/api/resource/file';
import { sanitizeNoticeHtml } from '@/utils/noticeHtml';

interface NoticeEditorProps {
  modelValue: string;
  disabled?: boolean;
  rows?: number;
  placeholder?: string;
}

type InsertImage = (src: string, alt: string, href: string) => void;
type InsertVideo = (src: string, poster: string) => void;

const props = withDefaults(defineProps<NoticeEditorProps>(), {
  disabled: false,
  rows: 3,
  placeholder: '请输入通知内容',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  ready: [];
  error: [error: Error];
  uploading: [value: boolean];
}>();

const editorRef = shallowRef<IDomEditor>();
const editorHtml = ref(sanitizeNoticeHtml(props.modelValue));
const editorReady = ref(false);
const editorFailed = ref(false);
const settingExternalValue = ref(false);
const lastEmittedValue = ref('');
const activeUploadCount = ref(0);
let disposed = false;

const editorHeight = computed(() => Math.max(Number(props.rows) * 150, 300));
const editorStyle = computed(() => ({ '--notice-editor-height': `${editorHeight.value}px` }));
const safeViewerHtml = computed(() => sanitizeNoticeHtml(props.modelValue));

const setUploading = (delta: number) => {
  activeUploadCount.value = Math.max(activeUploadCount.value + delta, 0);
  if (!disposed) emit('uploading', activeUploadCount.value > 0);
};

const uploadImage = async (file: File, insert: InsertImage) => {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件');
    return;
  }
  setUploading(1);
  try {
    const result = await uploadFile(file);
    if (!disposed) insert(result.link, result.originalName ?? result.name ?? '', '');
  } catch (error) {
    if (error instanceof Error && error.message === '资源服务未返回文件地址') {
      ElMessage.error(error.message);
    }
  } finally {
    setUploading(-1);
  }
};

const uploadVideo = async (file: File, insert: InsertVideo) => {
  if (!file.type.startsWith('video/')) {
    ElMessage.warning('请选择视频文件');
    return;
  }
  setUploading(1);
  try {
    const result = await uploadFile(file);
    if (!disposed) insert(result.link, '');
  } catch (error) {
    if (error instanceof Error && error.message === '资源服务未返回文件地址') {
      ElMessage.error(error.message);
    }
  } finally {
    setUploading(-1);
  }
};

const editorConfig: Partial<IEditorConfig> = {
  placeholder: props.placeholder,
  autoFocus: false,
  scroll: true,
  customPaste: (editor, event) => {
    const html = event.clipboardData?.getData('text/html');
    if (!html) return true;
    event.preventDefault();
    editor.dangerouslyInsertHtml(sanitizeNoticeHtml(html));
    return false;
  },
  MENU_CONF: {
    uploadImage: {
      allowedFileTypes: ['image/*'],
      customUpload: uploadImage,
    },
    uploadVideo: {
      allowedFileTypes: ['video/*'],
      customUpload: uploadVideo,
    },
  },
};

const toolbarConfig: Partial<IToolbarConfig> = {
  toolbarKeys: [
    'headerSelect',
    'bold',
    'italic',
    'underline',
    'through',
    'color',
    'bgColor',
    'fontSize',
    'bulletedList',
    'numberedList',
    'blockquote',
    'codeBlock',
    'insertLink',
    'uploadImage',
    'uploadVideo',
    'insertTable',
    'sub',
    'sup',
    'clearStyle',
    'undo',
    'redo',
  ],
  modalAppendToBody: true,
};

const handleCreated = (editor: IDomEditor) => {
  if (disposed) {
    editor.destroy();
    return;
  }
  editorRef.value = editor;
  const externalValue = sanitizeNoticeHtml(props.modelValue);
  if (editor.getHtml() !== externalValue) {
    settingExternalValue.value = true;
    editor.setHtml(externalValue);
    void nextTick(() => {
      settingExternalValue.value = false;
    });
  }
  editorReady.value = true;
  editorFailed.value = false;
  emit('ready');
};

const handleChange = (editor: IDomEditor) => {
  if (settingExternalValue.value || disposed) return;
  const nextValue = sanitizeNoticeHtml(editor.getHtml());
  if (nextValue === props.modelValue) return;
  lastEmittedValue.value = nextValue;
  emit('update:modelValue', nextValue);
};

const reportEditorError = (error: unknown) => {
  const normalized = error instanceof Error ? error : new Error('富文本编辑器初始化失败');
  editorReady.value = false;
  editorFailed.value = true;
  editorRef.value?.destroy();
  editorRef.value = undefined;
  emit('error', normalized);
};

onErrorCaptured(error => {
  reportEditorError(error);
  return false;
});

watch(
  () => props.modelValue,
  value => {
    const safeValue = sanitizeNoticeHtml(value);
    if (safeValue === lastEmittedValue.value) {
      lastEmittedValue.value = '';
      return;
    }
    if (editorHtml.value === safeValue && editorRef.value?.getHtml() === safeValue) return;
    settingExternalValue.value = true;
    editorHtml.value = safeValue;
    if (editorRef.value && editorRef.value.getHtml() !== safeValue) {
      editorRef.value.setHtml(safeValue);
    }
    void nextTick(() => {
      settingExternalValue.value = false;
    });
  }
);

onBeforeUnmount(() => {
  if (activeUploadCount.value > 0) emit('uploading', false);
  disposed = true;
  activeUploadCount.value = 0;
  editorRef.value?.destroy();
  editorRef.value = undefined;
});
</script>

<style scoped lang="scss">
.notice-editor {
  min-width: 0;
  min-height: var(--notice-editor-height);
  color: var(--saber-text-primary);
}

.notice-editor__shell {
  position: relative;
  min-height: var(--notice-editor-height);
  border: 1px solid var(--saber-border);
  background: var(--saber-surface-elevated);
}

.notice-editor__loading {
  position: absolute;
  inset: 52px 16px 16px;
  z-index: 2;
  background: var(--saber-surface-elevated);
}

.notice-editor__toolbar {
  position: sticky;
  top: 0;
  z-index: 1;
  border-bottom: 1px solid var(--saber-border);
  overflow-x: auto;
  overflow-y: hidden;
}

.notice-editor__content {
  flex: 0 0 auto;
  height: calc(var(--notice-editor-height) - 42px) !important;
  min-height: 300px;
  overflow-y: auto;
}

:deep(.notice-editor__toolbar .w-e-bar) {
  width: max-content;
  min-width: 100%;
  flex-wrap: nowrap;
}

.notice-editor__viewer {
  min-height: 160px;
  overflow-wrap: anywhere;
  color: var(--saber-text-primary);

  :deep(img),
  :deep(video) {
    max-width: 100%;
    height: auto;
  }

  :deep(table) {
    display: block;
    max-width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
  }

  :deep(th),
  :deep(td) {
    padding: 8px 10px;
    border: 1px solid var(--saber-border);
  }

  :deep(pre) {
    max-width: 100%;
    overflow-x: auto;
    white-space: pre-wrap;
  }
}

:deep(.w-e-toolbar),
:deep(.w-e-text-container) {
  --w-e-toolbar-bg-color: var(--saber-surface-elevated);
  --w-e-toolbar-color: var(--saber-text-primary);
  --w-e-toolbar-border-color: var(--saber-border);
  --w-e-textarea-bg-color: var(--saber-surface-elevated);
  --w-e-textarea-color: var(--saber-text-primary);
  --w-e-textarea-border-color: var(--saber-border);
}

</style>
