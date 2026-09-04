<template>
  <span @click="logsFlag?'':handleOpen()">
    <el-badge :value="logsFlag?'':logsLen"
              :max="99">
      <i class="icon-rizhi1"></i>
    </el-badge>
    <el-dialog title="日志"
               v-model="box"
               width="60%"
               append-to-body>
      <el-button type="primary" @click="send">
        <el-icon><Upload /></el-icon>
        <span>上传服务器</span>
      </el-button>
      <el-button type="danger" @click="clear">
        <el-icon><Delete /></el-icon>
        <span>清空本地日志</span>
      </el-button>
      <el-table :data="logsList">
        <el-table-column prop="type"
                         label="类型"
                         width="50px">
        </el-table-column>
        <el-table-column prop="url"
                         label="地址"
                         show-overflow-tooltip
                         width="180">
        </el-table-column>
        <el-table-column prop="message"
                         show-overflow-tooltip
                         label="内容">
        </el-table-column>
        <el-table-column prop="stack"
                         show-overflow-tooltip
                         label="错误堆栈">
        </el-table-column>
        <el-table-column prop="time"
                         label="时间">
        </el-table-column>
      </el-table>
    </el-dialog>
  </span>
</template>

<script>
import { mapActions, mapState } from 'pinia';
import { Delete, Upload } from '@element-plus/icons-vue';
import { useLogsStore } from '@/store/logs';
export default {
  name: "top-logs",
  components: { Delete, Upload },
  data () {
    return {
      box: false
    };
  },
  created () { },
  mounted () { },
  computed: {
    ...mapState(useLogsStore, {
      logsList: store => store.logsList,
      logsFlag: store => store.isEmpty,
      logsLen: store => store.logCount,
    }),
  },
  props: [],
  methods: {
    ...mapActions(useLogsStore, ['SendLogs', 'clearLogs']),
    handleOpen () {
      this.box = true;
    },
    send () {
      this.$confirm("确定上传本地日志到服务器?", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      })
        .then(() => {
          this.SendLogs().then(() => {
            this.box = false;
            this.$message({
              type: "success",
              message: "发送成功!"
            });
          });
        })
        .catch(() => { });
    },
    clear () {
      this.$confirm("确定清空本地日志记录?", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      })
        .then(() => {
          this.clearLogs();
          this.box = false;
          this.$message({
            type: "success",
            message: "清空成功!"
          });
        })
        .catch(() => { });
    }
  }
};
</script>

<style lang="scss" scoped>
.code {
  font-size: 12px;
  display: block;
  font-family: monospace;
  white-space: pre;
  margin: 1em 0px;
}
</style>
