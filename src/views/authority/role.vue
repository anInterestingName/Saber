<template>
  <basic-container>
    <avue-crud :option="option"
               :table-loading="loading"
               :data="data"
               ref="crudRef"
               v-model="form"
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
                   v-if="permission.role_delete"
                   plain
                   @click="handleDelete">删 除
        </el-button>
        <el-button icon="el-icon-user"
                   @click="handleRole"
                   plain>权限设置
        </el-button>
      </template>
    </avue-crud>
    <el-dialog title="角色配置"
               v-model="box"
               width="345px">
      <el-tabs type="border-card">
        <el-tab-pane label="菜单权限">
          <el-row justify="space-between"
                  align="middle"
                  style="margin-bottom: 12px; background: #f5f7fa; padding: 6px 10px; border-radius: 4px">
            <span style="display: inline-flex; align-items: center">
              <el-switch v-model="menuLinked"
                         active-text="节点联动"
                         size="small"
                         @change="handleLinkedChange('treeMenu')" />
              <el-tooltip content="开启后勾选父节点会自动勾选所有子节点，关闭则可独立勾选任意节点"
                          placement="top">
                <el-icon style="margin-left: 4px; color: #909399; cursor: pointer"><el-icon-question-filled /></el-icon>
              </el-tooltip>
            </span>
            <el-button-group>
              <el-button size="small"
                         plain
                         @click="handleSelectAll('treeMenu', menuGrantList)">全选</el-button>
              <el-button size="small"
                         plain
                         @click="handleInvertSelect('treeMenu', menuGrantList, menuLinked)">反选</el-button>
            </el-button-group>
          </el-row>
          <el-tree :data="menuGrantList"
                   show-checkbox
                   :check-strictly="!menuLinked"
                   node-key="id"
                   ref="treeMenuRef"
                   :default-checked-keys="menuTreeObj"
                   :props="props">
          </el-tree>
        </el-tab-pane>
        <el-tab-pane label="数据权限">
          <el-row justify="space-between"
                  align="middle"
                  style="margin-bottom: 12px; background: #f5f7fa; padding: 6px 10px; border-radius: 4px">
            <span style="display: inline-flex; align-items: center">
              <el-switch v-model="dataScopeLinked"
                         active-text="节点联动"
                         size="small"
                         @change="handleLinkedChange('treeDataScope')" />
              <el-tooltip content="开启后勾选父节点会自动勾选所有子节点，关闭则可独立勾选任意节点"
                          placement="top">
                <el-icon style="margin-left: 4px; color: #909399; cursor: pointer"><el-icon-question-filled /></el-icon>
              </el-tooltip>
            </span>
            <el-button-group>
              <el-button size="small"
                         plain
                         @click="handleSelectAll('treeDataScope', dataScopeGrantList)">全选</el-button>
              <el-button size="small"
                         plain
                         @click="handleInvertSelect('treeDataScope', dataScopeGrantList, dataScopeLinked)">反选</el-button>
            </el-button-group>
          </el-row>
          <el-tree :data="dataScopeGrantList"
                   show-checkbox
                   :check-strictly="!dataScopeLinked"
                   node-key="id"
                   ref="treeDataScopeRef"
                   :default-checked-keys="dataScopeTreeObj"
                   :props="props">
          </el-tree>
        </el-tab-pane>
        <el-tab-pane label="接口权限">
          <el-row justify="space-between"
                  align="middle"
                  style="margin-bottom: 12px; background: #f5f7fa; padding: 6px 10px; border-radius: 4px">
            <span style="display: inline-flex; align-items: center">
              <el-switch v-model="apiScopeLinked"
                         active-text="节点联动"
                         size="small"
                         @change="handleLinkedChange('treeApiScope')" />
              <el-tooltip content="开启后勾选父节点会自动勾选所有子节点，关闭则可独立勾选任意节点"
                          placement="top">
                <el-icon style="margin-left: 4px; color: #909399; cursor: pointer"><el-icon-question-filled /></el-icon>
              </el-tooltip>
            </span>
            <el-button-group>
              <el-button size="small"
                         plain
                         @click="handleSelectAll('treeApiScope', apiScopeGrantList)">全选</el-button>
              <el-button size="small"
                         plain
                         @click="handleInvertSelect('treeApiScope', apiScopeGrantList, apiScopeLinked)">反选</el-button>
            </el-button-group>
          </el-row>
          <el-tree :data="apiScopeGrantList"
                   show-checkbox
                   :check-strictly="!apiScopeLinked"
                   node-key="id"
                   ref="treeApiScopeRef"
                   :default-checked-keys="apiScopeTreeObj"
                   :props="props">
          </el-tree>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="box = false">取 消</el-button>
          <el-button type="primary"
                     @click="submit">确 定</el-button>
        </span>
      </template>
    </el-dialog>
  </basic-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox, ElTree } from 'element-plus';
