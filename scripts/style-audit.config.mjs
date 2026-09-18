const createExceptions = (rule, path, values, category, reason, owner) =>
  values.map(match => ({
    rule,
    path,
    scope: 'source',
    match,
    category,
    reason,
    owner,
  }));

const createValueExceptions = (path, values, category, reason, owner) =>
  createExceptions('UI001', path, values, category, reason, owner);

export const ruleLevels = {
  UI001: 'error',
  UI002: 'error',
  UI003: 'error',
  UI004: 'error',
  UI005: 'error',
  UI006: 'error',
  UI007: 'error',
  UI008: 'error',
  UI009: 'error',
  UI010: 'error',
  UI011: 'error',
  UI012: 'error',
};

export const ruleNames = {
  UI001: 'raw-theme-color',
  UI002: 'raw-radius',
  UI003: 'raw-shadow',
  UI004: 'raw-spacing',
  UI005: 'direct-dialog',
  UI006: 'direct-drawer',
  UI007: 'element-internal',
  UI008: 'important',
  UI009: 'page-layout',
  UI010: 'forbidden-ui',
  UI011: 'raw-overlay-size',
  UI012: 'unscoped-global',
};

export const pageLayouts = {
  'src/views/test.vue': 'content',
  'src/views/asset/prompt.vue': 'content',
  'src/views/authority/apiscope.vue': 'workspace',
  'src/views/authority/datascope.vue': 'workspace',
  'src/views/authority/role.vue': 'workspace',
  'src/views/base/region.vue': 'workspace',
  'src/views/desk/notice.vue': 'workspace',
  'src/views/monitor/log/api.vue': 'workspace',
  'src/views/monitor/log/error.vue': 'workspace',
  'src/views/monitor/log/usual.vue': 'workspace',
  'src/views/report/reportlist.vue': 'workspace',
  'src/views/system/client.vue': 'workspace',
  'src/views/system/dept.vue': 'workspace',
  'src/views/system/dict.vue': 'workspace',
  'src/views/system/menu.vue': 'workspace',
  'src/views/system/param.vue': 'workspace',
  'src/views/system/post.vue': 'workspace',
  'src/views/system/tag.vue': 'workspace',
  'src/views/system/tenant.vue': 'workspace',
  'src/views/system/topmenu.vue': 'workspace',
  'src/views/system/user.vue': 'workspace',
  'src/views/tool/code.vue': 'immersive',
  'src/views/tool/datasource.vue': 'workspace',
  'src/views/user/info.vue': 'content',
  'src/views/util/data.vue': 'content',
  'src/views/util/form.vue': 'content',
  'src/views/util/logs.vue': 'content',
  'src/views/util/permission.vue': 'content',
  'src/views/util/store.vue': 'content',
  'src/views/util/table.vue': 'content',
  'src/views/util/tags.vue': 'content',
  'src/views/util/test.vue': 'content',
  'src/views/wel/dashboard.vue': 'content',
  'src/views/wel/index.vue': 'content',
};

export const routePageExceptions = [];

