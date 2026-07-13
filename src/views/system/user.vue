<template>
  <basic-container>
    <avue-crud :option="option"
               :table-loading="loading"
               :data="data"
               ref="crudRef"
               v-model="form"
               :permission="permissionList"
               v-model:search="search"
               @row-del="rowDel"
               @row-update="rowUpdate"
               @row-save="rowSave"
               :before-open="beforeOpen"
               :page="page"
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
                   v-if="permission.user_delete"
                   @click="handleDelete">删 除
        </el-button>
        <el-button type="info"
                   plain
                   v-if="userInfo.authority.includes('admin')"
                   icon="el-icon-user"
                   @click="handleGrant">角色配置
        </el-button>
        <el-button type="primary"
                   plain
                   v-if="permission.user_reset"
                   icon="el-icon-refresh"
                   @click="handleReset">密码重置
        </el-button>
        <el-button
                  type="info"
                  plain
                  v-if="userInfo.authority.includes('admin')"
                  icon="el-icon-coordinate"
                  @click="handleLock"
        >账号解封
        </el-button>
        <el-button type="success"
                   plain
                   v-if="userInfo.authority.includes('admin')"
                   icon="el-icon-upload"
                   @click="handleImport">导入
        </el-button>
        <el-button type="warning"
                   plain
                   v-if="userInfo.authority.includes('admin')"
                   icon="el-icon-download"
                   @click="handleExport">导出
        </el-button>
      </template>
      <template #roleId="{row}">
        <el-tag>{{row.roleName}}</el-tag>
      </template>
      <template #deptId="{row}">
        <el-tag>{{row.deptName}}</el-tag>
      </template>
    </avue-crud>
    <el-dialog title="用户角色配置"
               append-to-body
               v-model="roleBox"
               width="345px">
      <el-row justify="space-between"
              align="middle"
              style="margin-bottom: 12px; background: #f5f7fa; padding: 6px 10px; border-radius: 4px">
        <span style="display: inline-flex; align-items: center">
          <el-switch v-model="roleLinked"
                     active-text="节点联动"
                     size="small"
                     @change="handleLinkedChange('treeRole')" />
          <el-tooltip content="开启后勾选父节点会自动勾选所有子节点，关闭则可独立勾选任意节点"
                      placement="top">
            <el-icon style="margin-left: 4px; color: #909399; cursor: pointer"><el-icon-question-filled /></el-icon>
          </el-tooltip>
        </span>
        <el-button-group>
          <el-button size="small"
                     plain
                     @click="handleSelectAll('treeRole', roleGrantList)">全选</el-button>
          <el-button size="small"
                     plain
                     @click="handleInvertSelect('treeRole', roleGrantList, roleLinked)">反选</el-button>
        </el-button-group>
      </el-row>
      <el-tree :data="roleGrantList"
               show-checkbox
               :check-strictly="!roleLinked"
               default-expand-all
               node-key="id"
               ref="treeRoleRef"
               :default-checked-keys="roleTreeObj"
               :props="props">
      </el-tree>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="roleBox = false">取 消</el-button>
          <el-button type="primary"
                     @click="submitRole">确 定</el-button>
        </span>
      </template>
    </el-dialog>
    <el-dialog title="用户数据导入"
               append-to-body
               v-model="excelBox"
               width="555px">
      <avue-form :option="excelOption"
                 v-model="excelForm"
                 :upload-after="uploadAfter">
        <template #excel-template="{}">
          <el-button type="primary"
                     @click="handleTemplate()">
            点击下载<i class="el-icon-download el-icon--right"></i>
          </el-button>
        </template>
      </avue-form>
    </el-dialog>
  </basic-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox, ElTree } from 'element-plus';
import { getList, getUser, remove, update, add, grant, unlock, resetPassword } from '@/api/system/user';
import { getDeptTree } from '@/api/system/dept';
import { getRoleTree } from '@/api/system/role';
import { getPostList } from '@/api/system/post';
import website from '@/config/website';
import { baseUrl } from '@/config/env';
import { validData, findColumn } from '@/utils/util';
import { getToken } from '@/utils/auth';
import func from '@/utils/func';

