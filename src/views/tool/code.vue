<template>
  <basic-container>
    <avue-crud :option="option"
               :table-loading="loading"
               :data="data"
               ref="crudRef"
               v-model="form"
               :permission="permissionList"
               :page="page"
               @row-del="rowDel"
               @row-update="rowUpdate"
               @row-save="rowSave"
               :before-open="beforeOpen"
               @search-change="searchChange"
               @search-reset="searchReset"
               @selection-change="selectionChange"
               @current-change="currentChange"
               @size-change="sizeChange"
               @on-load="onLoad">
      <template #menu-left>
        <el-button type="danger"
                   icon="el-icon-delete"
                   v-if="permission.code_delete"
                   plain
                   @click="handleDelete">删 除
        </el-button>
        <el-button type="primary"
                   plain
                   icon="el-icon-refresh"
                   @click="handleBuild">代码生成
        </el-button>
      </template>
      <template #menu="scope">
        <el-button text
                   type="primary"
                   icon="el-icon-document-copy"
                   v-if="permission.code_edit"
                   @click.stop="handleCopy(scope.row)">复制
        </el-button>
      </template>
    </avue-crud>
  </basic-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getList, getCode, build, remove, add, update, copy } from '@/api/tool/code';
import { validData } from '@/utils/util';
import { baseUrl } from '@/config/env';

// 数据实体
interface CodeEntity {
  id: string;
  datasourceId?: string;
  codeName?: string;
  serviceName?: string;
  tableName?: string;
  tablePrefix?: string;
  pkName?: string;
  packageName?: string;
  baseMode?: string;
  wrapMode?: string;
  apiPath?: string;
  webPath?: string;
}

// 新增与编辑共用的表单模型，字段均可选
type CodeForm = Partial<CodeEntity>;

// 权限
const store = useStore();
const permission = computed(() => store.getters.permission);

// 表格实例与数据状态
const crudRef = ref();
const form = ref<CodeForm>({});
const data = ref<CodeEntity[]>([]);
const selectionList = ref<CodeEntity[]>([]);
const query = ref<Partial<CodeEntity>>({});
const loading = ref(true);

// 分页参数
const page = reactive({
  pageSize: 10,
  currentPage: 1,
  total: 0,
});

// 选中行 id 集合，供批量删除与代码生成使用
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
  labelWidth: 120,
  menuWidth: 285,
  viewBtn: true,
  column: [
    {
      label: '数据源',
      prop: 'datasourceId',
      search: true,
      span: 24,
      type: 'select',
      dicUrl: baseUrl + '/blade-develop/datasource/select',
      props: {
        label: 'name',
        value: 'id',
      },
      rules: [{
        required: true,
        message: '请选择数据源',
        trigger: 'blur',
      }],
    },
    {
      label: '模块名',
      prop: 'codeName',
      search: true,
      rules: [{
        required: true,
        message: '请输入模块名',
        trigger: 'blur',
      }],
    },
    {
      label: '服务名',
      prop: 'serviceName',
      search: true,
      rules: [{
        required: true,
        message: '请输入服务名',
        trigger: 'blur',
      }],
    },
    {
      label: '表名',
      prop: 'tableName',
      rules: [{
        required: true,
        message: '请输入表名',
        trigger: 'blur',
      }],
    },
    {
      label: '表前缀',
      prop: 'tablePrefix',
      hide: true,
      rules: [{
        required: true,
        message: '请输入表前缀',
        trigger: 'blur',
      }],
    },
    {
      label: '主键名',
      prop: 'pkName',
      hide: true,
      rules: [{
        required: true,
        message: '请输入主键名',
        trigger: 'blur',
      }],
    },
    {
      label: '包名',
      prop: 'packageName',
      overHidden: true,
      rules: [{
        required: true,
        message: '请输入包名',
        trigger: 'blur',
      }],
    },
    {
      label: '基础业务',
      prop: 'baseMode',
      type: 'radio',
      dicUrl: baseUrl + '/blade-system/dict/dictionary?code=yes_no',
      props: {
        label: 'dictValue',
        value: 'dictKey',
      },
      hide: true,
      rules: [{
        required: true,
        message: '请选择基础业务',
        trigger: 'blur',
      }],
    },
    {
      label: '包装器',
      prop: 'wrapMode',
      type: 'radio',
      dicUrl: baseUrl + '/blade-system/dict/dictionary?code=yes_no',
      props: {
        label: 'dictValue',
        value: 'dictKey',
      },
      hide: true,
      rules: [{
        required: true,
        message: '请选择包装器',
        trigger: 'blur',
      }],
    },
    {
      label: '后端生成路径',
      prop: 'apiPath',
      span: 24,
      hide: true,
      rules: [{
        required: true,
        message: '请输入后端生成路径',
        trigger: 'blur',
      }],
    },
    {
      label: '前端生成路径',
      prop: 'webPath',
      span: 24,
      hide: true,
      rules: [{
        required: true,
        message: '请输入前端生成路径',
        trigger: 'blur',
      }],
    }
  ],
});

// 行操作按钮权限
const permissionList = computed(() => ({
  addBtn: validData(permission.value.code_add, false),
  viewBtn: validData(permission.value.code_view, false),
  delBtn: validData(permission.value.code_delete, false),
  editBtn: validData(permission.value.code_edit, false),
}));

// 加载列表数据
const onLoad = (pageParam: { currentPage: number; pageSize: number }, params: Partial<CodeEntity> = {}) => {
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
const searchChange = (params: Partial<CodeEntity>, done: () => void) => {
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
const selectionChange = (list: CodeEntity[]) => {
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
    getCode(form.value.id).then(res => {
      form.value = res.data.data;
    });
  }
  done();
};

// 新增保存
const rowSave = (row: CodeForm, done: () => void, loading: () => void) => {
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
const rowUpdate = (row: CodeForm, index: number, done: () => void, loading: () => void) => {
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
const rowDel = (row: CodeEntity) => {
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

// 生成选中模块代码
const handleBuild = () => {
  if (selectionList.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  ElMessageBox.confirm('是否生成选中模块的代码?', {
    title: '代码生成确认',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      return build(ids.value);
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

// 复制配置生成新记录
const handleCopy = (row: CodeEntity) => {
  copy(row.id).then(() => {
    onLoad(page);
    ElMessage({
      type: 'success',
      message: '复制成功!',
    });
  });
};
</script>
