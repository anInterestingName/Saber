<template>
  <basic-container>
    <avue-crud :option="option"
               :table-loading="loading"
               :data="data"
               :page="page"
               :permission="permissionList"
               :before-open="beforeOpen"
               v-model="form"
               ref="crudRef"
               @row-update="rowUpdate"
               @row-save="rowSave"
               @row-del="rowDel"
               @search-change="searchChange"
               @search-reset="searchReset"
               @selection-change="selectionChange"
               @current-change="currentChange"
               @size-change="sizeChange"
               @on-load="onLoad">
      <template #menu-left>
        <el-button type="danger"
                   icon="el-icon-delete"
                   plain
                   v-if="permission.datasource_delete"
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
import { getList, getDetail, add, update, remove } from '@/api/tool/datasource';
import { validData } from '@/utils/util';

// 数据实体
interface DatasourceEntity {
  id: string;
  name?: string;
  driverClass?: string;
  username?: string;
  password?: string;
  url?: string;
  remark?: string;
}

// 新增与编辑共用的表单模型，字段均可选
type DatasourceForm = Partial<DatasourceEntity>;

// 权限
const store = useStore();
const permission = computed(() => store.getters.permission);

// 表格实例与数据状态
const crudRef = ref();
const form = ref<DatasourceForm>({});
const data = ref<DatasourceEntity[]>([]);
const selectionList = ref<DatasourceEntity[]>([]);
const query = ref<Partial<DatasourceEntity>>({});
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
  viewBtn: true,
  selection: true,
  column: [
    {
      label: '名称',
      prop: 'name',
      width: 120,
      rules: [{
        required: true,
        message: '请输入数据源名称',
        trigger: 'blur',
      }],
    },
    {
      label: '驱动类',
      prop: 'driverClass',
      type: 'select',
      dicData: [
        {
          label: 'com.mysql.cj.jdbc.Driver',
          value: 'com.mysql.cj.jdbc.Driver',
        }, {
          label: 'org.postgresql.Driver',
          value: 'org.postgresql.Driver',
        }, {
          label: 'oracle.jdbc.OracleDriver',
          value: 'oracle.jdbc.OracleDriver',
        }
      ],
      width: 200,
      rules: [{
        required: true,
        message: '请输入驱动类',
        trigger: 'blur',
      }],
    },
    {
      label: '用户名',
      prop: 'username',
      width: 120,
      rules: [{
        required: true,
        message: '请输入用户名',
        trigger: 'blur',
      }],
    },
    {
      label: '密码',
      prop: 'password',
      hide: true,
      rules: [{
        required: true,
        message: '请输入密码',
        trigger: 'blur',
      }],
    },
    {
      label: '连接地址',
      prop: 'url',
      span: 24,
      rules: [{
        required: true,
        message: '请输入连接地址',
        trigger: 'blur',
      }],
    },
    {
      label: '备注',
      prop: 'remark',
      span: 24,
      minRows: 3,
      hide: true,
      type: 'textarea',
    },
  ],
});

// 行操作按钮权限
const permissionList = computed(() => ({
  addBtn: validData(permission.value.datasource_add, false),
  viewBtn: validData(permission.value.datasource_view, false),
  delBtn: validData(permission.value.datasource_delete, false),
  editBtn: validData(permission.value.datasource_edit, false),
}));

// 加载列表数据
const onLoad = (pageParam: { currentPage: number; pageSize: number }, params: Partial<DatasourceEntity> = {}) => {
  loading.value = true;
  getList(pageParam.currentPage, pageParam.pageSize, Object.assign(params, query.value)).then(res => {
    const resData = res.data.data;
    page.total = resData.total;
    data.value = resData.records;
    loading.value = false;
    selectionClear();
  });
};

// 条件检索
const searchChange = (params: Partial<DatasourceEntity>, done: () => void) => {
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
const selectionChange = (list: DatasourceEntity[]) => {
  selectionList.value = list;
};

// 清空选中状态
const selectionClear = () => {
  selectionList.value = [];
  crudRef.value.toggleSelection();
};

// 打开表单前加载详情
const beforeOpen = (done: () => void, type: string) => {
  if (['edit', 'view'].includes(type)) {
    getDetail(form.value.id).then(res => {
      form.value = res.data.data;
    });
  }
  done();
};

// 新增保存
const rowSave = (row: DatasourceForm, done: () => void, loading: () => void) => {
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
const rowUpdate = (row: DatasourceForm, index: number, done: () => void, loading: () => void) => {
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
const rowDel = (row: DatasourceEntity) => {
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