// 数据实体
interface UserEntity {
  id: string;
  account?: string;
  tenantId?: string;
  password?: string;
  password2?: string;
  name?: string;
  realName?: string;
  roleId?: string | string[];
  deptId?: string | string[];
  postId?: string | string[];
  code?: string;
  phone?: string;
  email?: string;
  sex?: number;
  birthday?: string;
  statusName?: string;
  roleName?: string;
  deptName?: string;
}

// 新增与编辑共用的表单模型，字段均可选
type UserForm = Partial<UserEntity>;

// 角色授权树节点
interface RoleTreeNode {
  id: string;
  title?: string;
  children?: RoleTreeNode[];
}

// 权限
const store = useStore();
const userInfo = computed(() => store.getters.userInfo);
const permission = computed(() => store.getters.permission);

// 表格实例与数据状态
const crudRef = ref();
const treeRoleRef = ref<InstanceType<typeof ElTree>>();
const form = ref<UserForm>({});
const search = ref<Partial<UserEntity>>({});
const data = ref<UserEntity[]>([]);
const selectionList = ref<UserEntity[]>([]);
const query = ref<Partial<UserEntity>>({});
const loading = ref(true);

// 分页参数
const page = reactive({
  pageSize: 10,
  currentPage: 1,
  total: 0,
});

// 选中行 id 集合，供批量删除使用
const ids = computed(() => selectionList.value.map(ele => ele.id).join(','));

// 角色授权弹窗状态
const roleBox = ref(false);
const roleLinked = ref(false);
const roleGrantList = ref<RoleTreeNode[]>([]);
const roleTreeObj = ref<string[]>([]);
const props = reactive({
  label: 'title',
  value: 'key',
});

// 导入弹窗状态
const excelBox = ref(false);
const excelForm = ref<Record<string, unknown>>({});

// 校验密码是否填写
const validatePass = (rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (value === '') {
    callback(new Error('请输入密码'));
  } else {
    callback();
  }
};
// 校验确认密码是否与密码一致
const validatePass2 = (rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (value === '') {
    callback(new Error('请再次输入密码'));
  } else if (value !== form.value.password) {
    callback(new Error('两次输入密码不一致!'));
  } else {
    callback();
  }
};

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
      label: '登录账号',
      prop: 'account',
      search: true,
      rules: [{
        required: true,
        message: '请输入登录账号',
        trigger: 'blur',
      }],
      span: website.tenantMode ? 12 : 24,
    },
    {
      label: '所属租户',
      prop: 'tenantId',
      type: 'tree',
      dicUrl: baseUrl + '/blade-system/tenant/select',
      props: {
        label: 'tenantName',
        value: 'tenantId',
      },
      hide: !website.tenantMode,
      addDisplay: website.tenantMode,
      editDisplay: website.tenantMode,
      viewDisplay: website.tenantMode,
      search: false,
      rules: [{
        required: true,
        message: '请输入所属租户',
        trigger: 'click',
      }],
    },
    {
      label: '密码',
      prop: 'password',
      hide: true,
      editDisplay: false,
      viewDisplay: false,
      rules: [{ required: true, validator: validatePass, trigger: 'blur' }],
    },
    {
      label: '确认密码',
      prop: 'password2',
      hide: true,
      editDisplay: false,
      viewDisplay: false,
      rules: [{ required: true, validator: validatePass2, trigger: 'blur' }],
    },
    {
      label: '用户昵称',
      prop: 'name',
      rules: [{
        required: true,
        message: '请输入用户昵称',
        trigger: 'blur',
      }],
    },
    {
      label: '用户姓名',
      prop: 'realName',
      search: true,
      rules: [{
        required: true,
        message: '请输入用户姓名',
        trigger: 'blur',
      }],
    },
    {
      label: '所属角色',
      prop: 'roleId',
      multiple: true,
      type: 'tree',
      dicData: [],
      props: {
        label: 'title',
      },
      slot: true,
      checkStrictly: true,
      rules: [{
        required: true,
        message: '请选择所属角色',
        trigger: 'click',
      }],
    },
    {
      label: '所属部门',
      prop: 'deptId',
      type: 'tree',
      multiple: true,
      dicData: [],
      props: {
        label: 'title',
      },
      slot: true,
      checkStrictly: true,
      rules: [{
        required: true,
        message: '请选择所属部门',
        trigger: 'click',
      }],
    },
    {
      label: '用户编号',
      prop: 'code',
      hide: true,
    },
    {
      label: '所属岗位',
      prop: 'postId',
      type: 'tree',
      multiple: true,
      dicData: [],
      hide: true,
      props: {
        label: 'postName',
        value: 'id',
      },
      rules: [{
        required: true,
        message: '请选择所属岗位',
        trigger: 'click',
      }],
    },
    {
      label: '手机号码',
      prop: 'phone',
      overHidden: true,
    },
    {
      label: '电子邮箱',
      prop: 'email',
      hide: true,
      overHidden: true,
    },
    {
      label: '用户性别',
      prop: 'sex',
      type: 'select',
      dicData: [
        {
          label: '男',
          value: 1,
        },
        {
          label: '女',
          value: 2,
        },
        {
          label: '未知',
          value: 3,
        },
      ],
      hide: true,
    },
    {
      label: '用户生日',
      type: 'date',
      prop: 'birthday',
      format: 'YYYY-MM-DD HH:mm:ss',
      valueFormat: 'YYYY-MM-DD HH:mm:ss',
      hide: true,
    },
    {
      label: '账号状态',
      prop: 'statusName',
      hide: true,
      display: false,
    },
  ],
});

