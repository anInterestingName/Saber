<template>
  <page-container layout="content">
    <div>
      <basic-container>
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <!-- 个人信息 Tab -->
          <el-tab-pane label="个人信息" name="info">
            <el-form
              ref="infoFormRef"
              :model="infoForm"
              :rules="infoRules"
              :disabled="detailLoading || infoSubmitting"
              label-width="100px"
            >
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
                    :http-request="handleAvatarRequest"
                    :disabled="uploading || detailLoading || infoSubmitting"
                    :show-file-list="false"
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
              <el-form-item label="用户名" prop="name">
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
                  <el-button
                    type="primary"
                    @click="submitInfo"
                    :loading="infoSubmitting"
                    :disabled="detailLoading || uploading || !infoForm.id"
                  >
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
            <el-form
              ref="passwordFormRef"
              :model="passwordForm"
              :rules="passwordRules"
              :disabled="passwordSubmitting"
              label-width="100px"
            >
              <el-form-item label="原密码" prop="oldPassword">
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
              <el-form-item label="新密码" prop="newPassword">
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
              <el-form-item label="确认密码" prop="confirmPassword">
                <el-input
                  v-model="passwordForm.confirmPassword"
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
                  <el-button type="primary" @click="submitPassword" :loading="passwordSubmitting">
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
  </page-container>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import {
  ElForm,
  ElImageViewer,
  ElMessage,
  ElMessageBox,
  type FormRules,
  type UploadRequestOptions,
} from 'element-plus';
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
import { uploadFile } from '@/api/resource/file';
import { BladeBusinessError, getRequestSessionVersion } from '@/axios';
import { validateNewPassword } from '@/utils/password';
import { useUserStore } from '@/store/user';

interface UserInfoForm {
  id: string;
  avatar: string;
  name: string;
  realName: string;
  phone: string;
  email: string;
}
interface PasswordForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}
const createInfoForm = (): UserInfoForm => ({
  id: '',
  avatar: '',
  name: '',
  realName: '',
  phone: '',
  email: '',
});
const createPasswordForm = (): PasswordForm => ({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});
const userStore = useUserStore();
const activeTab = ref('info');
const detailLoading = ref(false);
const infoSubmitting = ref(false);
const passwordSubmitting = ref(false);
const uploading = ref(false);
const infoFormRef = ref<InstanceType<typeof ElForm>>();
const passwordFormRef = ref<InstanceType<typeof ElForm>>();
const infoForm = ref(createInfoForm());
const passwordForm = ref(createPasswordForm());
const showAvatarPreview = ref(false);
const avatarPreviewList = ref<string[]>([]);
let active = true;
let detailVersion = 0;
const infoRules: FormRules = {
  name: [{ required: true, whitespace: true, message: '请输入用户名', trigger: 'blur' }],
};
const passwordRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    {
      validator: (_rule, value: string, callback) => {
        const message = validateNewPassword(value, userStore.userInfo?.account || '');
        callback(message ? new Error(message) : undefined);
      },
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    {
      validator: (_rule, value: string, callback) =>
        callback(
          value && value === passwordForm.value.newPassword
            ? undefined
            : new Error('两次输入的新密码不一致')
        ),
      trigger: 'blur',
    },
  ],
};

