<template>
  <span class="dict-tag">
    <el-icon v-if="loading" class="dict-tag__loading is-loading" aria-label="加载中">
      <Loading />
    </el-icon>
    <template v-else-if="labels.length">
      <el-tag v-for="item in labels" :key="item.key" size="small" :type="item.type">
        {{ item.label }}
      </el-tag>
    </template>
    <span v-else>-</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import { useDictionary } from '@/composables/useDictionary';
import type { DictionaryValue } from '@/types/option';

type DictionaryValueType = 'original' | 'string' | 'number';
type DictionaryTagType = 'primary' | 'success' | 'warning' | 'info' | 'danger';

interface DictionaryTagTypeMap {
  [key: string]: DictionaryTagType | undefined;
}

interface DictTagProps {
  code: string;
  value?: DictionaryValue | DictionaryValue[] | null;
  valueType?: DictionaryValueType;
  typeMap?: DictionaryTagTypeMap;
}

const props = withDefaults(defineProps<DictTagProps>(), {
  value: null,
  valueType: 'original',
  typeMap: () => ({}),
});

const { items, loading, load } = useDictionary(() => props.code);
const values = computed(() => {
  if (props.value === null || props.value === undefined || props.value === '') return [];
  return Array.isArray(props.value) ? props.value : [props.value];
});
const normalizeValue = (value: DictionaryValue) => {
  if (props.valueType === 'string') return String(value);
  if (props.valueType === 'number') return Number(value);
  return value;
};
const labels = computed(() =>
  values.value.map(value => {
    const normalizedValue = normalizeValue(value);
    const matchedItem = items.value.find(item => normalizeValue(item.dictKey) === normalizedValue);
    return {
      key: String(value),
      label: matchedItem?.dictValue ?? String(value),
      type: props.typeMap[String(value)],
    };
  })
);

defineExpose({ retry: load });
</script>

<style scoped lang="scss">
.dict-tag {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  color: var(--saber-text-secondary);
}

.dict-tag__loading {
  color: var(--saber-text-tertiary);
}
</style>
