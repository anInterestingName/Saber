<template>
  <div>
    <basic-container>
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 个人信息 Tab -->
        <el-tab-pane label="个人信息" name="info">
          <el-form ref="infoFormRef" :model="infoForm" label-width="100px">
            <el-form-item label="头像">
              <div class="avatar-upload-container">
                <div class="avatar-wrapper" v-if="infoForm.avatar">
                  <img :src="infoForm.avatar" alt="用户头像" class="avatar" />
                  <div class="avatar-overlay">
                    <el-icon class="avatar-action" @click="previewAvatar"><View /></el-icon>
                    <el-icon class="avatar-action" @click="deleteAvatar"><Delete /></el-icon>
                  </div>
                </div>
                <el-upload
                  v-else
                  class="avatar-uploader"
                  action="/api/blade-resource/oss/endpoint/put-file"
                  :headers="uploadHeaders"
                  :show-file-list="false"
                  :on-success="handleAvatarSuccess"
                  :before-upload="beforeAvatarUpload"
                  accept=".jpg,.jpeg,.png,.gif"
                >
                  <el-icon class="avatar-uploader-icon"><Plus /></el-icon>
                </el-upload>
                <div class="el-upload__tip">支持 JPG/PNG/GIF 格式，文件大小不超过 1MB</div>
              </div>
            </el-form-item>
            <el-form-item label="姓名">
              <el-input v-model="infoForm.realName" placeholder="请输入姓名">
                <template #prefix>
                  <el-icon><Bell /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="用户名">
              <el-input v-model="infoForm.name" placeholder="请输入用户名">
                <template #prefix>
                  <el-icon><User /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="手机号">
              <el-input v-model="infoForm.phone" placeholder="请输入手机号">
                <template #prefix>
                  <el-icon><Iphone /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="infoForm.email" placeholder="请输入邮箱">
                <template #prefix>
                  <el-icon><Message /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <div class="button-group">
                <el-button type="primary" @click="submitInfo" :loading="loading">
                  <el-icon><Check /></el-icon>
                  <span>提交</span>
                </el-button>
                <el-button @click="resetForm">
                  <el-icon><RefreshRight /></el-icon>
                  <span>清空</span>
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 修改密码 Tab -->
        <el-tab-pane label="修改密码" name="password">
          <el-form ref="passwordFormRef" :model="passwordForm" label-width="100px">
            <el-form-item label="原密码">
              <el-input
                v-model="passwordForm.oldPassword"
                type="password"
                placeholder="请输入原密码"
                show-password
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="新密码">
              <el-input
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="请输入新密码"
                show-password
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="确认密码">
              <el-input
                v-model="passwordForm.newPassword1"
                type="password"
                placeholder="请确认新密码"
                show-password
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <div class="button-group">
                <el-button type="primary" @click="submitPassword" :loading="loading">
                  <el-icon><Check /></el-icon>
                  <span>提交</span>
                </el-button>
                <el-button @click="resetForm">
                  <el-icon><RefreshRight /></el-icon>
                  <span>清空</span>
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </basic-container>
    <!-- 头像预览组件 -->
    <el-image-viewer
      v-if="showAvatarPreview"
      :url-list="avatarPreviewList"
      :initial-index="0"
      :hide-on-click-modal="true"
      :teleported="true"
      @close="showAvatarPreview = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElForm, ElImageViewer, ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus,
  Bell,
  User,
  Iphone,
  Message,
  Lock,
  Check,
  RefreshRight,
  View,
  Delete,
} from '@element-plus/icons-vue';
import { getUserInfo, updateInfo, updatePassword } from '@/api/system/user';
import { getToken } from '@/utils/auth';

// 个人信息表单模型
interface UserInfoForm {
  id: string;
  avatar: string;
  name: string;
  realName: string;
  phone: string;
  email: string;
}

// 修改密码表单模型
interface PasswordForm {
  oldPassword: string;
  newPassword: string;
  newPassword1: string;
}

// 头像上传接口返回结构
interface UploadResult {
  data?: { link?: string } | string;
}

// 标签页与加载状态
const activeTab = ref('info');
const loading = ref(false);

// 表单实例与模型
const infoFormRef = ref<InstanceType<typeof ElForm>>();
const passwordFormRef = ref<InstanceType<typeof ElForm>>();
const infoForm = ref<UserInfoForm>({
  id: '',
  avatar: '',
  name: '',
  realName: '',
  phone: '',
  email: '',
});
const passwordForm = ref<PasswordForm>({
  oldPassword: '',
  newPassword: '',
  newPassword1: '',
});

// 头像预览与上传请求头
const showAvatarPreview = ref(false);
const avatarPreviewList = ref<string[]>([]);
const uploadHeaders = {
  'Blade-Auth': `bearer ${getToken()}`,
  'Blade-Requested-With': 'BladeHttpRequest',
};