import { add, getList, getRole, getRoleTree, grant, grantTree, remove, update } from '@/api/system/role';
import { validData, findColumn } from '@/utils/util';
import website from '@/config/website';
import { baseUrl } from '@/config/env';

// 数据实体
interface RoleEntity {
  id: string;
  roleName?: string;
  tenantId?: string;
  roleAlias?: string;
  parentId?: string;
  sort?: number;
}

// 新增与编辑共用的表单模型，字段均可选
type RoleForm = Partial<RoleEntity>;

// 授权树节点
interface TreeNode {
  id: string;
  title?: string;
  key?: string;
  children?: TreeNode[];
}

// 权限
const store = useStore();
const permission = computed(() => store.getters.permission);

// 表格实例与数据状态
const crudRef = ref();
const form = ref<RoleForm>({});
const data = ref<RoleEntity[]>([]);
const selectionList = ref<RoleEntity[]>([]);
const query = ref<Partial<RoleEntity>>({});
const loading = ref(true);

// 分页参数
const page = reactive({
  pageSize: 10,
  currentPage: 1,
  total: 0,
});

// 选中行 id 集合，供批量删除与授权提交使用
const ids = computed(() => selectionList.value.map(ele => ele.id).join(','));
const idsArray = computed(() => {
  const idList: string[] = [];
  selectionList.value.forEach(ele => {
    idList.push(ele.id);
  });
  return idList;
});

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
  column: [
    {
      label: '角色名称',
      prop: 'roleName',
      search: true,
      span: 24,
      rules: [
        {
          required: true,
          message: '请输入角色名称',
          trigger: 'blur',
        },
      ],
    },
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
      search: website.tenantMode,
      rules: [{
        required: true,
        message: '请输入所属租户',
        trigger: 'click',
      }],
    },
    {
      label: '角色别名',
      prop: 'roleAlias',
      search: true,
      span: 24,
      rules: [
        {
          required: true,
          message: '请输入角色别名',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '上级角色',
      prop: 'parentId',
      dicData: [],
      type: 'tree',
      hide: true,
      span: 24,
      props: {
        label: 'title',
      },
      rules: [
        {
          required: false,
          message: '请选择上级角色',
          trigger: 'click',
        },
      ],
    },
    {
      label: '角色排序',
      prop: 'sort',
      type: 'number',
      span: 24,
      rules: [
        {
          required: true,
          message: '请输入角色排序',
          trigger: 'blur',
        },
      ],
    },
  ],
});

// 行操作按钮权限
const permissionList = computed(() => ({
  addBtn: validData(permission.value.role_add, false),
  viewBtn: validData(permission.value.role_view, false),
  delBtn: validData(permission.value.role_delete, false),
  editBtn: validData(permission.value.role_edit, false),
}));

// 授权树状态
const box = ref(false);
const props = reactive({
  label: 'title',
  value: 'key',
});
const menuGrantList = ref<TreeNode[]>([]);
const dataScopeGrantList = ref<TreeNode[]>([]);
const apiScopeGrantList = ref<TreeNode[]>([]);
const menuTreeObj = ref<(string | number)[]>([]);
const dataScopeTreeObj = ref<(string | number)[]>([]);
const apiScopeTreeObj = ref<(string | number)[]>([]);
const menuLinked = ref(false);
const dataScopeLinked = ref(false);
const apiScopeLinked = ref(false);
const treeMenuRef = ref<InstanceType<typeof ElTree>>();
const treeDataScopeRef = ref<InstanceType<typeof ElTree>>();
const treeApiScopeRef = ref<InstanceType<typeof ElTree>>();
const treeRefMap: Record<string, typeof treeMenuRef> = {
  treeMenu: treeMenuRef,
  treeDataScope: treeDataScopeRef,
  treeApiScope: treeApiScopeRef,
};

