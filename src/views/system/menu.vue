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
                   v-if="permission.menu_delete"
                   plain
                   @click="handleDelete">删 除
        </el-button>
      </template>
      <template #menu="scope">
        <el-button text
                   type="primary"
                   icon="el-icon-plus"
                   @click.stop="handleAdd(scope.row)"
                   v-if="userInfo.authority.includes('admin')">新增子项
        </el-button>
      </template>
      <template #source="{row}">
        <div style="text-align:center">
          <i :class="row.source"></i>
        </div>
      </template>
    </avue-crud>
  </basic-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { add, getList, getMenu, remove, update } from '@/api/system/menu';
import iconList from '@/config/iconList';
import { baseUrl } from '@/config/env';
import { validData } from '@/utils/util';
import type { ColumnSchema } from '@/types/column';

// 数据实体
interface MenuEntity {
  id: string;
  name?: string;
  path?: string;
  parentId?: string;
  source?: string;
  code?: string;
  category?: number;
  alias?: string;
  action?: number;
  sort?: number;
  isOpen?: number;
  remark?: string;
  hasChildren?: boolean;
}

// 新增与编辑共用的表单模型，字段均可选
type MenuForm = Partial<MenuEntity>;

// 权限
const store = useStore();
const userInfo = computed(() => store.getters.userInfo);
const permission = computed(() => store.getters.permission);

// 表格实例与数据状态
const crudRef = ref();
const form = ref<MenuForm>({});
const data = ref<MenuEntity[]>([]);
const selectionList = ref<MenuEntity[]>([]);
const query = ref<Partial<MenuEntity>>({});
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
          value: 1,
        },
        {
          label: '操作栏',
          value: 2,
        },
        {
          label: '工具操作栏',
          value: 3,
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

// 行操作按钮权限
const permissionList = computed(() => ({
  addBtn: validData(permission.value.menu_add, false),
  viewBtn: validData(permission.value.menu_view, false),
  delBtn: validData(permission.value.menu_delete, false),
  editBtn: validData(permission.value.menu_edit, false),
}));

// 加载列表数据
const onLoad = (pageData: { currentPage: number; pageSize: number }, params: Partial<MenuEntity> = {}) => {
  loading.value = true;
  getList(pageData.currentPage, pageData.pageSize, Object.assign(params, query.value)).then(res => {
    loading.value = false;
    data.value = res.data.data;
  });
};

// 条件检索
const searchChange = (params: Partial<MenuEntity>, done: () => void) => {
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
const selectionChange = (list: MenuEntity[]) => {
  selectionList.value = list;
};

// 在指定行下新增子级菜单
const handleAdd = (row: MenuEntity) => {
  crudRef.value.modelValue.parentId = row.id;
  crudRef.value.option.column.filter((item: ColumnSchema) => {
    if (item.prop === 'parentId') {
      item.value = row.id;
      item.addDisabled = true;
    }
  });
  crudRef.value.rowAdd();
};

// 新增保存
const rowSave = (row: MenuForm, done: () => void, loading: () => void) => {
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
const rowUpdate = (row: MenuForm, index: number, done: () => void, loading: () => void) => {
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

// 编辑或查看前加载菜单详情
const beforeOpen = (done: () => void, type: string) => {
  if (['edit', 'view'].includes(type)) {
    getMenu(form.value.id).then(res => {
      form.value = Object.assign(res.data.data, {
        hasChildren: form.value.hasChildren,
      });
    });
  }
  done();
};
</script>

<style>
</style>
