<template>
  <basic-container>
    <avue-crud :option="option"
               :table-loading="loading"
               :data="data"
               ref="crudRef"
               :page="page"
               @row-del="rowDel"
               v-model="form"
               :permission="permissionList"
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
                   plain
                   v-if="permission.client_delete"
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
import { getList, getDetail, add, update, remove } from '@/api/system/client';
import { validData } from '@/utils/util';

// 数据实体
interface ClientEntity {
  id: string;
  clientId?: string;
  clientSecret?: string;
  authorizedGrantTypes?: string;
  scope?: string;
  accessTokenValidity?: number;
  refreshTokenValidity?: number;
  webServerRedirectUri?: string;
  resourceIds?: string;
  authorities?: string;
  autoapprove?: string;
  additionalInformation?: string;
}

// 新增与编辑共用的表单模型，字段均可选
type ClientForm = Partial<ClientEntity>;

// 权限
const store = useStore();
const permission = computed(() => store.getters.permission);

// 表格实例与数据状态
const crudRef = ref();
const form = ref<ClientForm>({});
const data = ref<ClientEntity[]>([]);
const selectionList = ref<ClientEntity[]>([]);
const query = ref<Partial<ClientEntity>>({});
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
      label: '应用id',
      prop: 'clientId',
      search: true,
      rules: [{
        required: true,
        message: '请输入客户端id',
        trigger: 'blur',
      }],
    },
    {
      label: '应用密钥',
      prop: 'clientSecret',
      search: true,
      rules: [{
        required: true,
        message: '请输入客户端密钥',
        trigger: 'blur',
      }],
    },
    {
      label: '授权类型',
      prop: 'authorizedGrantTypes',
      valueDefault: 'refresh_token,password,authorization_code',
      rules: [{
        required: true,
        message: '请输入授权类型',
        trigger: 'blur',
      }],
    },
    {
      label: '授权范围',
      prop: 'scope',
      valueDefault: 'all',
      rules: [{
        required: true,
        message: '请输入授权范围',
        trigger: 'blur',
      }],
    },
    {
      label: '令牌秒数',
      prop: 'accessTokenValidity',
      type: 'number',
      valueDefault: 3600,
      rules: [{
        required: true,
        message: '请输入令牌过期秒数',
        trigger: 'blur',
      }],
    },
    {
      label: '刷新秒数',
      prop: 'refreshTokenValidity',
      type: 'number',
      valueDefault: 604800,
      hide: true,
      rules: [{
        required: true,
        message: '请输入刷新令牌过期秒数',
        trigger: 'blur',
      }],
    },
    {
      label: '回调地址',
      prop: 'webServerRedirectUri',
      hide: true,
      rules: [{
        required: true,
        message: '请输入回调地址',
        trigger: 'blur',
      }],
    },
    {
      label: '资源集合',
      prop: 'resourceIds',
      hide: true,
      rules: [{
        message: '请输入资源集合',
        trigger: 'blur',
      }],
    },
    {
      label: '权限',
      prop: 'authorities',
      hide: true,
      rules: [{
        message: '请输入权限',
        trigger: 'blur',
      }],
    },
    {
      label: '自动授权',
      prop: 'autoapprove',
      hide: true,
      rules: [{
        message: '请输入自动授权',
        trigger: 'blur',
      }],
    },
    {
      label: '附加说明',
      hide: true,
      prop: 'additionalInformation',
      span: 24,
      rules: [{
        message: '请输入附加说明',
        trigger: 'blur',
      }],
    },
  ],
});

// 行操作按钮权限
const permissionList = computed(() => ({
  addBtn: validData(permission.value.client_add, false),
  viewBtn: validData(permission.value.client_view, false),
  delBtn: validData(permission.value.client_delete, false),
  editBtn: validData(permission.value.client_edit, false),
}));

// 加载列表数据
const onLoad = (pageData: { currentPage: number; pageSize: number }, params: Partial<ClientEntity> = {}) => {
  loading.value = true;
  getList(pageData.currentPage, pageData.pageSize, Object.assign(params, query.value)).then(res => {
    const resData = res.data.data;
    page.total = resData.total;
    data.value = resData.records;
    loading.value = false;
  });
};

// 条件检索
const searchChange = (params: Partial<ClientEntity>, done: () => void) => {
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
const selectionChange = (list: ClientEntity[]) => {
  selectionList.value = list;
};

// 新增保存
const rowSave = (row: ClientForm, done: () => void, loading: () => void) => {
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
const rowUpdate = (row: ClientForm, index: number, done: () => void, loading: () => void) => {
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
const rowDel = (row: ClientEntity) => {
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
