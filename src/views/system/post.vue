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
               @refresh-change="refreshChange"
               @on-load="onLoad">
      <template #menu-left>
        <el-button type="danger"
                   icon="el-icon-delete"
                   plain
                   v-if="permission.post_delete"
                   @click="handleDelete">删 除
        </el-button>
      </template>
      <template #category="{row}">
        <el-tag>{{row.categoryName}}</el-tag>
      </template>
    </avue-crud>
  </basic-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getList, getDetail, add, update, remove } from '@/api/system/post';
import { validData } from '@/utils/util';
import website from '@/config/website';
import { baseUrl } from '@/config/env';

// 数据实体
interface PostEntity {
  id: string;
  tenantId?: string;
  category?: number;
  categoryName?: string;
  postCode?: string;
  postName?: string;
  sort?: number;
  remark?: string;
}

// 新增与编辑共用的表单模型，字段均可选
type PostForm = Partial<PostEntity>;

// 权限
const store = useStore();
const permission = computed(() => store.getters.permission);

// 表格实例与数据状态
const crudRef = ref();
const form = ref<PostForm>({});
const data = ref<PostEntity[]>([]);
const selectionList = ref<PostEntity[]>([]);
const query = ref<Partial<PostEntity>>({});
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
  tip: false,
  searchShow: true,
  searchMenuSpan: 6,
  border: true,
  index: true,
  viewBtn: true,
  selection: true,
  column: [
    {
      label: '所属租户',
      prop: 'tenantId',
      type: 'tree',
      dicUrl: baseUrl + '/blade-system/tenant/select',
      addDisplay: false,
      editDisplay: false,
      viewDisplay: website.tenantMode,
      span: 24,
      props: {
        label: 'tenantName',
        value: 'tenantId',
      },
      hide: !website.tenantMode,
      rules: [{
        required: true,
        message: '请输入所属租户',
        trigger: 'click',
      }],
    },
    {
      label: '岗位类型',
      prop: 'category',
      type: 'select',
      dicUrl: baseUrl + '/blade-system/dict/dictionary?code=post_category',
      props: {
        label: 'dictValue',
        value: 'dictKey',
      },
      dataType: 'number',
      slot: true,
      search: true,
      rules: [{
        required: true,
        message: '请选择岗位类型',
        trigger: 'blur',
      }],
    },
    {
      label: '岗位编号',
      prop: 'postCode',
      search: true,
      rules: [{
        required: true,
        message: '请输入岗位编号',
        trigger: 'blur',
      }],
    },
    {
      label: '岗位名称',
      prop: 'postName',
      search: true,
      rules: [{
        required: true,
        message: '请输入岗位名称',
        trigger: 'blur',
      }],
    },
    {
      label: '岗位排序',
      prop: 'sort',
      type: 'number',
      rules: [{
        required: true,
        message: '请输入岗位排序',
        trigger: 'blur',
      }],
    },
    {
      label: '岗位描述',
      prop: 'remark',
      type: 'textarea',
      span: 24,
      minRows: 6,
      hide: true,
    },
  ],
});

// 行操作按钮权限
const permissionList = computed(() => ({
  addBtn: validData(permission.value.post_add, false),
  viewBtn: validData(permission.value.post_view, false),
  delBtn: validData(permission.value.post_delete, false),
  editBtn: validData(permission.value.post_edit, false),
}));

// 加载列表数据
const onLoad = (pageData: { currentPage: number; pageSize: number }, params: Partial<PostEntity> = {}) => {
  loading.value = true;
  getList(pageData.currentPage, pageData.pageSize, Object.assign(params, query.value)).then(res => {
    const listData = res.data.data;
    page.total = listData.total;
    data.value = listData.records;
    loading.value = false;
    selectionClear();
  });
};

// 条件检索
const searchChange = (params: Partial<PostEntity>, done: () => void) => {
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

// 刷新当前列表
const refreshChange = () => {
  onLoad(page, query.value);
};

// 记录当前选中行
const selectionChange = (list: PostEntity[]) => {
  selectionList.value = list;
};

// 清空选中状态
const selectionClear = () => {
  selectionList.value = [];
  crudRef.value.toggleSelection();
};

// 新增保存
const rowSave = (row: PostForm, done: () => void, loading: () => void) => {
  add(row).then(() => {
    onLoad(page);
    ElMessage({
      type: 'success',
      message: '操作成功!',
    });
    done();
  }, error => {
    window.console.log(error);
    loading();
  });
};

// 编辑更新
const rowUpdate = (row: PostForm, index: number, done: () => void, loading: () => void) => {
  update(row).then(() => {
    onLoad(page);
    ElMessage({
      type: 'success',
      message: '操作成功!',
    });
    done();
  }, error => {
    window.console.log(error);
    loading();
  });
};

// 删除单行
const rowDel = (row: PostEntity) => {
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

// 打开弹窗前加载编辑/查看详情
const beforeOpen = (done: () => void, type: string) => {
  if (['edit', 'view'].includes(type)) {
    getDetail(form.value.id).then(res => {
      form.value = res.data.data;
    });
  }
  done();
};
</script>

<style>
</style>