// 加载列表数据，并刷新上级角色树
const onLoad = (pageData: { currentPage: number; pageSize: number }, params: Partial<RoleEntity> = {}) => {
  loading.value = true;
  getList(pageData.currentPage, pageData.pageSize, Object.assign(params, query.value)).then(res => {
    data.value = res.data.data;
    loading.value = false;
    getRoleTree().then(res => {
      const column = findColumn(option.column, 'parentId');
      if (column) column.dicData = res.data.data;
    });
  });
};

// 条件检索
const searchChange = (params: Partial<RoleEntity>, done: () => void) => {
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
const selectionChange = (list: RoleEntity[]) => {
  selectionList.value = list;
};

// 新增保存
const rowSave = (row: RoleForm, done: () => void, loading: () => void) => {
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
const rowUpdate = (row: RoleForm, index: number, done: () => void, loading: () => void) => {
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
const rowDel = (row: RoleEntity) => {
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

// 打开权限设置对话框，加载授权树与当前角色已选项
const handleRole = () => {
  if (selectionList.value.length !== 1) {
    ElMessage.warning('只能选择一条数据');
    return;
  }
  menuTreeObj.value = [];
  dataScopeTreeObj.value = [];
  apiScopeTreeObj.value = [];
  menuLinked.value = false;
  dataScopeLinked.value = false;
  apiScopeLinked.value = false;
  grantTree().then(res => {
    menuGrantList.value = res.data.data.menu;
    dataScopeGrantList.value = res.data.data.dataScope;
    apiScopeGrantList.value = res.data.data.apiScope;
    getRole(ids.value).then(res => {
      menuTreeObj.value = res.data.data.menu;
      dataScopeTreeObj.value = res.data.data.dataScope;
      apiScopeTreeObj.value = res.data.data.apiScope;
      box.value = true;
    });
  });
};

// 递归收集所有节点的 id
const getAllNodeKeys = (nodes: TreeNode[]): string[] => {
  let keys: string[] = [];
  nodes.forEach(node => {
    keys.push(node.id);
    if (node.children && node.children.length > 0) {
      keys = keys.concat(getAllNodeKeys(node.children));
    }
  });
  return keys;
};

// 递归收集叶子节点的 id
const getLeafKeys = (nodes: TreeNode[]): string[] => {
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

// 全选当前授权树的所有节点
const handleSelectAll = (treeRef: string, dataList: TreeNode[]) => {
  const tree = treeRefMap[treeRef]?.value;
  if (!tree) return;
  const allKeys = getAllNodeKeys(dataList);
  tree.setCheckedKeys(allKeys);
};

// 反选当前授权树，联动开启时仅针对叶子节点
const handleInvertSelect = (treeRef: string, dataList: TreeNode[], isLinked: boolean) => {
  const tree = treeRefMap[treeRef]?.value;
  if (!tree) return;
  const checkedKeys = new Set(tree.getCheckedKeys());
  if (isLinked) {
    const leafKeys = getLeafKeys(dataList);
    const invertedKeys = leafKeys.filter(key => !checkedKeys.has(key));
    tree.setCheckedKeys(invertedKeys);
  } else {
    const allKeys = getAllNodeKeys(dataList);
    const invertedKeys = allKeys.filter(key => !checkedKeys.has(key));
    tree.setCheckedKeys(invertedKeys);
  }
};

// 切换节点联动开关，保留当前已勾选与半选节点
const handleLinkedChange = (treeRef: string) => {
  const tree = treeRefMap[treeRef]?.value;
  if (!tree) return;
  const checkedKeys = tree.getCheckedKeys();
  const halfCheckedKeys = tree.getHalfCheckedKeys();
  nextTick(() => {
    tree.setCheckedKeys([...checkedKeys, ...halfCheckedKeys]);
  });
};

// 提交授权，保存菜单、数据、接口三类权限的勾选结果
const submit = () => {
  const menuList = treeMenuRef.value.getCheckedKeys();
  const dataScopeList = treeDataScopeRef.value.getCheckedKeys();
  const apiScopeList = treeApiScopeRef.value.getCheckedKeys();
  grant(idsArray.value, menuList, dataScopeList, apiScopeList).then(() => {
    box.value = false;
    ElMessage({
      type: 'success',
      message: '操作成功!',
    });
    onLoad(page);
  });
};
</script>

<style>
</style>
