<template>
  <span v-if="text" @click="handleLock">{{ text }}</span>
  <i v-else class="icon-suoping" @click="handleLock"></i>
  <app-dialog v-model="box" title="设置锁屏密码" size="sm">
    <el-form :model="form" ref="form" label-width="80px">
      <el-form-item
        label="锁屏密码"
        prop="passwd"
        :rules="[{ required: true, message: '锁屏密码不能为空' }]"
      >
        <el-input v-model="form.passwd" placeholder="请输入锁屏密码">
          <template #append>
            <el-button aria-label="确认锁屏密码" @click="handleSetLock">
              <el-icon><Lock /></el-icon>
            </el-button>
          </template>
        </el-input>
      </el-form-item>
    </el-form>
  </app-dialog>
</template>

<script>
import { validateNull } from 'utils/validate';
import { mapActions, mapState } from 'pinia';
import { Lock } from '@element-plus/icons-vue';
import { useCommonStore } from '@/store/common';
import AppDialog from '@/components/app-dialog/main.vue';
export default {
  name: 'top-lock',
  components: { AppDialog, Lock },
  data() {
    return {
      box: false,
      form: {
        passwd: '',
      },
    };
  },
  created() {},
  mounted() {},
  computed: {
    ...mapState(useCommonStore, {
      lockPasswd: store => store.lockPassword,
    }),
  },
  props: {
    text: String,
  },
  methods: {
    ...mapActions(useCommonStore, ['setLockPassword', 'lock']),
    handleSetLock() {
      this.$refs['form'].validate(valid => {
        if (valid) {
          this.setLockPassword(this.form.passwd);
          this.handleLock();
        }
      });
    },
    handleLock() {
      if (validateNull(this.lockPasswd)) {
        this.box = true;
        return;
      }
      this.lock();
      setTimeout(() => {
        this.$router.push({ path: '/lock' });
      }, 100);
    },
  },
};
</script>

<style lang="scss" scoped></style>
