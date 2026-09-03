<template>
  <el-select
    v-bind="$attrs"
    class="dict-select"
    :model-value="modelValue"
    :placeholder="placeholder"
    :clearable="clearable"
    :disabled="disabled"
    :multiple="multiple"
    :filterable="filterable"
    :loading="loading"
    @update:model-value="handleChange"
  >
    <el-option
      v-for="item in normalizedItems"
      :key="item.dictKey"
      :label="item.dictValue"
      :value="item.dictKey"
    />
    <template #empty>
      <el-button v-if="failed" type="primary" link :icon="Refresh" @click="load">
        重新加载
      </el-button>
      <span v-else>暂无数据</span>
    </template>
  </el-select>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import { useDictionary } from '@/composables/useDictionary';
import type { DictionaryValue } from '@/types/option';

defineOptions({ inheritAttrs: false });

type DictionaryModelValue = DictionaryValue | DictionaryValue[] | null | undefined;
type DictionaryValueType = 'original' | 'string' | 'number';

interface DictSelectProps {
  modelValue?: DictionaryModelValue;
  code: string;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  filterable?: boolean;
  valueType?: DictionaryValueType;
}

const props = withDefaults(defineProps<DictSelectProps>(), {
  modelValue: undefined,
  placeholder: '请选择',
  clearable: true,
  disabled: false,
  multiple: false,
  filterable: false,
  valueType: 'original',
});

const emit = defineEmits<{
  'update:modelValue': [value: DictionaryModelValue];
  loadError: [code: string];
  loadSuccess: [code: string];
}>();

const { items, loading, failed, load } = useDictionary(() => props.code);
const normalizeValue = (value: DictionaryValue): DictionaryValue => {
  if (props.valueType === 'string') return String(value);
  if (props.valueType === 'number') {
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? value : numericValue;
  }
  return value;
};
const normalizedItems = computed(() =>
  items.value.map(item => ({ ...item, dictKey: normalizeValue(item.dictKey) }))
);

const handleChange = (value: DictionaryModelValue) => {
  emit('update:modelValue', value);
};

watch([loading, failed], ([isLoading, hasFailed], [wasLoading]) => {
  if (!wasLoading || isLoading) return;
  if (hasFailed) emit('loadError', props.code);
  else emit('loadSuccess', props.code);
});

defineExpose({ retry: load });
</script>

<style scoped lang="scss">
.dict-select {
  width: 100%;
}
</style>
