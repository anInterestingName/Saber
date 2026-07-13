<template>
  <basic-container>
    <avue-crud
      :option="option"
      :table-loading="loading"
      :data="data"
      v-model:page="page"
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
      @on-load="onLoad"
    >
      <template #menu-left>
        <el-button
          type="danger"
          icon="el-icon-delete"
          plain
          v-if="permission.topmenu_delete"
          @click="handleDelete"
          >删 除
        </el-button>
        <el-button
          icon="el-icon-setting"
          @click="handleMenuSetting"
          v-if="permission.topmenu_setting"
          plain
          >菜单配置
        </el-button>
      </template>
      <template #menu="scope">
        <el-button
          v-if="permission.topmenu_setting"
          type="primary"
          text
          icon="el-icon-setting"
          @click.stop="handleRowMenuSetting(scope.row)"
          >配置
        </el-button>
      </template>
      <template #name="{ row }">
        <i :class="row.source" style="margin-right: 5px" />
        <span>{{ row.name }}</span>
      </template>
      <template #source="{ row }">
        <div style="text-align: center">
          <i :class="row.source"></i>
        </div>
      </template>
      <template #sort="{ row }">
        <el-input-number
          v-model="row.sort"
          @change="sortChange(row)"
          :min="1"
          :max="100"
        ></el-input-number>
      </template>
    </avue-crud>
    <el-dialog
      title="下级菜单配置"
      append-to-body
      v-model="box"
      width="345px"
      @closed="handleDialogClose"
    >
      <el-row
        justify="space-between"
        align="middle"
        style="margin-bottom: 12px; background: #f5f7fa; padding: 6px 10px; border-radius: 4px"
      >
        <span style="display: inline-flex; align-items: center">
          <el-switch
            v-model="menuLinked"
            active-text="节点联动"
            size="small"
            @change="handleLinkedChange"
          />
          <el-tooltip content="开启后勾选父节点会自动勾选所有子节点，关闭则可独立勾选任意节点" placement="top">
            <el-icon style="margin-left: 4px; color: #909399; cursor: pointer"><el-icon-question-filled /></el-icon>
          </el-tooltip>
        </span>
        <el-button-group>
          <el-button size="small" plain @click="handleSelectAll">全选</el-button>
          <el-button size="small" plain @click="handleInvertSelect">反选</el-button>
        </el-button-group>
      </el-row>
      <el-tree
        :data="menuGrantList"
        show-checkbox
        :check-strictly="!menuLinked"
        node-key="id"
        ref="treeMenuRef"
        :default-checked-keys="menuTreeObj"
        :props="props"
      >
      </el-tree>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="box = false">取 消</el-button>
          <el-button type="primary" @click="submit">确 定</el-button>
        </span>
      </template>
    </el-dialog>
  </basic-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox, ElTree } from 'element-plus';
import {
  getList,
  getDetail,
  add,
  update,
  remove,
  grant,
  grantTree,
  getTopTree,
} from '@/api/system/topmenu';
import iconList from '@/config/iconList';
import { validData } from '@/utils/util';

// 数据实体
interface TopMenuEntity {
  id: string;
  name?: string;
  source?: string;
  code?: string;
  sort?: number;
  path?: string;
}

// 新增与编辑共用的表单模型，字段均可选
type TopMenuForm = Partial<TopMenuEntity>;

// 授权树节点
interface MenuNode {
  id: string;
  children?: MenuNode[];
}

// 权限
const store = useStore();
const permission = computed(() => store.getters.permission);

// 表格实例与数据状态
const crudRef = ref();
const form = ref<TopMenuForm>({});
const data = ref<TopMenuEntity[]>([]);
const selectionList = ref<TopMenuEntity[]>([]);
const query = ref<Partial<TopMenuEntity>>({});
const loading = ref(true);

// 分页参数（整体替换，需用 ref）
const page = ref({
  pageSize: 10,
  currentPage: 1,
  total: 0,
});