export const exceptions = [
  ...createExceptions(
    'UI004',
    'src/styles/normalize.scss',
    ['0.67em 0', '0 2px', '0.35em 0.625em 0.75em'],
    'third-party-adapter',
    '浏览器 normalize 保留标准元素默认间距。',
    'global-style'
  ),
  ...createExceptions(
    'UI004',
    'src/views/desk/components/notice-editor.vue',
    ['8px 10px'],
    'third-party-adapter',
    '富文本编辑器内部占位区域保持第三方适配间距。',
    'notice-editor'
  ),
  ...createExceptions(
    'UI007',
    'src/components/detail-drawer/main.vue',
    ['.el-drawer__'],
    'third-party-adapter',
    '公共 Drawer 壳层需要控制 Element Plus 的 header、body 和 footer。',
    'overlay'
  ),
  ...createExceptions(
    'UI007',
    'src/components/list-pagination/main.vue',
    ['.el-pagination__'],
    'third-party-adapter',
    '公共分页组件在移动端隐藏低优先级分页信息。',
    'list'
  ),
  ...createExceptions(
    'UI007',
    'src/components/list-panel/main.vue',
    ['.el-table'],
    'third-party-adapter',
    '公共列表面板统一表头、行、固定列和空状态。',
    'list'
  ),
  ...createExceptions(
    'UI007',
    'src/components/page-container/main.vue',
    ['.el-tabs__header'],
    'third-party-adapter',
    '公共页面容器移除页头 Tab 的重复外边距。',
    'page-layout'
  ),
  ...createExceptions(
    'UI007',
    'src/components/search-panel/main.vue',
    ['.el-input__wrapper'],
    'third-party-adapter',
    '公共查询面板统一输入与选择控件边界。',
    'search'
  ),
  ...createExceptions(
    'UI007',
    'src/views/asset/components/prompt-variable-editor.vue',
    ['.el-collapse-item__'],
    'third-party-adapter',
    '提示词变量编辑器需要收敛折叠面板公开结构的间距和边界。',
    'prompt'
  ),
  ...createExceptions(
    'UI007',
    'src/views/monitor/log/api.vue',
    ['.el-descriptions__label'],
    'third-party-adapter',
    '日志详情固定描述标签宽度以保持扫描对齐。',
    'monitor-log'
  ),
  ...createExceptions(
    'UI007',
    'src/views/monitor/log/error.vue',
    ['.el-descriptions__label'],
    'third-party-adapter',
    '日志详情固定描述标签宽度以保持扫描对齐。',
    'monitor-log'
  ),
  ...[
    [
      'src/components/detail-drawer/main.vue',
      '公共 Drawer 移动端覆盖 Element Plus 内联宽度。',
      'overlay',
    ],
    [
      'src/components/search-panel/main.vue',
      '查询折叠字段需要覆盖 Element Plus 栅格显示规则。',
      'search',
    ],
    [
      'src/page/index/top/top-search.vue',
      '历史全局搜索样式需要覆盖输入建议项默认 padding。',
      'navigation',
    ],
    [
      'src/styles/element-plus.scss',
      'Element Plus 全局兼容层需要覆盖组件库默认优先级。',
      'global-style',
    ],
    ['src/styles/iconfont.scss', '图标字体声明需要确保字体族和字号不被业务样式覆盖。', 'icon'],
    ['src/styles/normalize.scss', '浏览器 normalize 保留标准兼容优先级。', 'global-style'],
    ['src/styles/tags.scss', '标签栏工具定位需要覆盖历史内联定位。', 'navigation'],
    ['src/styles/top.scss', '顶部导航需要覆盖 Element Plus 横向菜单默认颜色和边界。', 'navigation'],
    [
      'src/views/asset/components/prompt-editor-dialog.vue',
      '变量编辑区域需要覆盖 Element Plus 表单项默认缩进。',
      'prompt',
    ],
    [
      'src/views/desk/components/notice-editor.vue',
      '富文本编辑器高度需要覆盖第三方内联样式。',
      'notice-editor',
    ],
    ['src/views/wel/index.vue', '欢迎页历史分隔线间距需要覆盖组件默认值。', 'welcome'],
  ].map(([path, reason, owner]) => ({
    rule: 'UI008',
    path,
    scope: 'source',
    match: '!important',
    category: 'third-party-adapter',
    reason,
    owner,
  })),
  ...createValueExceptions(
    'src/config/website.ts',
    ['#1677ff'],
    'theme-preview',
    '默认主色与主题工具的默认值保持一致。',
    'website'
  ),
  ...createValueExceptions(
    'src/styles/login.scss',
    ['#6847db', '#5638c4', '#8e73ef', '#9c86f1'],
    'data-color',
    '登录品牌强调色独立于用户可配置的应用主色，并分别提供浅深主题值。',
    'authentication'
  ),
  ...createValueExceptions(
    'src/page/index/setting.vue',
    ['#f5f5f5', '#ffffff', '#e5e7eb', '#0f1115', '#171a21', '#1d2028', '#242832'],
    'theme-preview',
    '主题缩略图需要固定展示目标浅色和深色表面层级。',
    'layout-setting'
  ),
  ...createValueExceptions(
    'src/styles/normalize.scss',
    ['#ff0', '#000', '#c0c0c0'],
    'third-party-adapter',
    '浏览器基础 normalize 规则保留标准兼容色值。',
    'global-style'
  ),
  ...createValueExceptions(
    'src/styles/mixin.scss',
    ['hsla(220, 4%, 58%, 0.3)'],
    'third-party-adapter',
    '全局滚动条兼容样式保留独立半透明色。',
    'global-style'
  ),
  ...createValueExceptions(
    'src/utils/theme.ts',
    [
      '#1677ff',
      '#1890ff',
      '#f5222d',
      '#fa541c',
      '#faad14',
      '#13c2c2',
      '#52c41a',
      '#2f54eb',
      '#722ed1',
      '#1b1f26',
      '#ffffff',
      '#000000',
    ],
    'theme-preview',
    '主色选项与动态色阶混合目标需要保留可验证的固定颜色。',
    'theme'
  ),
  ...createValueExceptions(
    'src/views/wel/dashboard.vue',
    [
      '#d56259',
      '#419ce7',
      '#56b69b',
      '#d44858',
      '#3a1f7e',
      '#422829',
      '#613cbd',
      '#da542e',
      '#2e8aef',
      '#3d17b8',
      '#e31462',
      '#d9532d',
      '#b72147',
      '#18794e',
      '#0c56bf',
      '#0098a9',
      '#209bdf',
      '#603bbc',
      '#009bad',
      '#d74e2a',
    ],
    'data-color',
    '欢迎页演示磁贴使用数据分类色，不参与应用表面主题。',
    'welcome'
  ),
  {
    rule: 'UI011',
    path: 'src/page/index/setting.vue',
    scope: 'template',
    match: '320px',
    category: 'special-overlay',
    reason: '界面设置抽屉保持窄工具面板宽度。',
    owner: 'layout-setting',
  },
];