// 导入表单配置
const excelOption = reactive({
  submitBtn: false,
  emptyBtn: false,
  column: [
    {
      label: '模板上传',
      prop: 'excelFile',
      type: 'upload',
      drag: true,
      loadText: '模板上传中，请稍等',
      span: 24,
      propsHttp: {
        res: 'data',
      },
      tip: '请上传 .xls,.xlsx 标准格式文件',
      action: baseUrl + '/blade-system/user/import-user',
    },
    {
      label: '模板下载',
      prop: 'excelTemplate',
      formslot: true,
      span: 24,
    },
  ],
});

// 行操作按钮权限
const permissionList = computed(() => ({
  addBtn: validData(permission.value.user_add, false),
  viewBtn: validData(permission.value.user_view, false),
  delBtn: validData(permission.value.user_delete, false),
  editBtn: validData(permission.value.user_edit, false),
}));

// 切换租户时联动刷新部门、角色、岗位下拉数据
watch(() => form.value.tenantId, () => {
  if (form.value.tenantId !== '') {
    getDeptTree(form.value.tenantId).then(res => {
      const column = findColumn(option.column, 'deptId');
      if (column) column.dicData = res.data.data;
    });
    getRoleTree(form.value.tenantId).then(res => {
      const column = findColumn(option.column, 'roleId');
      if (column) column.dicData = res.data.data;
    });
    getPostList(form.value.tenantId).then(res => {
      const column = findColumn(option.column, 'postId');
      if (column) column.dicData = res.data.data;
    });
  }
});

// 加载列表数据，并按当前租户填充部门、角色、岗位下拉
const onLoad = (pageParam: { currentPage: number; pageSize: number }, params: Partial<UserEntity> = {}) => {
  loading.value = true;
  getList(pageParam.currentPage, pageParam.pageSize, Object.assign(params, query.value)).then(res => {
    const list = res.data.data;
    page.total = list.total;
    data.value = list.records;
    loading.value = false;
  });
  getDeptTree(form.value.tenantId).then(res => {
    const column = findColumn(option.column, 'deptId');
    if (column) column.dicData = res.data.data;
  });
  getRoleTree(form.value.tenantId).then(res => {
    const column = findColumn(option.column, 'roleId');
    if (column) column.dicData = res.data.data;
  });
  getPostList(form.value.tenantId).then(res => {
    const column = findColumn(option.column, 'postId');
    if (column) column.dicData = res.data.data;
  });
};