// 选中行 id 集合，供批量删除使用
const ids = computed(() => selectionList.value.map(ele => ele.id).join(','));

// 选中行 id 数组，供菜单授权使用
const idsArray = computed(() => {
  const idList: string[] = [];
  selectionList.value.forEach(ele => {
    idList.push(ele.id);
  });
  return idList;
});

// 菜单授权弹窗与授权树状态
const box = ref(false);
const treeMenuRef = ref<InstanceType<typeof ElTree>>();
const menuGrantList = ref<MenuNode[]>([]);
const menuTreeObj = ref<string[]>([]);
const menuLinked = ref(false);
const currentMenuIds = ref<string[]>([]);

// 授权树控件配置
const props = reactive({
  label: 'title',
  value: 'key',
});

// 表格配置
const option = reactive({
  height: 'auto',
  calcHeight: 32,
  tip: false,
  searchShow: true,
  searchMenuSpan: 6,
  border: true,
  index: true,
  viewBtn: true,
  selection: true,
  menuWidth: 300,
  dialogWidth: 900,
  dialogClickModal: false,
  column: [
    {
      label: '菜单名',
      prop: 'name',
      search: true,
      rules: [
        {
          required: true,
          message: '请输入菜单名',
          trigger: 'blur',
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
      label: '菜单排序',
      prop: 'sort',
      type: 'number',
      slot: true,
      rules: [
        {
          required: true,
          message: '请输入菜单排序',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '菜单路由',
      prop: 'path',
      span: 24,
      hide: true,
      rules: [
        {
          required: false,
          message: '请输入菜单路由',
          trigger: 'blur',
        },
      ],
    },
  ],
});

// 行操作按钮权限
const permissionList = computed(() => ({
  addBtn: validData(permission.value.topmenu_add, false),
  viewBtn: validData(permission.value.topmenu_view, false),
  delBtn: validData(permission.value.topmenu_delete, false),
  editBtn: validData(permission.value.topmenu_edit, false),
}));

// 加载列表数据
const onLoad = (
  pageData: { currentPage: number; pageSize: number },
  params: Partial<TopMenuEntity> = {}
) => {
  loading.value = true;
  getList(pageData.currentPage, pageData.pageSize, Object.assign(params, query.value)).then(res => {
    const resData = res.data.data;
    page.value.total = resData.total;
    data.value = resData.records;
    loading.value = false;
    selectionClear();
  });
};

// 条件检索
const searchChange = (params: Partial<TopMenuEntity>, done: () => void) => {
  query.value = params;
  page.value.currentPage = 1;
  onLoad(page.value, params);
  done();
};

// 重置检索条件
const searchReset = () => {
  query.value = {};
  onLoad(page.value);
};

// 切换页码
const currentChange = (currentPage: number) => {
  page.value.currentPage = currentPage;
};

// 调整每页条数
const sizeChange = (pageSize: number) => {
  page.value.pageSize = pageSize;
};

// 刷新当前列表
const refreshChange = () => {
  onLoad(page.value, query.value);
};

// 记录当前选中行
const selectionChange = (list: TopMenuEntity[]) => {
  selectionList.value = list;
};

// 清空选中状态
const selectionClear = () => {
  selectionList.value = [];
  crudRef.value.toggleSelection();
};

// 新增保存
const rowSave = (row: TopMenuForm, done: () => void, loading: () => void) => {
  add(row).then(
    () => {
      onLoad(page.value);
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

// 编辑保存
const rowUpdate = (row: TopMenuForm, index: number, done: () => void, loading: () => void) => {
  update(row).then(
    () => {
      onLoad(page.value);
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

// 删除单行
const rowDel = (row: TopMenuEntity) => {
  ElMessageBox.confirm('确定将选择数据删除?', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      return remove(row.id);
    })
    .then(() => {
      onLoad(page.value);
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
      onLoad(page.value);
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
    getDetail(form.value.id).then(res => {
      form.value = res.data.data;
    });
  }
  done();
};

// 修改菜单排序并即时保存
const sortChange = (row: TopMenuEntity) => {
  update(row).then(
    () => {
      onLoad(page.value);
    },
    error => {
      window.console.log(error);
    }
  );
};

// 对选中的单条顶部菜单打开下级菜单授权弹窗
const handleMenuSetting = () => {
  if (selectionList.value.length !== 1) {
    ElMessage.warning('只能选择一条数据');
    return;
  }
  currentMenuIds.value = idsArray.value;
  menuTreeObj.value = [];
  grantTree().then(res => {
    menuGrantList.value = res.data.data.menu;
    getTopTree(ids.value).then(res => {
      menuTreeObj.value = res.data.data.menu;
      box.value = true;
    });
  });
};

// 对指定行顶部菜单打开下级菜单授权弹窗
const handleRowMenuSetting = (row: TopMenuEntity) => {
  currentMenuIds.value = [row.id];
  menuTreeObj.value = [];
  grantTree().then(res => {
    menuGrantList.value = res.data.data.menu;
    getTopTree(row.id).then(res => {
      menuTreeObj.value = res.data.data.menu;
      box.value = true;
    });
  });
};

// 关闭授权弹窗时重置授权状态
const handleDialogClose = () => {
  currentMenuIds.value = [];
  menuLinked.value = false;
};

// 递归收集所有节点的 id
const getAllNodeKeys = (nodes: MenuNode[]) => {
  let keys: string[] = [];
  nodes.forEach(node => {
    keys.push(node.id);
    if (node.children && node.children.length > 0) {
      keys = keys.concat(getAllNodeKeys(node.children));
    }
  });
  return keys;
};

// 递归收集所有叶子节点的 id
const getLeafKeys = (nodes: MenuNode[]) => {
  let keys: string[] = [];
  nodes.forEach(node => {
    if (!node.children || node.children.length === 0) {
      keys.push(node.id);
    } else {
      keys = keys.concat(getLeafKeys(node.children));
    }
  });
  return keys;
};

// 全选授权树全部节点
const handleSelectAll = () => {
  const tree = treeMenuRef.value;
  if (!tree) return;
  const allKeys = getAllNodeKeys(menuGrantList.value);
  tree.setCheckedKeys(allKeys);
};

// 反选授权树节点（联动时仅针对叶子节点）
const handleInvertSelect = () => {
  const tree = treeMenuRef.value;
  if (!tree) return;
  const checkedKeys = new Set(tree.getCheckedKeys());
  if (menuLinked.value) {
    const leafKeys = getLeafKeys(menuGrantList.value);
    const invertedKeys = leafKeys.filter(key => !checkedKeys.has(key));
    tree.setCheckedKeys(invertedKeys);
  } else {
    const allKeys = getAllNodeKeys(menuGrantList.value);
    const invertedKeys = allKeys.filter(key => !checkedKeys.has(key));
    tree.setCheckedKeys(invertedKeys);
  }
};

// 切换节点联动时保留已选中及半选中节点
const handleLinkedChange = () => {
  const tree = treeMenuRef.value;
  if (!tree) return;
  const checkedKeys = tree.getCheckedKeys();
  const halfCheckedKeys = tree.getHalfCheckedKeys();
  nextTick(() => {
    tree.setCheckedKeys([...checkedKeys, ...halfCheckedKeys]);
  });
};

// 提交下级菜单授权
const submit = () => {
  const menuList = treeMenuRef.value.getCheckedKeys();
  grant(currentMenuIds.value, menuList).then(() => {
    box.value = false;
    ElMessage({
      type: 'success',
      message: '操作成功!',
    });
    onLoad(page.value);
  });
};
</script>

<style>
.none-border {
  border: 0;
  background-color: transparent !important;
}
</style>
