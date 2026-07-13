<template>
  <basic-container>
    <avue-crud :option="option"
               :table-loading="loading"
               :data="data"
               ref="crudRef"
               v-model="form"
               :page="page"
               :permission="permissionList"
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
                   v-if="permission.param_delete"
                   plain
                   @click="handleDelete">删 除
        </el-button>
      </template>
    </avue-crud>
  </basic-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getList, remove, update, add } from '@/api/system/param';
import { validData } from '@/utils/util';

// 数据实体
interface ParamEntity {
  id: string;
  paramName?: string;
  paramKey?: string;
  paramValue?: string;
}

// 新增与编辑共用的表单模型，字段均可选
type ParamForm = Partial<ParamEntity>;

// 权限
const store = useStore();
const permission = computed(() => store.getters.permission);

// 表格实例与数据状态
const crudRef = ref();
const form = ref<ParamForm>({});
const data = ref<ParamEntity[]>([]);
const selectionList = ref<ParamEntity[]>([]);
const query = ref<Partial<ParamEntity>>({});
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
  height: 'auto',
  calcHeight: 210,
  searchShow: true,
  searchMenuSpan: 6,
  tip: false,
  border: true,
  index: true,
  selection: true,
  viewBtn: true,
  column: [
    {
      label: '参数名称',
      prop: 'paramName',
      search: true,
      rules: [{
        required: true,
        message: '请输入参数名称',
        trigger: 'blur',
      }],
    },
    {
      label: '参数键名',
      prop: 'paramKey',
      search: true,
      rules: [{
        required: true,
        message: '请输入参数键名',
        trigger: 'blur',
      }],
    },
    {
      label: '参数键值',
      prop: 'paramValue',
      rules: [{
        required: true,
        message: '请输入参数键值',
        trigger: 'blur',
      }],
    },
  ],
});

// 行操作按钮权限
const permissionList = computed(() => ({
  addBtn: validData(permission.value.param_add, false),
  viewBtn: validData(permission.value.param_view, false),
  delBtn: validData(permission.value.param_delete, false),
  editBtn: validData(permission.value.param_edit, false),
}));

// 加载列表数据
const onLoad = (pageData: { currentPage: number; pageSize: number }, params: Partial<ParamEntity> = {}) => {
  loading.value = true;
  getList(pageData.currentPage, pageData.pageSize, Object.assign(params, query.value)).then(res => {
    const listData = res.data.data;
    page.total = listData.total;
    data.value = listData.records;
    loading.value = false;
  });
};

// 条件检索
const searchChange = (params: Partial<ParamEntity>, done: () => void) => {
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
const selectionChange = (list: ParamEntity[]) => {
  selectionList.value = list;
};

// 新增保存
const rowSave = (row: ParamForm, done: () => void, loading: () => void) => {
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

// 编辑更新
const rowUpdate = (row: ParamForm, index: number, done: () => void, loading: () => void) => {
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
const rowDel = (row: ParamEntity) => {
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
</script>

<style>
</style>
