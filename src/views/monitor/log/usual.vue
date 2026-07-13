<template>
  <basic-container>
    <avue-crud :option="option"
               :data="data"
               v-model="form"
               :permission="permissionList"
               :page="page"
               :before-open="beforeOpen"
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
import { getUsualList, getUsualLogs } from '@/api/logs';
import { validData } from '@/utils/util';

// 数据实体
interface UsualLogEntity {
  id: string;
  serviceId?: string;
  serverHost?: string;
  serverIp?: string;
  env?: string;
  logLevel?: string;
  logId?: string;
  requestUri?: string;
  logData?: string;
  userAgent?: string;
  params?: string;
}

// 详情抽屉展示的表单模型，字段均可选
type UsualLogForm = Partial<UsualLogEntity>;

// 权限
const store = useStore();
const permission = computed(() => store.getters.permission);

// 表格数据状态
const form = ref<UsualLogForm>({});
const query = ref<Partial<UsualLogEntity>>({});
const data = ref<UsualLogEntity[]>([]);

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
      label: '日志级别',
      prop: 'logLevel',
    },
    {
      label: '日志id',
      prop: 'logId',
    },
    {
      label: '请求接口',
      prop: 'requestUri',
    },
    {
      label: '日志时间',
      prop: 'logData',
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
  ],
});

// 行操作按钮权限，仅开放查看
const permissionList = computed(() => ({
  viewBtn: validData(permission.value.log_usual_view, false),
}));

// 加载通用日志列表
const onLoad = (pageData: { currentPage: number; pageSize: number }, params: Partial<UsualLogEntity> = {}) => {
  getUsualList(pageData.currentPage, pageData.pageSize, Object.assign(params, query.value)).then(res => {
    const listData = res.data.data;
    page.total = listData.total;
    data.value = listData.records;
  });
};

// 条件检索
const searchChange = (params: Partial<UsualLogEntity>, done: () => void) => {
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

// 打开详情抽屉前加载通用日志详情
const beforeOpen = (done: () => void, type: string) => {
  if (['edit', 'view'].includes(type)) {
    getUsualLogs(form.value.id).then(res => {
      form.value = res.data.data;
    });
  }
  done();
};
</script>

<style>
</style>
