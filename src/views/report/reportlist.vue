<template>
  <basic-container>
    <avue-crud :option="option"
               :table-loading="loading"
               :data="data"
               ref="crudRef"
               v-model="form"
               v-model:page="page"
               :permission="permissionList"
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
                   @click="handleDelete">删 除
        </el-button>
      </template>
      <template #menu="scope">
        <el-button text
                   type="primary"
                   icon="el-icon-edit"
                   @click.stop="handleDesign(scope.row.name)">设计
        </el-button>
        <el-button text
                   type="primary"
                   icon="el-icon-view"
                   @click.stop="handlePreview(scope.row.name)">预览
        </el-button>
      </template>
      <template #name="{row}">
        <el-tag style="cursor:pointer"
                @click="handlePreview(row.name)">{{ row.name }}</el-tag>
      </template>
    </avue-crud>
  </basic-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getList, remove } from '@/api/report/report';
import website from '@/config/website';

// 数据实体
interface ReportEntity {
  id: string;
  name?: string;
  createTime?: string;
  updateTime?: string;
}

// 新增与编辑共用的表单模型，字段均可选
type ReportForm = Partial<ReportEntity>;

// 表格实例与数据状态
const crudRef = ref();
const form = ref<ReportForm>({});
const data = ref<ReportEntity[]>([]);
const selectionList = ref<ReportEntity[]>([]);
const query = ref<Partial<ReportEntity>>({});
const loading = ref(true);

// 分页参数（整体替换，需用 ref）
const page = ref({
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
  selection: true,
  viewBtn: true,
  dialogClickModal: false,
  column: [
    {
      label: '文件名',
      prop: 'name',
      search: true,
      slot: true,
    },
    {
      label: '创建时间',
      prop: 'createTime',
    },
    {
      label: '更新时间',
      prop: 'updateTime',
    },
  ],
});

// 行操作按钮权限，仅开放删除
const permissionList = computed(() => ({
  addBtn: false,
  viewBtn: false,
  delBtn: true,
  editBtn: false,
}));

// 加载列表数据
const onLoad = (pageData: { currentPage: number; pageSize: number }, params: Partial<ReportEntity> = {}) => {
  loading.value = true;
  getList(pageData.currentPage, pageData.pageSize, Object.assign(params, query.value)).then(res => {
    const list = res.data.data;
    page.value.total = list.total;
    data.value = list.records;
    loading.value = false;
    selectionClear();
  });
};

// 条件检索
const searchChange = (params: Partial<ReportEntity>, done: () => void) => {
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
const selectionChange = (list: ReportEntity[]) => {
  selectionList.value = list;
};

// 清空选中状态
const selectionClear = () => {
  selectionList.value = [];
  crudRef.value.toggleSelection();
};

// 删除单行
const rowDel = (row: ReportEntity) => {
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

// 打开报表设计器
const handleDesign = (name: string) => {
  window.open(`${website.reportUrl}/designer?_u=blade-${name}`);
};

// 打开报表预览
const handlePreview = (name: string) => {
  window.open(`${website.reportUrl}/preview?_u=blade-${name}`);
};
</script>

<style>
</style>
