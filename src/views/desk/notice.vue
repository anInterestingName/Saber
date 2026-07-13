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
                   v-if="permission.notice_delete"
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
import { getList, remove, update, add, getNotice } from '@/api/desk/notice';
import { validData } from '@/utils/util';
import { baseUrl } from '@/config/env';

// 数据实体
interface NoticeEntity {
  id: string;
  title?: string;
  category?: number;
  categoryName?: string;
  releaseTime?: string;
  content?: string;
}

// 新增与编辑共用的表单模型，字段均可选
type NoticeForm = Partial<NoticeEntity>;

// 权限
const store = useStore();
const permission = computed(() => store.getters.permission);

// 表格实例与数据状态
const crudRef = ref();
const form = ref<NoticeForm>({});
const data = ref<NoticeEntity[]>([]);
const selectionList = ref<NoticeEntity[]>([]);
const query = ref<Partial<NoticeEntity>>({});
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
      label: '通知标题',
      prop: 'title',
      span: 24,
      search: true,
      rules: [
        {
          required: true,
          message: '请输入通知标题',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '通知类型',
      type: 'select',
      dicUrl: baseUrl + '/blade-system/dict/dictionary?code=notice',
      props: {
        label: 'dictValue',
        value: 'dictKey',
      },
      slot: true,
      prop: 'category',
      search: true,
      rules: [
        {
          required: true,
          message: '请输入通知类型',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '通知日期',
      prop: 'releaseTime',
      type: 'date',
      format: 'YYYY-MM-DD HH:mm:ss',
      valueFormat: 'YYYY-MM-DD HH:mm:ss',
      rules: [
        {
          required: true,
          message: '请输入通知日期',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '通知内容',
      prop: 'content',
      component: 'avue-ueditor',
      span: 24,
      minRows: 4,
      type: 'textarea',
    },
  ],
});

// 行操作按钮权限
const permissionList = computed(() => ({
  addBtn: validData(permission.value.notice_add, false),
  viewBtn: validData(permission.value.notice_view, false),
  delBtn: validData(permission.value.notice_delete, false),
  editBtn: validData(permission.value.notice_edit, false),
}));

// 加载列表数据
const onLoad = (pageData: { currentPage: number; pageSize: number }, params: Partial<NoticeEntity> = {}) => {
  loading.value = true;
  getList(pageData.currentPage, pageData.pageSize, Object.assign(params, query.value)).then(res => {
    const list = res.data.data;
    page.total = list.total;
    data.value = list.records;
    loading.value = false;
  });
};

// 条件检索
const searchChange = (params: Partial<NoticeEntity>, done: () => void) => {
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
const selectionChange = (list: NoticeEntity[]) => {
  selectionList.value = list;
};

// 打开编辑或查看弹窗前加载详情
const beforeOpen = (done: () => void, type: string) => {
  if (['edit', 'view'].includes(type)) {
    getNotice(form.value.id).then(res => {
      form.value = res.data.data;
    });
  }
  done();
};

// 新增保存
const rowSave = (row: NoticeForm, done: () => void, loading: () => void) => {
  add(row).then(
    () => {
      done();
      onLoad(page);
      ElMessage({
        type: 'success',
        message: '操作成功!',
      });
    },
    error => {
      window.console.log(error);
      loading();
    },
  );
};

// 编辑更新
const rowUpdate = (row: NoticeForm, index: number, done: () => void, loading: () => void) => {
  update(row).then(
    () => {
      done();
      onLoad(page);
      ElMessage({
        type: 'success',
        message: '操作成功!',
      });
    },
    error => {
      window.console.log(error);
      loading();
    },
  );
};

// 删除单行
const rowDel = (row: NoticeEntity) => {
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