// 加载用户信息
const loadUserInfo = () => {
  getUserInfo().then(res => {
    const user = res.data.data;
    infoForm.value = {
      id: user.id,
      avatar: user.avatar,
      name: user.name,
      realName: user.realName,
      phone: user.phone,
      email: user.email,
    };
  });
};

// 切换标签页
const handleTabChange = (name: string | number) => {
  if (name === 'info') {
    loadUserInfo();
  }
};

// 提交个人信息
const submitInfo = () => {
  loading.value = true;
  updateInfo(infoForm.value).then(
    res => {
      if (res.data.success) {
        ElMessage({
          type: 'success',
          message: '修改信息成功!',
        });
      } else {
        ElMessage({
          type: 'error',
          message: res.data.msg,
        });
      }
      loading.value = false;
    },
    error => {
      window.console.log(error);
      loading.value = false;
    }
  );
};

// 修改密码
const submitPassword = () => {
  const { oldPassword, newPassword, newPassword1 } = passwordForm.value;
  if (!oldPassword || !newPassword || !newPassword1) {
    ElMessage.warning('请完整填写原密码、新密码与确认密码');
    return;
  }
  if (newPassword !== newPassword1) {
    ElMessage.warning('两次输入的新密码不一致');
    return;
  }
  loading.value = true;
  updatePassword(
    passwordForm.value.oldPassword,
    passwordForm.value.newPassword,
    passwordForm.value.newPassword1
  ).then(
    res => {
      if (res.data.success) {
        ElMessage({
          type: 'success',
          message: '修改密码成功!',
        });
        // 清空密码表单
        passwordForm.value = {
          oldPassword: '',
          newPassword: '',
          newPassword1: '',
        };
      } else {
        ElMessage({
          type: 'error',
          message: res.data.msg,
        });
      }
      loading.value = false;
    },
    error => {
      window.console.log(error);
      loading.value = false;
    }
  );
};

// 头像上传成功回调
const handleAvatarSuccess = (response: UploadResult) => {
  if (response && response.data) {
    infoForm.value.avatar =
      (response.data as { link?: string }).link || (response.data as string);
  }
};

// 头像上传前校验
const beforeAvatarUpload = (file: File) => {
  const isValidType = ['image/jpeg', 'image/png', 'image/gif'].includes(file.type);
  const isLt1M = file.size / 1024 < 1024;

  if (!isValidType) {
    ElMessage.error('上传头像只支持 JPG/PNG/GIF 格式!');
  }
  if (!isLt1M) {
    ElMessage.error('上传头像大小不能超过 1MB!');
  }
  return isValidType && isLt1M;
};

// 预览头像
const previewAvatar = () => {
  if (infoForm.value.avatar) {
    avatarPreviewList.value = [infoForm.value.avatar];
    showAvatarPreview.value = true;
  } else {
    ElMessage.warning('暂无头像可预览');
  }
};

// 删除头像
const deleteAvatar = () => {
  ElMessageBox.confirm('确定要删除头像吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      infoForm.value.avatar = '';
      ElMessage.success('头像已删除');
    })
    .catch(() => {});
};

// 重置当前表单
const resetForm = () => {
  if (activeTab.value === 'info') {
    // 清空个人信息表单，但保留id
    const id = infoForm.value.id;
    infoForm.value = {
      id: id,
      avatar: '',
      name: '',
      realName: '',
      phone: '',
      email: '',
    };
  } else if (activeTab.value === 'password') {
    // 清空密码表单
    passwordForm.value = {
      oldPassword: '',
      newPassword: '',
      newPassword1: '',
    };
  }
};

// 初始化时根据默认标签页加载数据
if (activeTab.value === 'info') {
  loadUserInfo();
}
</script>

<style scoped>
.avatar-upload-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.avatar-wrapper {
  position: relative;
  width: 200px;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.avatar-wrapper:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.avatar-wrapper .avatar {
  width: 200px;
  height: 200px;
  display: block;
  border-radius: 12px;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.6) 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  opacity: 0;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(2px);
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.avatar-action {
  font-size: 20px;
  color: #fff;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-action:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.avatar-uploader :deep(.el-upload) {
  border: 2px dashed #d9d9d9;
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  width: 200px;
  height: 200px;
  background-color: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-uploader :deep(.el-upload:hover) {
  border-color: var(--el-color-primary);
  background-color: #f5f5f5;
}

.avatar-uploader-icon {
  font-size: 40px;
  color: #8c939d;
  transition: color 0.3s ease;
}

.avatar-uploader :deep(.el-upload:hover) .avatar-uploader-icon {
  color: var(--el-color-primary);
}

.el-upload__tip {
  font-size: 12px;
  color: #969799;
  margin-top: 10px;
  line-height: 1.5;
  padding-left: 4px;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 16px;
  width: 100%;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
