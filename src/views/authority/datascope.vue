<template>
  <basic-container>
    <avue-crud
      :option="option"
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
      @refresh-change="refreshChange"
      @on-load="onLoad"
      @tree-load="treeLoad"
    >
      <template #menu="{ row }">
        <el-button
          text
          type="primary"
          icon="el-icon-setting"
          v-if="permission.data_scope_setting"
          plain
          style="border: 0; background-color: transparent !important"
          @click.stop="handleDataScope(row)"
          >权限配置
        </el-button>
      </template>
      <template #source="{ row }">
        <div style="text-align: center">
          <i :class="row.source" />
        </div>
      </template>
    </avue-crud>
    <el-drawer
      :title="`[${scopeMenuName}] 数据权限配置`"
      v-model="drawerVisible"
      :direction="direction"
      append-to-body
      :before-close="handleDrawerClose"
      size="1000px"
    >
      <basic-container>
        <avue-crud
          :option="optionScope"
          :data="dataScope"
          :page="pageScope"
          v-model="formScope"
          :table-loading="scopeLoading"
          ref="crudScopeRef"
          @row-del="rowDelScope"
          @row-update="rowUpdateScope"
          @row-save="rowSaveScope"
          :before-open="beforeOpenScope"
          @search-change="searchChangeScope"
          @search-reset="searchResetScope"
          @selection-change="selectionChangeScope"
          @current-change="currentChangeScope"
          @size-change="sizeChangeScope"
          @on-load="onLoadScope"
        >
          <template #menu-left>
            <el-button type="danger" icon="el-icon-delete" plain @click="handleDeleteScope"
              >删 除
            </el-button>
          </template>
          <template #scopeType="{ row }">
            <el-tag>{{ row.scopeTypeName }}</el-tag>
          </template>
        </avue-crud>
      </basic-container>
    </el-drawer>
  </basic-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { baseUrl } from '@/config/env';
import { add, remove, update, getLazyMenuList, getMenu } from '@/api/system/menu';
import {
  addDataScope,
  removeDataScope,
  updateDataScope,
  getListDataScope,
  getMenuDataScope,
} from '@/api/system/scope';
import iconList from '@/config/iconList';
import func from '@/utils/func';
import { validData } from '@/utils/util';

// 菜单数据实体
interface MenuEntity {
  id: string;
  name: string;
  code: string;
  path?: string;
  parentId?: string;
  source?: string;
  category?: number;
  alias?: string;
  action?: number;
  sort?: number;
  isOpen?: number;
  remark?: string;
}

// 菜单新增与编辑共用的表单模型，字段均可选
type MenuForm = Partial<MenuEntity>;

// 数据权限数据实体
interface ScopeEntity {
  id: string;
  scopeName?: string;
  resourceCode?: string;
  scopeColumn?: string;
  scopeType?: number | string;
  scopeField?: string;
  scopeClass?: string;
  scopeValue?: string;
  remark?: string;
  scopeTypeName?: string;
  menuId?: string | number;
}

// 数据权限新增与编辑共用的表单模型，字段均可选
type ScopeForm = Partial<ScopeEntity>;

// 权限
const store = useStore();
const permission = computed(() => store.getters.permission);

// 菜单树状态
const crudRef = ref();
const form = ref<MenuForm>({});
const data = ref<MenuEntity[]>([]);
const selectionList = ref<MenuEntity[]>([]);
const query = ref<Partial<MenuEntity>>({});
const loading = ref(true);
const parentId = ref<string | number>(0);

// 分页参数
const page = reactive({
  pageSize: 10,
  currentPage: 1,
  total: 0,
});

// scope 抽屉状态
const crudScopeRef = ref();
const formScope = ref<ScopeForm>({});
const dataScope = ref<ScopeEntity[]>([]);
const selectionListScope = ref<ScopeEntity[]>([]);
const drawerVisible = ref(false);
const direction = ref('rtl');
const scopeMenuId = ref<string | number>(0);
const scopeMenuCode = ref('');
const scopeMenuName = ref('菜单');
const scopeLoading = ref(false);
const watchMode = ref(true);

// scope 抽屉分页参数
const pageScope = reactive({
  pageSize: 10,
  currentPage: 1,
  total: 0,
});

