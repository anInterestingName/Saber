<template>
  <el-row>
    <el-col :span="9">
      <div class="box">
        <el-scrollbar>
          <basic-container>
            <avue-tree :option="treeOption"
                       :data="treeData"
                       @node-click="nodeClick" />
          </basic-container>
        </el-scrollbar>
      </div>
    </el-col>
    <el-col :span="15">
      <basic-container>
        <el-button-group>
          <el-button v-if="permission.region_add"
                     type="primary"
                     icon="el-icon-plus"
                     @click="addChildren">新增下级</el-button>
          <el-button v-if="permission.region_delete"
                     type="primary"
                     icon="el-icon-delete"
                     @click="handleDelete">删除</el-button>
          <el-button v-if="permission.region_debug"
                     type="primary"
                     icon="el-icon-video-play"
                     @click="handleDebug">调试</el-button>
        </el-button-group>
      </basic-container>
      <basic-container>
        <avue-form ref="formRef"
                   :option="regionOption"
                   v-model="regionForm"
                   @submit="handleSubmit">
          <template #code="{}">
            <el-input placeholder="请输入 区划子编号"
                      v-model="regionForm.subCode">
              <template #prepend>{{regionForm.parentCode}}</template>
            </el-input>
          </template>
        </avue-form>
        <el-dialog title="行政区划数据调试"
                   append-to-body
                   v-model="debugBox"
                   width="350px">
          <avue-form :option="debugOption"
                     v-model="debugForm" />
        </el-dialog>
      </basic-container>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getLazyTree, getDetail, submit, remove } from '@/api/base/region';
import { findColumn } from '@/utils/util';
import { validateNull } from '@/utils/validate';
import { baseUrl } from '@/config/env';

// 数据实体
interface RegionEntity {
  id: string;
  code: string;
  parentCode: string;
  parentName: string;
  subCode: string;
  name: string;
  level: number;
  sort: number;
  remark: string;
  parentId: string;
  hasChildren: boolean;
  leaf?: boolean;
}

// 新增与编辑共用的表单模型，字段均可选
type RegionForm = Partial<RegionEntity>;

// 权限
const store = useStore();
const permission = computed(() => store.getters.permission);

// 区域树状态
const topCode = ref('00');
const treeCode = ref('');
const treeParentCode = ref('');
const treeData = ref<RegionEntity[]>([]);

// 树配置
const treeOption = reactive({
  nodeKey: 'id',
  lazy: true,
  treeLoad: function (node, resolve) {
    const parentCode = node.level === 0 ? '00' : node.data.id;
    getLazyTree(parentCode).then(res => {
      resolve(
        res.data.data.map(item => {
          return {
            ...item,
            leaf: !item.hasChildren,
          };
        }),
      );
    });
  },
  addBtn: false,
  menu: false,
  size: 'small',
  props: {
    labelText: '标题',
    label: 'title',
    value: 'value',
    children: 'children',
  },
});

// 区域表单实例与模型
const formRef = ref();
const regionForm = ref<RegionForm>({});