// 条件检索
const searchChange = (params: Partial<UserEntity>, done: () => void) => {
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
const selectionChange = (list: UserEntity[]) => {
  selectionList.value = list;
};

// 新增用户
const rowSave = (row: UserForm, done: () => void, loading: () => void) => {
  row.deptId = func.join(row.deptId);
  row.roleId = func.join(row.roleId);
  row.postId = func.join(row.postId);
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

// 编辑用户
const rowUpdate = (row: UserForm, index: number, done: () => void, loading: () => void) => {
  row.deptId = func.join(row.deptId);
  row.roleId = func.join(row.roleId);
  row.postId = func.join(row.postId);
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
const rowDel = (row: UserEntity) => {
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

// 按名称映射取回对应的树组件实例，供批量勾选操作统一调用
const getTreeRef = (name: string) => {
  const refs: Record<string, InstanceType<typeof ElTree> | undefined> = {
    treeRole: treeRoleRef.value,
  };
  return refs[name];
};

// 递归收集所有节点的 id
const getAllNodeKeys = (nodes: RoleTreeNode[]) => {
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
const getLeafKeys = (nodes: RoleTreeNode[]) => {
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

// 全选授权树节点
const handleSelectAll = (treeRef: string, dataList: RoleTreeNode[]) => {
  const tree = getTreeRef(treeRef);
  if (!tree) return;
  const allKeys = getAllNodeKeys(dataList);
  tree.setCheckedKeys(allKeys);
};

// 反选授权树节点
const handleInvertSelect = (treeRef: string, dataList: RoleTreeNode[], isLinked: boolean) => {
  const tree = getTreeRef(treeRef);
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

// 切换节点联动时保留已勾选状态
const handleLinkedChange = (treeRef: string) => {
  const tree = getTreeRef(treeRef);
  if (!tree) return;
  const checkedKeys = tree.getCheckedKeys();
  const halfCheckedKeys = tree.getHalfCheckedKeys();
  nextTick(() => {
    tree.setCheckedKeys([...checkedKeys, ...halfCheckedKeys]);
  });
};

// 打开角色配置弹窗并回填已授角色
const handleGrant = () => {
  if (selectionList.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  roleTreeObj.value = [];
  roleLinked.value = false;
  if (selectionList.value.length === 1) {
    roleTreeObj.value = (selectionList.value[0].roleId as string).split(',');
  }
  getRoleTree().then(res => {
    roleGrantList.value = res.data.data;
    roleBox.value = true;
  });
};

// 提交角色授权
const submitRole = () => {
  const roleList = treeRoleRef.value!.getCheckedKeys().join(',');
  grant(ids.value, roleList).then(() => {
    roleBox.value = false;
    ElMessage({
      type: 'success',
      message: '操作成功!',
    });
    onLoad(page);
  });
};

// 批量重置密码为初始密码
const handleReset = () => {
  if (selectionList.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  ElMessageBox.confirm('确定将选择账号密码重置为初始密码?', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      return resetPassword(ids.value);
    })
    .then(() => {
      ElMessage({
        type: 'success',
        message: '操作成功!',
      });
      crudRef.value.toggleSelection();
    });
};

// 批量解封账号
const handleLock = () => {
  if (selectionList.value.length === 0) {
    ElMessage.warning('请选择至少一条数据');
    return;
  }
  ElMessageBox.confirm('确定将选择账号解封？', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      return unlock(ids.value);
    })
    .then(() => {
      ElMessage({
        type: 'success',
        message: '操作成功!',
      });
    });
};

// 打开数据导入弹窗
const handleImport = () => {
  excelBox.value = true;
};

// 导入完成后关闭弹窗并刷新列表
const uploadAfter = (res: unknown, done: () => void, loading: () => void, column: unknown) => {
  window.console.log(column);
  done();
  excelBox.value = false;
  refreshChange();
};

// 导出用户数据
const handleExport = () => {
  ElMessageBox.confirm('是否导出用户数据?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    window.open(`${baseUrl}/blade-system/user/export-user?blade-auth=bearer ${getToken()}&account=${search.value.account}&realName=${search.value.realName}`);
  });
};

// 下载导入模板
const handleTemplate = () => {
  window.open(`${baseUrl}/blade-system/user/export-template?blade-auth=bearer ${getToken()}`);
};

// 编辑或查看前回填表单数据
const beforeOpen = (done: () => void, type: string) => {
  if (['edit', 'view'].includes(type)) {
    getUser(form.value.id).then(res => {
      form.value = res.data.data;
      if (form.value.hasOwnProperty('deptId')) {
        form.value.deptId = (form.value.deptId as string).split(',');
      }
      if (form.value.hasOwnProperty('roleId')) {
        form.value.roleId = (form.value.roleId as string).split(',');
      }
      if (form.value.hasOwnProperty('postId')) {
        form.value.postId = (form.value.postId as string).split(',');
      }
    });
  }
  done();
};
</script>

<style>
</style>