// 菜单侧选中行 id 集合，供批量删除使用
const ids = computed(() => selectionList.value.map(ele => ele.id).join(','));

// scope 侧选中行 id 集合，供批量删除使用
const scopeIds = computed(() => selectionListScope.value.map(ele => ele.id).join(','));

// 菜单树表格配置
const option = reactive({
  lazy: true,
  tip: false,
  simplePage: true,
  searchShow: true,
  searchMenuSpan: 6,
  dialogWidth: '60%',
  tree: true,
  border: true,
  index: true,
  selection: true,
  viewBtn: false,
  editBtn: false,
  addBtn: false,
  delBtn: false,
  menuWidth: 150,
  dialogClickModal: false,
  column: [
    {
      label: '菜单名称',
      prop: 'name',
      search: true,
      rules: [
        {
          required: true,
          message: '请输入菜单名称',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '路由地址',
      prop: 'path',
      rules: [
        {
          required: true,
          message: '请输入路由地址',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '上级菜单',
      prop: 'parentId',
      type: 'tree',
      dicUrl: baseUrl + '/blade-system/menu/tree',
      hide: true,
      props: {
        label: 'title',
      },
      rules: [
        {
          required: false,
          message: '请选择上级菜单',
          trigger: 'click',
        },
      ],
    },
    {
      label: '菜单图标',
      prop: 'source',
      type: 'icon',
      slot: true,
      width: 100,
      iconList: iconList,
      rules: [
        {
          required: true,
          message: '请输入菜单图标',
          trigger: 'click',
        },
      ],
    },
    {
      label: '菜单编号',
      prop: 'code',
      search: true,
      rules: [
        {
          required: true,
          message: '请输入菜单编号',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '菜单类型',
      prop: 'category',
      type: 'radio',
      dicData: [
        {
          label: '菜单',
          value: 1,
        },
        {
          label: '按钮',
          value: 2,
        },
      ],
      hide: true,
      rules: [
        {
          required: true,
          message: '请选择菜单类型',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '菜单别名',
      prop: 'alias',
      rules: [
        {
          required: true,
          message: '请输入菜单别名',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '按钮功能',
      prop: 'action',
      type: 'radio',
      dicData: [
        {
          label: '工具栏',
          value: 0,
        },
        {
          label: '操作栏',
          value: 1,
        },
        {
          label: '工具操作栏',
          value: 2,
        },
      ],
      hide: true,
      rules: [
        {
          required: true,
          message: '请选择按钮功能',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '菜单排序',
      prop: 'sort',
      type: 'number',
      width: 100,
      rules: [
        {
          required: true,
          message: '请输入菜单排序',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '新窗口',
      prop: 'isOpen',
      type: 'radio',
      dicData: [
        {
          label: '否',
          value: 0,
        },
        {
          label: '是',
          value: 1,
        },
      ],
      hide: true,
    },
    {
      label: '菜单备注',
      prop: 'remark',
      type: 'textarea',
      span: 24,
      minRows: 6,
      hide: true,
    },
  ],
});

// scope 抽屉表格配置
const optionScope = reactive({
  tip: false,
  searchShow: true,
  searchMenuSpan: 6,
  border: true,
  index: true,
  viewBtn: true,
  selection: true,
  menuWidth: 250,
  dialogWidth: 900,
  dialogClickModal: false,
  column: [
    {
      label: '权限名称',
      prop: 'scopeName',
      search: true,
      value: '',
      rules: [
        {
          required: true,
          message: '请输入数据权限名称',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '权限编号',
      prop: 'resourceCode',
      search: true,
      width: 100,
      rules: [
        {
          required: true,
          message: '请输入数据权限编号',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '权限字段',
      prop: 'scopeColumn',
      width: 130,
      rules: [
        {
          required: true,
          message: '请输入数据权限编号',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '规则类型',
      type: 'select',
      dicUrl: baseUrl + '/blade-system/dict/dictionary?code=data_scope_type',
      props: {
        label: 'dictValue',
        value: 'dictKey',
      },
      dataType: 'number',
      slot: true,
      width: 140,
      prop: 'scopeType',
      rules: [
        {
          required: true,
          message: '请输入通知类型',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '可见字段',
      prop: 'scopeField',
      span: 24,
      hide: true,
      value: '*',
      rules: [
        {
          required: true,
          message: '请输入数据权限可见的字段',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '权限类名',
      prop: 'scopeClass',
      span: 24,
      hide: true,
      rules: [
        {
          required: true,
          message: '请输入MybatisMapper对应方法的完整类名路径',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '规则值',
      prop: 'scopeValue',
      span: 24,
      minRows: 5,
      type: 'textarea',
      display: true,
      hide: true,
    },
    {
      label: '备注',
      prop: 'remark',
      span: 24,
      hide: true,
    },
  ],
});

// 行操作按钮权限
const permissionList = computed(() => ({
  addBtn: validData(permission.value.menu_add, false),
  viewBtn: validData(permission.value.menu_view, false),
  delBtn: validData(permission.value.menu_delete, false),
  editBtn: validData(permission.value.menu_edit, false),
}));

// 菜单侧：加载菜单树数据
const onLoad = (pageData: { currentPage: number; pageSize: number }, params: Partial<MenuEntity> = {}) => {
  loading.value = true;
  getLazyMenuList(parentId.value, Object.assign(params, query.value)).then(res => {
    data.value = res.data.data;
    loading.value = false;
    selectionClear();
  });
};

// 菜单侧：懒加载子级菜单
const treeLoad = (tree: MenuEntity, treeNode: unknown, resolve: (data: MenuEntity[]) => void) => {
  const parentMenuId = tree.id;
  getLazyMenuList(parentMenuId).then(res => {
    resolve(res.data.data);
  });
};

// 菜单侧：条件检索
const searchChange = (params: Partial<MenuEntity>, done: () => void) => {
  query.value = params;
  parentId.value = '';
  page.currentPage = 1;
  onLoad(page, params);
  done();
};

// 菜单侧：重置检索条件
const searchReset = () => {
  query.value = {};
  parentId.value = 0;
  onLoad(page);
};

// 菜单侧：切换页码
const currentChange = (currentPage: number) => {
  page.currentPage = currentPage;
};

// 菜单侧：调整每页条数
const sizeChange = (pageSize: number) => {
  page.pageSize = pageSize;
};

// 菜单侧：刷新当前列表
const refreshChange = () => {
  onLoad(page, query.value);
};

// 菜单侧：记录当前选中行
const selectionChange = (list: MenuEntity[]) => {
  selectionList.value = list;
};

// 菜单侧：清空选中状态
const selectionClear = () => {
  selectionList.value = [];
  crudRef.value.toggleSelection();
};

// 菜单侧：新增提交
const rowSave = (row: MenuForm, done: () => void, loading: () => void) => {
  add(row).then(
    () => {
      onLoad(page);
      ElMessage({
        type: 'success',
        message: '操作成功!',
      });
      done();
    },
    error => {
      window.console.log(error);
      loading();
    }
  );
};

// 菜单侧：编辑提交
const rowUpdate = (row: MenuForm, index: number, done: () => void, loading: () => void) => {
  update(row).then(
    () => {
      onLoad(page);
      ElMessage({
        type: 'success',
        message: '操作成功!',
      });
      done();
    },
    error => {
      window.console.log(error);
      loading();
    }
  );
};

// 菜单侧：删除单行
const rowDel = (row: MenuEntity) => {
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

// 菜单侧：批量删除选中行
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

// 菜单侧：打开表单前加载详情
const beforeOpen = (done: () => void, type: string) => {
  if (['edit', 'view'].includes(type)) {
    getMenu(form.value.id).then(res => {
      form.value = res.data.data;
    });
  }
  done();
};

// scope 侧：打开权限配置抽屉
const handleDataScope = (row: MenuEntity) => {
  drawerVisible.value = true;
  scopeMenuId.value = row.id;
  scopeMenuCode.value = row.code;
  scopeMenuName.value = row.name;
  onLoadScope(pageScope);
};

// scope 侧：关闭抽屉
const handleDrawerClose = (hide: () => void) => {
  hide();
};

// scope 侧：根据规则类型联动回填权限字段
const initScope = () => {
  const scopeType = func.toInt(formScope.value.scopeType);
  const watchModeValue = watchMode.value;
  let column = '-',
    name = '暂无';
  if (scopeType === 1) {
    column = '-';
    name = '全部可见';
  } else if (scopeType === 2) {
    column = 'create_user';
    name = '本人可见';
  } else if (scopeType === 3) {
    column = 'create_dept';
    name = '所在机构可见';
  } else if (scopeType === 4) {
    column = 'create_dept';
    name = '所在机构可见及子级可见';
  } else if (scopeType === 5) {
    column = '';
    name = '自定义';
  }
  crudScopeRef.value.option.column.filter((item: Record<string, unknown>) => {
    if (watchModeValue) {
      if (item.prop === 'scopeName') {
        formScope.value.scopeName = `${scopeMenuName.value} [${name}]`;
      }
      if (item.prop === 'resourceCode') {
        formScope.value.resourceCode = scopeMenuCode.value;
      }
      if (item.prop === 'scopeColumn') {
        formScope.value.scopeColumn = column;
      }
    }
    if (item.prop === 'scopeValue') {
      item.display = scopeType === 5;
    }
  });
};

// scope 侧：监听规则类型变化，触发字段联动
watch(
  () => formScope.value.scopeType,
  () => {
    initScope();
  }
);

// scope 侧：加载权限列表
const onLoadScope = (pageParam: { currentPage: number; pageSize: number }, params: Partial<ScopeEntity> = {}) => {
  scopeLoading.value = true;
  const values = {
    ...params,
    menuId: scopeMenuId.value,
  };
  getListDataScope(pageParam.currentPage, pageParam.pageSize, Object.assign(values, query.value)).then(res => {
    const pageData = res.data.data;
    pageScope.total = pageData.total;
    dataScope.value = pageData.records;
    selectionListScope.value = [];
    scopeLoading.value = false;
  });
};

// scope 侧：条件检索
const searchChangeScope = (params: Partial<ScopeEntity>, done: () => void) => {
  onLoadScope(pageScope, params);
  done();
};

// scope 侧：重置检索条件
const searchResetScope = () => {
  onLoadScope(pageScope);
};

// scope 侧：切换页码
const currentChangeScope = (currentPage: number) => {
  pageScope.currentPage = currentPage;
};

// scope 侧：调整每页条数
const sizeChangeScope = (pageSize: number) => {
  pageScope.pageSize = pageSize;
};

// scope 侧：记录当前选中行
const selectionChangeScope = (list: ScopeEntity[]) => {
  selectionListScope.value = list;
};

// scope 侧：新增提交
const rowSaveScope = (row: ScopeForm, done: () => void, loading: () => void) => {
  row = {
    ...row,
    menuId: scopeMenuId.value,
  };
  addDataScope(row).then(
    () => {
      onLoadScope(pageScope);
      ElMessage({
        type: 'success',
        message: '操作成功!',
      });
      done();
    },
    error => {
      window.console.log(error);
      loading();
    }
  );
};

// scope 侧：编辑提交
const rowUpdateScope = (row: ScopeForm, index: number, done: () => void, loading: () => void) => {
  row = {
    ...row,
    menuId: scopeMenuId.value,
  };
  updateDataScope(row).then(
    () => {
      onLoadScope(pageScope);
      ElMessage({
        type: 'success',
        message: '操作成功!',
      });
      done();
    },
    error => {
      window.console.log(error);
      loading();
    }
  );
};

// scope 侧：删除单行
const rowDelScope = (row: ScopeEntity) => {
  ElMessageBox.confirm('确定将选择数据删除?', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      return removeDataScope(row.id);
    })
    .then(() => {
      onLoadScope(pageScope);
      ElMessage({
        type: 'success',
        message: '操作成功!',
      });
    });
};

// scope 侧：批量删除选中行
const handleDeleteScope = () => {
  if (selectionListScope.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  ElMessageBox.confirm('确定将选择数据删除?', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      return removeDataScope(scopeIds.value);
    })
    .then(() => {
      onLoadScope(pageScope);
      ElMessage({
        type: 'success',
        message: '操作成功!',
      });
      crudScopeRef.value.toggleSelection();
    });
};

// scope 侧：打开表单前处理（新增触发联动，编辑加载详情）
const beforeOpenScope = (done: () => void, type: string) => {
  if (['add'].includes(type)) {
    watchMode.value = true;
    initScope();
  }
  if (['edit', 'view'].includes(type)) {
    watchMode.value = false;
    getMenuDataScope(formScope.value.id).then(res => {
      formScope.value = res.data.data;
    });
  }
  done();
};
</script>
