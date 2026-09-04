<template>
  <basic-container class="form-demo">
    <div class="form-demo__header">
      <h2>表单示例</h2>
    </div>
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="112px">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" maxlength="50" placeholder="请输入用户名" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          maxlength="64"
          show-password
          placeholder="请输入密码"
        />
      </el-form-item>
      <el-form-item label="再次输入密码" prop="confirmPassword">
        <el-input
          v-model="form.confirmPassword"
          type="password"
          maxlength="64"
          show-password
          placeholder="请再次输入密码"
        />
      </el-form-item>
      <el-form-item label="申请日期" prop="date">
        <el-date-picker
          v-model="form.date"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="请选择申请日期"
        />
      </el-form-item>
      <el-form-item label="个性签名" prop="signature">
        <el-input
          v-model="form.signature"
          type="textarea"
          :rows="6"
          maxlength="500"
          show-word-limit
          placeholder="请输入个性签名"
        />
      </el-form-item>
      <div class="form-demo__actions">
        <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
        <el-button type="primary" :icon="CircleCheck" @click="handleValidate">验证</el-button>
      </div>
    </el-form>
  </basic-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CircleCheck, RefreshLeft } from '@element-plus/icons-vue';
import { ElForm, ElMessage, type FormItemRule, type FormRules } from 'element-plus';

interface DemoForm {
  username: string;
  password: string;
  confirmPassword: string;
  date: string;
  signature: string;
}

const createInitialForm = (): DemoForm => ({
  username: '',
  password: '',
  confirmPassword: '',
  date: '',
  signature: '',
});

const formRef = ref<InstanceType<typeof ElForm>>();
const form = ref<DemoForm>(createInitialForm());
const validateConfirmPassword: FormItemRule['validator'] = (_rule, value, callback) => {
  if (!value) {
    callback(new Error('请再次输入密码'));
    return;
  }
  if (value !== form.value.password) {
    callback(new Error('两次输入的密码不一致'));
    return;
  }
  callback();
};
const formRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }],
};

const handleReset = () => {
  form.value = createInitialForm();
  formRef.value?.resetFields();
};

const handleValidate = async () => {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  ElMessage.success('表单验证通过');
  form.value.password = '';
  form.value.confirmPassword = '';
  formRef.value.clearValidate(['password', 'confirmPassword']);
};
</script>

<style scoped lang="scss">
.form-demo {
  max-width: 760px;
}

.form-demo__header {
  margin-bottom: 20px;

  h2 {
    margin: 0;
    color: var(--saber-text-primary);
    font-size: 16px;
    font-weight: 600;
    line-height: 32px;
    letter-spacing: 0;
  }
}

.form-demo__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

:deep(.el-date-editor) {
  width: 100%;
}

@media (max-width: 767px) {
  .form-demo__actions {
    justify-content: flex-start;
  }
}
</style>