// 表单配置
const regionOption = reactive({
  labelWidth: 100,
  column: [
    {
      label: '父区划编号',
      prop: 'parentCode',
      span: 24,
      disabled: true,
      rules: [
        {
          required: true,
          message: '请输入父区划编号',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '父区划名称',
      prop: 'parentName',
      span: 24,
      disabled: true,
    },
    {
      label: '区划编号',
      prop: 'code',
      formslot: true,
      span: 24,
      rules: [
        {
          required: true,
          message: '请输入区划编号',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '区划子编号',
      prop: 'subCode',
      display: false,
    },
    {
      label: '区划名称',
      prop: 'name',
      span: 24,
      rules: [
        {
          required: true,
          message: '请输入区划名称',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '区划等级',
      prop: 'level',
      type: 'radio',
      dicUrl: baseUrl + '/blade-system/dict/dictionary?code=region',
      props: {
        label: 'dictValue',
        value: 'dictKey',
      },
      dataType: 'number',
      span: 24,
      rules: [
        {
          required: true,
          message: '请选择区划等级',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '区划排序',
      prop: 'sort',
      type: 'number',
      span: 24,
      rules: [
        {
          required: true,
          message: '请输入区划排序',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '区划备注',
      prop: 'remark',
      type: 'textarea',
      minRows: 6,
      span: 24,
    },
  ],
});

// 区划调试表单
interface DebugForm {
  province?: string;
  city?: string;
  district?: string;
}

// 调试弹窗状态
const debugBox = ref(false);
const debugForm = ref<DebugForm>({});

// 调试表单配置
const debugOption = reactive({
  labelWidth: 50,
  submitBtn: false,
  emptyBtn: false,
  column: [
    {
      label: '省份',
      prop: 'province',
      type: 'select',
      props: {
        label: 'name',
        value: 'code',
      },
      cascader: ['city'],
      dicUrl: '/blade-system/region/select',
      span: 24,
    },
    {
      label: '地市',
      prop: 'city',
      type: 'select',
      props: {
        label: 'name',
        value: 'code',
      },
      cascader: ['district'],
      dicFlag: false,
      dicUrl: '/blade-system/region/select?code={{key}}',
      span: 24,
    },
    {
      label: '区县',
      prop: 'district',
      type: 'select',
      props: {
        label: 'name',
        value: 'code',
      },
      dicFlag: false,
      dicUrl: '/blade-system/region/select?code={{key}}',
      span: 24,
    },
  ],
});

// 子编号变化时同步拼接完整区划编号
watch(
  () => regionForm.value.subCode,
  () => {
    regionForm.value.code = regionForm.value.parentCode + regionForm.value.subCode;
  },
);

// 初始化区域树
const initTree = () => {
  treeData.value = [];
  getLazyTree(topCode.value).then(res => {
    treeData.value = res.data.data.map(item => {
      return {
        ...item,
        leaf: !item.hasChildren,
      };
    });
  });
};

// 点击树节点加载区划详情
const nodeClick = (data: RegionEntity) => {
  const column = findColumn(regionOption.column, 'parentCode');
  if (column) column.disabled = true;
  treeCode.value = data.id;
  treeParentCode.value = data.parentId;
  getDetail(treeCode.value).then(res => {
    regionForm.value = res.data.data;
    regionForm.value.subCode = regionForm.value.code.replace(regionForm.value.parentCode, '');
  });
};

// 基于当前区划新增下级
const addChildren = () => {
  if (validateNull(regionForm.value.code) || validateNull(regionForm.value.name)) {
    ElMessage.warning('请先选择一项区划');
    return;
  }
  regionForm.value.parentCode = regionForm.value.code;
  regionForm.value.parentName = regionForm.value.name;
  regionForm.value.code = '';
  regionForm.value.subCode = '';
  regionForm.value.name = '';
  regionForm.value.level = regionForm.value.level === 5 ? 5 : regionForm.value.level + 1;
};

// 提交区划表单
const handleSubmit = (form: RegionForm, done: () => void, loading: () => void) => {
  const parentCode = form.parentCode === topCode.value ? '' : form.parentCode;
  form.code = parentCode + form.subCode;
  submit(form).then(
    () => {
      ElMessage({
        type: 'success',
        message: '操作成功!',
      });
      initTree();
      regionForm.value.subCode = '';
      formRef.value.resetForm();
      done();
    },
    error => {
      loading();
      window.console.log(error);
    },
  );
};

// 删除当前区划
const handleDelete = () => {
  if (validateNull(regionForm.value.code)) {
    ElMessage.warning('请先选择一项区划');
    return;
  }
  ElMessageBox.confirm(`确定将 [${regionForm.value.name}] 数据删除?`, {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      return remove(treeCode.value);
    })
    .then(() => {
      ElMessage({
        type: 'success',
        message: '操作成功!',
      });
      initTree();
      regionForm.value.subCode = '';
      formRef.value.resetForm();
    });
};

// 打开区划数据调试弹窗
const handleDebug = () => {
  debugBox.value = true;
};
</script>

<style scoped>
.box {
  height: 800px;
}

.el-scrollbar {
  height: 100%;
}

.box .el-scrollbar__wrap {
  overflow: scroll;
}
</style>
