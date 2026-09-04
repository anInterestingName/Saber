<template>
  <div class="icon-select" :class="{ 'has-clear': clearable && modelValue && !disabled }">
    <el-popover
      ref="popoverRef"
      placement="bottom-start"
      popper-class="icon-select__popper"
      :width="360"
      :disabled="disabled"
      trigger="click"
      @before-enter="handleBeforeEnter"
      @after-enter="handleAfterEnter"
      @before-leave="handleBeforeLeave"
      @after-leave="handleAfterLeave"
    >
      <template #reference>
        <button
          ref="triggerRef"
          type="button"
          class="icon-select__trigger"
          :disabled="disabled"
          aria-haspopup="dialog"
          :aria-expanded="expanded"
          :aria-label="modelValue ? `当前图标 ${modelValue}，打开图标选择器` : '打开图标选择器'"
        >
          <i v-if="modelValue" :class="modelValue" aria-hidden="true" />
          <span class="icon-select__value">{{ modelValue || placeholder }}</span>
        </button>
      </template>

      <div role="dialog" aria-label="选择图标" @keydown.esc.prevent.stop="handleEscape">
        <el-input
          ref="searchInputRef"
          v-model="keyword"
          clearable
          :prefix-icon="Search"
          placeholder="搜索图标"
          aria-label="搜索图标"
        />
        <div class="icon-select__content">
          <template v-for="group in filteredGroups" :key="group.label">
            <div class="icon-select__group-title">{{ group.label }}</div>
            <div class="icon-select__grid">
              <el-tooltip
                v-for="icon in group.list"
                :key="icon"
                :content="icon"
                placement="top"
                :trigger-keys="[]"
              >
                <button
                  type="button"
                  class="icon-select__option"
                  :class="{ 'is-active': icon === modelValue }"
                  :aria-label="icon"
                  :aria-pressed="icon === modelValue"
                  @click="handleSelect(icon)"
                >
                  <i :class="icon" aria-hidden="true" />
                </button>
              </el-tooltip>
            </div>
          </template>
          <el-empty
            v-if="filteredGroups.length === 0"
            :image-size="56"
            description="暂无匹配图标"
          />
        </div>
      </div>
    </el-popover>

    <el-tooltip
      v-if="clearable && modelValue && !disabled"
      content="清空图标"
      placement="top"
      :trigger-keys="[]"
    >
      <el-button
        class="icon-select__clear"
        text
        circle
        :icon="CircleClose"
        aria-label="清空图标"
        @click.stop="handleClear"
      />
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { CircleClose, Search } from '@element-plus/icons-vue';
import { ElInput, ElPopover } from 'element-plus';
import iconList from '@/config/iconList';

interface IconSelectProps {
  modelValue?: string;
  disabled?: boolean;
  clearable?: boolean;
  placeholder?: string;
}

const props = withDefaults(defineProps<IconSelectProps>(), {
  modelValue: '',
  disabled: false,
  clearable: true,
  placeholder: '请选择图标',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const popoverRef = ref<InstanceType<typeof ElPopover>>();
const searchInputRef = ref<InstanceType<typeof ElInput>>();
const triggerRef = ref<HTMLButtonElement>();
const expanded = ref(false);
const keyword = ref('');
const filteredGroups = computed(() => {
  const searchValue = keyword.value.trim().toLowerCase();
  if (!searchValue) return iconList;

  return iconList
    .map(group => ({
      ...group,
      list: group.label.toLowerCase().includes(searchValue)
        ? group.list
        : group.list.filter(icon => icon.toLowerCase().includes(searchValue)),
    }))
    .filter(group => group.list.length > 0);
});

const focusTrigger = () => {
  nextTick(() => triggerRef.value?.focus({ preventScroll: true }));
};
const closePopover = () => {
  popoverRef.value?.hide();
};
const handleBeforeEnter = () => {
  expanded.value = true;
};
const handleAfterEnter = () => {
  searchInputRef.value?.focus();
};
const handleBeforeLeave = () => {
  expanded.value = false;
};
const handleAfterLeave = () => {
  keyword.value = '';
};
const handleEscape = () => {
  closePopover();
  focusTrigger();
};

const handleSelect = (icon: string) => {
  emit('update:modelValue', icon);
  closePopover();
  focusTrigger();
};

const handleClear = () => {
  emit('update:modelValue', '');
  closePopover();
  keyword.value = '';
  focusTrigger();
};
</script>

<style scoped lang="scss">
.icon-select {
  position: relative;
  width: 100%;
}

.icon-select__trigger {
  display: flex;
  width: 100%;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid var(--saber-border);
  border-radius: var(--el-input-border-radius, 4px);
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font: inherit;
  text-align: left;
  color: var(--saber-text-primary);
  background: var(--saber-surface);

  &:hover:not(:disabled) {
    border-color: var(--el-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary-light-5);
    outline-offset: 1px;
  }

  &:disabled {
    cursor: not-allowed;
    background: var(--el-disabled-bg-color);
    color: var(--el-disabled-text-color);
  }
}

.icon-select.has-clear .icon-select__trigger {
  padding-right: 36px;
}

.icon-select__clear {
  position: absolute;
  z-index: 1;
  top: 50%;
  right: 4px;
  width: 24px;
  height: 24px;
  transform: translateY(-50%);
}

.icon-select__value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--saber-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-select__content {
  max-height: min(50vh, 420px);
  margin-top: 12px;
  overflow: auto;
}

.icon-select__group-title {
  margin: 12px 0 8px;
  color: var(--saber-text-primary);
  font-size: 13px;
  font-weight: 600;
}

.icon-select__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 36px);
  gap: 6px;
}

.icon-select__option {
  display: inline-flex;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--saber-border);
  border-radius: 4px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--saber-text-secondary);
  background: var(--saber-surface);

  &:hover,
  &.is-active {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary-light-5);
    outline-offset: 1px;
  }
}

@media (max-width: 767px) {
  .icon-select__content {
    max-height: min(36vh, 300px);
  }
}
</style>

<style lang="scss">
.icon-select__popper {
  max-width: calc(100vw - 32px);
}
</style>
