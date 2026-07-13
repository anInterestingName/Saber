<template>
  <basic-container>
    <avue-crud :option="option"
               :data="data"
               :before-open="beforeOpen"
               v-model="form"
               :permission="permissionList"
               :page="page"
               @search-change="searchChange"
               @search-reset="searchReset"
               @current-change="currentChange"
               @size-change="sizeChange"
               @on-load="onLoad">
    </avue-crud>
  </basic-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useStore } from 'vuex';
import { getErrorList, getErrorLogs } from '@/api/logs';
import { validData } from '@/utils/util';

// 数据实体
interface ErrorLogEntity {
  id: string;
  serviceId?: string;
  serverHost?: string;
  serverIp?: string;
  env?: string;
  title?: string;
  method?: string;
  requestUri?: string;
  createTime?: string;
  userAgent?: string;
  params?: string;
  stackTrace?: string;
}

// 详情抽屉展示的表单模型，字段均可选
type ErrorLogForm = Partial<ErrorLogEntity>;

// 权限
const store = useStore();
const permission = computed(() => store.getters.permission);

// 表格数据状态
const form = ref<ErrorLogForm>({});
const query = ref<Partial<ErrorLogEntity>>({});
const data = ref<ErrorLogEntity[]>([]);

// 分页参数
const page = reactive({
  pageSize: 10,
  currentPage: 1,
  total: 0,
});

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
  editBtn: false,
  addBtn: false,
  delBtn: false,
  menuWidth: 120,
  dialogType: 'drawer',
  column: [
    {
      label: '服务id',
      prop: 'serviceId',
      search: true,
    },
    {
      label: '服务host',
      prop: 'serverHost',
      search: true,
    },
    {
      label: '服务ip',
      prop: 'serverIp',
    },
    {
      label: '软件环境',
      prop: 'env',
    },
    {
      label: '日志名',
      prop: 'title',
    },
    {
      label: '请求方法',
      prop: 'method',
    },
    {
      label: '请求接口',
      prop: 'requestUri',
    },
    {
      label: '日志时间',
      prop: 'createTime',
    },
    {
      label: '用户代理',
      prop: 'userAgent',
      span: 24,
      hide: true,
    },
    {
      label: '请求数据',
      prop: 'params',
      type: 'textarea',
      span: 24,
      minRows: 2,
      hide: true,
    },
    {
      label: '日志数据',
      prop: 'stackTrace',
      type: 'textarea',
      span: 24,
      minRows: 6,
      hide: true,
    },
  ],
});

// 行操作按钮权限，仅开放查看
const permissionList = computed(() => ({
  viewBtn: validData(permission.value.log_error_view, false),
}));

// 加载错误日志列表
const onLoad = (pageData: { currentPage: number; pageSize: number }, params: Partial<ErrorLogEntity> = {}) => {
  getErrorList(pageData.currentPage, pageData.pageSize, Object.assign(params, query.value)).then(res => {
    const listData = res.data.data;
    page.total = listData.total;
    data.value = listData.records;
  });
};

// 条件检索
const searchChange = (params: Partial<ErrorLogEntity>, done: () => void) => {
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

// 打开详情抽屉前加载错误日志详情
const beforeOpen = (done: () => void, type: string) => {
  if (['edit', 'view'].includes(type)) {
    getErrorLogs(form.value.id).then(res => {
      form.value = res.data.data;
    });
  }
  done();
};
</script>

<style>
</style>