const loadUserInfo = async () => {
  const version = ++detailVersion;
  detailLoading.value = true;
  infoForm.value = createInfoForm();
  try {
    const response = await getUserInfo();
    if (!active || version !== detailVersion) return;
    const user = response.data.data;
    infoForm.value = {
      id: user.id,
      avatar: user.avatar || '',
      name: user.name || '',
      realName: user.realName || '',
      phone: user.phone || '',
      email: user.email || '',
    };
  } catch {
    // 统一请求层展示错误，空资料禁止提交。
  } finally {
    if (active && version === detailVersion) detailLoading.value = false;
  }
};
const handleTabChange = (name: string | number) => {
  passwordForm.value = createPasswordForm();
  passwordFormRef.value?.clearValidate();
  if (name === 'info') void loadUserInfo();
};
const submitInfo = async () => {
  if (infoSubmitting.value || detailLoading.value || uploading.value || !infoForm.value.id) return;
  infoSubmitting.value = true;
  const version = getRequestSessionVersion();
  try {
    if (!(await infoFormRef.value?.validate().catch(() => false))) return;
    if (!active || version !== getRequestSessionVersion()) return;
    await updateInfo({ ...infoForm.value });
    if (!active) return;
    if (userStore.userInfo) {
      userStore.userInfo.userName = infoForm.value.name;
      userStore.userInfo.avatar = infoForm.value.avatar;
    }
    ElMessage.success('修改信息成功');
  } catch {
    // 失败保留输入，提交锁由 finally 恢复。
  } finally {
    infoSubmitting.value = false;
  }
};
const submitPassword = async () => {
  if (passwordSubmitting.value) return;
  passwordSubmitting.value = true;
  const version = getRequestSessionVersion();
  try {
    if (!(await passwordFormRef.value?.validate().catch(() => false))) return;
    if (!active || version !== getRequestSessionVersion()) return;
    const value = passwordForm.value;
    await updatePassword(value.oldPassword, value.newPassword, value.confirmPassword);
    if (!active) return;
    passwordForm.value = createPasswordForm();
    passwordFormRef.value?.clearValidate();
    ElMessage.success('修改密码成功');
  } catch {
    // 普通接口错误由 Axios 展示，不记录密码或完整请求。
  } finally {
    passwordSubmitting.value = false;
  }
};
const handleAvatarRequest = async (options: UploadRequestOptions) => {
  if (uploading.value) throw new Error('头像正在上传');
  uploading.value = true;
  try {
    const result = await uploadFile(options.file);
    if (active) infoForm.value.avatar = result.link;
    return result;
  } catch (error) {
    if (!(error instanceof BladeBusinessError)) ElMessage.error('头像上传未完成，请重试');
    throw error;
  } finally {
    uploading.value = false;
  }
};
const beforeAvatarUpload = (file: File) => {
  if (uploading.value || infoSubmitting.value || detailLoading.value || !infoForm.value.id)
    return false;
  if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
    ElMessage.error('上传头像只支持 JPG/PNG/GIF 格式');
    return false;
  }
  if (file.size >= 1024 * 1024) {
    ElMessage.error('上传头像大小须小于1MB');
    return false;
  }
  return true;
};
const previewAvatar = () => {
  if (!infoForm.value.avatar) return;
  avatarPreviewList.value = [infoForm.value.avatar];
  showAvatarPreview.value = true;
};
const deleteAvatar = async () => {
  if (infoSubmitting.value) return;
  try {
    await ElMessageBox.confirm('移除当前头像？保存个人信息后生效。', '提示', { type: 'warning' });
    if (active) infoForm.value.avatar = '';
  } catch {
    /* 取消时保留头像。 */
  }
};
const resetForm = () => {
  if (infoSubmitting.value || passwordSubmitting.value) return;
  if (activeTab.value === 'info') infoForm.value = { ...createInfoForm(), id: infoForm.value.id };
  else passwordForm.value = createPasswordForm();
  infoFormRef.value?.clearValidate();
  passwordFormRef.value?.clearValidate();
};
void loadUserInfo();
onBeforeUnmount(() => {
  active = false;
  detailVersion += 1;
  passwordForm.value = createPasswordForm();
});
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
  border-radius: var(--saber-radius-overlay);
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--saber-shadow-media);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.avatar-wrapper:hover {
  box-shadow: var(--saber-shadow-media-hover);
  transform: translateY(-2px);
}

.avatar-wrapper .avatar {
  width: 200px;
  height: 200px;
  display: block;
  border-radius: var(--saber-radius-overlay);
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--saber-media-scrim);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--saber-space-5);
  opacity: 0;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(2px);
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.avatar-action {
  font-size: 20px;
  color: var(--saber-text-on-accent);
  cursor: pointer;
  padding: var(--saber-space-2);
  border-radius: var(--saber-radius-round);
  background-color: var(--saber-media-action-bg);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-action:hover {
  background-color: var(--saber-media-action-bg-hover);
  transform: scale(1.1);
  box-shadow: var(--saber-shadow-media-action);
}

.avatar-uploader :deep(.el-upload) {
  border: 2px dashed var(--saber-border-strong);
  border-radius: var(--saber-radius-overlay);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  width: 200px;
  height: 200px;
  background-color: var(--saber-surface-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-uploader :deep(.el-upload:hover) {
  border-color: var(--el-color-primary);
  background-color: var(--saber-surface-subtle);
}

.avatar-uploader-icon {
  font-size: 40px;
  color: var(--saber-text-tertiary);
  transition: color 0.3s ease;
}

.avatar-uploader :deep(.el-upload:hover) .avatar-uploader-icon {
  color: var(--el-color-primary);
}

.el-upload__tip {
  font-size: 12px;
  color: var(--saber-text-tertiary);
  margin-top: var(--saber-space-2);
  line-height: 1.5;
  padding-left: var(--saber-space-1);
}

.button-group {
  display: flex;
  justify-content: center;
  gap: var(--saber-space-4);
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
