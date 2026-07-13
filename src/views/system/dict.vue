<template>
  <basic-container>
    <avue-crud :option="option"
               :table-loading="loading"
               :data="data"
               ref="crudRef"
               v-model="form"
               :permission="permissionList"
               :before-open="beforeOpen"
               @row-del="rowDel"
               @row-update="rowUpdate"
               @row-save="rowSave"
               @search-change="searchChange"
               @search-reset="searchReset"
               @selection-change="selectionChange"
               @current-change="currentChange"
               @size-change="sizeChange"
               @on-load="onLoad">
      <template #menu-left>
        <el-button type="danger"
                   icon="el-icon-delete"
                   v-if="permission.dict_delete"
                   plain
                   @click="handleDelete">删 除
        </el-button>
      </template>
      <template #menu="scope">
        <el-button text
                   type="primary"
                   icon="el-icon-plus"
                   @click.stop="handleAdd(scope.row,scope.index)"
                   v-if="userInfo.authority.includes('admin')">新增子项
        </el-button>
      </template>
    </avue-crud>
  </basic-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { add, getDict, getDictTree, getList, remove, update } from '@/api/system/dict';
import { validData, findColumn } from '@/utils/util';

// 数据实体
interface DictEntity {
  id: string;
  code?: string;
  dictValue?: string;
  parentId?: string;
  dictKey?: number;
  sort?: number;
  remark?: string;
}

// 新增与编辑共用的表单模型，字段均可选
type DictForm = Partial<DictEntity>;

// 权限
const store = useStore();
const userInfo = computed(() => store.getters.userInfo);
const permission = computed(() => store.getters.permission);

// 表格实例与数据状态
const crudRef = ref();
const form = ref<DictForm>({});
const data = ref<DictEntity[]>([]);
const selectionList = ref<DictEntity[]>([]);
const query = ref<Partial<DictEntity>>({});
const loading = ref(true);

// 分页参数
const page = reactive({
  pageSize: 10,
  currentPage: 1,
  total: 0,
});

// 选中行 id 集合，供批量删除使用
const ids = computed(() => selectionList.value.map(ele => ele.id).join(','));

// 表格配置
const option = reactive({
  searchShow: true,
  searchMenuSpan: 6,
  tip: false,
  tree: true,
  border: true,
  index: true,
  selection: true,
  viewBtn: true,
  menuWidth: 350,
  column: [
    {
      label: '字典编号',
      prop: 'code',
      search: true,
      span: 24,
      rules: [{
        required: true,
        message: '请输入字典编号',
        trigger: 'blur',
      }],
    },
    {
      label: '字典名称',
      prop: 'dictValue',
      search: true,
      rules: [{
        required: true,
        message: '请输入字典名称',
        trigger: 'blur',
      }],
    },
    {
      label: '上级字典',
      prop: 'parentId',
      type: 'tree',
      dicData: [],
      hide: true,
      props: {
        label: 'title',
      },
      rules: [{
        required: false,
        message: '请选择上级字典',
        trigger: 'click',
      }],
    },
    {
      label: '字典键值',
      prop: 'dictKey',
      type: 'number',
      rules: [{
        required: true,
        message: '请输入字典键值',
        trigger: 'blur',
      }],
    },
    {
      label: '字典排序',
      prop: 'sort',
      type: 'number',
      rules: [{
        required: true,
        message: '请输入字典排序',
        trigger: 'blur',
      }],
    },
    {
      label: '字典备注',
      prop: 'remark',
      search: true,
      span: 24,
      hide: true,
    },
  ],
});

// 行操作按钮权限
const permissionList = computed(() => ({
  addBtn: validData(permission.value.dict_add, false),
  viewBtn: validData(permission.value.dict_view, false),
  delBtn: validData(permission.value.dict_delete, false),
  editBtn: validData(permission.value.dict_edit, false),
}));

// 加载列表数据，并刷新上级字典树
const onLoad = (pageData: { currentPage: number; pageSize: number }, params: Partial<DictEntity> = {}) => {
  loading.value = true;
  getList(pageData.currentPage, pageData.pageSize, Object.assign(params, query.value)).then(res => {
    data.value = res.data.data;
    loading.value = false;
    getDictTree().then(res => {
      const column = findColumn(option.column, 'parentId');
      if (column) column.dicData = res.data.data;
    });
  });
};

// 条件检索
const searchChange = (params: Partial<DictEntity>, done: () => void) => {
  query.value = params;
  page.currentPage = 1;
  onLoad(page, params);
  done();
};

// 重置检索条件
const searchReset = () => {
  query.value = {};
  onLoad(page);
};

// 切换页码
const currentChange = (currentPage: number) => {
  page.currentPage = currentPage;
};

// 调整每页条数
const sizeChange = (pageSize: number) => {
  page.pageSize = pageSize;
};

// 记录当前选中行
const selectionChange = (list: DictEntity[]) => {
  selectionList.value = list;
};

// 新增子字典，预填并锁定字典编号与上级字典
const handleAdd = (row: DictEntity) => {
  crudRef.value.modelValue.code = row.code;
  crudRef.value.modelValue.parentId = row.id;
  crudRef.value.option.column.filter((item: Record<string, unknown>) => {
    if (item.prop === 'code') {
      item.value = row.code;
      item.addDisabled = true;
    }
    if (item.prop === 'parentId') {
      item.value = row.id;
      item.addDisabled = true;
    }
  });
  crudRef.value.rowAdd();
};

// 新增保存
const rowSave = (row: DictForm, done: () => void, loading: () => void) => {
  add(row).then(() => {
    done();
    onLoad(page);
    ElMessage({
      type: 'success',
      message: '操作成功!',
    });
  }, error => {
    window.console.log(error);
    loading();
  });
};

// 编辑保存
const rowUpdate = (row: DictForm, index: number, done: () => void, loading: () => void) => {
  update(row).then(() => {
    done();
    onLoad(page);
    ElMessage({
      type: 'success',
      message: '操作成功!',
    });
  }, error => {
    window.console.log(error);
    loading();
  });
};

// 删除单行
const rowDel = (row: DictEntity) => {
  ElMessageBox.confirm('确定将选择数据删除?', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      return remove(row.id);
    })
    .then(() => {
      onLoad(page);
      ElMessage({
        type: 'success',
        message: '操作成功!',
      });
    });
};

// 批量删除选中行
const handleDelete = () => {
  if (selectionList.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  ElMessageBox.confirm('确定将选择数据删除?', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      return remove(ids.value);
    })
    .then(() => {
      onLoad(page);
      ElMessage({
        type: 'success',
        message: '操作成功!',
      });
      crudRef.value.toggleSelection();
    });
};

// 编辑或查看前加载字典详情
const beforeOpen = (done: () => void, type: string) => {
  if (['edit', 'view'].includes(type)) {
    getDict(form.value.id).then(res => {
      form.value = res.data.data;
    });
  }
  done();
};
</script>

<style>
</style>
