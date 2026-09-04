<template>
  <div class="saber-tags"
       v-if="setting.tag"
       @click="contextmenuFlag=false">
    <!-- tag盒子 -->
    <div v-if="contextmenuFlag"
         class="saber-tags__contentmenu"
         :style="{left:contentmenuX+'px',top:contentmenuY+'px'}">
      <div class="item"
           @click="closeOthersTags">{{$t('tagsView.closeOthers')}}</div>
      <div class="item"
           @click="closeAllTags">{{$t('tagsView.closeAll')}}</div>
    </div>
    <div class="saber-tags__box">
      <el-tabs v-model="active"
               type="card"
               @contextmenu="handleContextmenu"
               :closable="tagLen!==1"
               @tab-click="openTag"
               @edit="menuTag">
        <el-tab-pane v-for="(item,index) in tagList"
                     :key="index"
                     :label="generateTitle(item)"
                     :name="item.fullPath">
          <template #label>
            <span>
              {{generateTitle(item)}}
              <button
                v-if="active==item.fullPath"
                type="button"
                class="saber-tags__refresh"
                :class="{'turn':refresh}"
                aria-label="刷新当前标签"
                @click.stop="handleRefresh"
              >
                <el-icon><Refresh /></el-icon>
              </button>
            </span>
          </template>

        </el-tab-pane>

      </el-tabs>
      <el-dropdown class="saber-tags__menu">
        <el-button type="primary">
          {{$t('tagsView.menu')}}
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="openSearch">{{$t('tagsView.search')}}</el-dropdown-item>
            <el-dropdown-item @click="closeOthersTags">{{$t('tagsView.closeOthers')}}</el-dropdown-item>
            <el-dropdown-item @click="closeAllTags">{{$t('tagsView.closeAll')}}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

  </div>
</template>
<script>
import { mapActions, mapState } from 'pinia';
import { ArrowDown, Refresh } from '@element-plus/icons-vue';
import { useCommonStore } from '@/store/common';
import { useTagsStore } from '@/store/tags';
export default {
  name: "tags",
  components: { ArrowDown, Refresh },
  data () {
    return {
      refresh: false,
      active: "",
      contentmenuX: "",
      contentmenuY: "",
      contextmenuFlag: false
    };
  },
  watch: {
    tag: {
      handler (val) {
        this.active = val?.fullPath || '';
      },
      immediate: true,
    },
    contextmenuFlag () {
      window.addEventListener("mousedown", this.watchContextmenu);
    }
  },
  computed: {
    ...mapState(useTagsStore, {
      tagWel: store => store.homeTag,
      tag: store => store.currentTag,
      tagList: store => store.tagList,
    }),
    ...mapState(useCommonStore, ['setting']),
    tagLen () {
      return this.tagList.length || 0;
    }
  },
  methods: {
    ...mapActions(useTagsStore, ['deleteTag', 'clearTags', 'deleteOtherTags']),
    ...mapActions(useCommonStore, ['setSearch', 'setRefresh']),
    openSearch () {
      this.setSearch(true)
    },
    handleRefresh () {
      this.refresh = true;
      this.setRefresh(false);
      setTimeout(() => {
        this.setRefresh(true);
      }, 100)
      setTimeout(() => {
        this.refresh = false;
      }, 500)
    },
    generateTitle (item) {
      return this.$router.$dynamicRouter.generateTitle({
        ...item,
        ...{
          label: item.name
        }
      });
    },
    watchContextmenu (event) {
      if (!this.$el.contains(event.target) || event.button !== 0) {
        this.contextmenuFlag = false;
      }
      window.removeEventListener("mousedown", this.watchContextmenu);
    },
    handleContextmenu (event) {
      let target = event.target;
      let flag = false;
      if (target.className.indexOf("el-tabs__item") > -1) flag = true;
      else if (target.parentNode.className.indexOf("el-tabs__item") > -1) {
        target = target.parentNode;
        flag = true;
      }
      if (flag) {
        event.preventDefault();
        event.stopPropagation();
        this.contentmenuX = event.clientX;
        this.contentmenuY = event.clientY;
        this.tagName = target.getAttribute("aria-controls").slice(5);
        this.contextmenuFlag = true;
      }
    },
    menuTag (value, action) {
      if (action === "remove") {
        let { tag, key } = this.findTag(value);
        this.deleteTag(tag);
        if (tag.fullPath === this.tag.fullPath) {
          tag = this.tagList[key - 1] || this.tagList[0] || this.tagWel;
          this.$router.push({
            path: tag.path,
            query: tag.query
          })
        }
      }
    },
    openTag (item) {
      let value = item.props.name
      let { tag } = this.findTag(value)
      this.$router.push({
        path: tag.path,
        query: tag.query
      })
    },
    findTag (fullPath) {
      let tag = this.tagList.find(item => item.fullPath === fullPath);
      let key = this.tagList.findIndex(item => item.fullPath === fullPath);
      return { tag, key }
    },
    closeOthersTags () {
      this.contextmenuFlag = false;
      this.deleteOtherTags()
    },
    closeAllTags () {
      this.contextmenuFlag = false;
      this.clearTags()
      this.$router.push(this.tagWel);
    }
  }
};
</script>


