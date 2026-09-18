import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parse } from '@vue/compiler-sfc';
import {
  exceptions,
  pageLayouts,
  routePageExceptions,
  ruleLevels,
  ruleNames,
} from './style-audit.config.mjs';

const root = process.cwd();
const baselinePath = path.join(root, 'scripts/style-audit-baseline.json');
const args = new Set(process.argv.slice(2));
const reportOnly = args.has('--report');
const writeBaseline = args.has('--write-baseline');
const failOnStale = args.has('--fail-on-stale');
const sourceExtensions = new Set(['.vue', '.scss', '.css', '.ts']);
const exceptionCategories = new Set([
  'data-color',
  'media-overlay',
  'theme-preview',
  'component-geometry',
  'third-party-adapter',
  'special-overlay',
]);

const toPosix = value => value.split(path.sep).join('/');
const normalize = value => value.replace(/\s+/g, ' ').trim();
const lineAt = (source, offset) => source.slice(0, offset).split('\n').length;

const walk = async directory => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolutePath)));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(absolutePath);
  }
  return files;
};

const validateConfig = () => {
  const invalidRules = Object.entries(ruleLevels).filter(
    ([rule, level]) => !ruleNames[rule] || !['error', 'warning'].includes(level)
  );
  if (invalidRules.length > 0) throw new Error(`非法规则配置：${JSON.stringify(invalidRules)}`);

  for (const exception of exceptions) {
    if (
      !ruleLevels[exception.rule] ||
      !exception.path ||
      !exception.match ||
      !exception.reason ||
      !exception.owner ||
      !exceptionCategories.has(exception.category)
    ) {
      throw new Error(`非法例外配置：${JSON.stringify(exception)}`);
    }
  }
};

const createFinding = ({ rule, relativePath, blockKind, context, property, value, line }) => ({
  rule,
  name: ruleNames[rule],
  level: ruleLevels[rule],
  path: relativePath,
  blockKind,
  context: normalize(context || blockKind),
  property: normalize(property || ''),
  value: normalize(value || ''),
  line,
});

const scanMatches = (text, regex, callback) => {
  regex.lastIndex = 0;
  for (let match = regex.exec(text); match; match = regex.exec(text)) callback(match);
};

const selectorAt = (text, offset) => {
  const lines = text.slice(0, offset).split('\n');
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index].trim();
    if (line.endsWith('{')) return normalize(line.slice(0, -1));
  }
  return 'root';
};

const scanCss = (text, relativePath, blockKind, baseLine, scoped) => {
  const findings = [];
  const addDeclarationFinding = (rule, match, property, value) => {
    if (
      relativePath === 'src/styles/theme/tokens.scss' &&
      ['UI001', 'UI002', 'UI003', 'UI004'].includes(rule)
    ) {
      return;
    }
    findings.push(
      createFinding({
        rule,
        relativePath,
        blockKind,
        context: selectorAt(text, match.index),
        property,
        value,
        line: baseLine + text.slice(0, match.index).split('\n').length - 1,
      })
    );
  };

  scanMatches(
    text,
    /([\w-]*(?:color|background|border|fill|stroke)[\w-]*)\s*:\s*([^;{}]*(?:#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))[^;{}]*)(?:;|$)/gi,
    match => addDeclarationFinding('UI001', match, match[1], match[2])
  );
  scanMatches(
    text,
    /(--[\w-]+)\s*:\s*([^;{}]*(?:#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))[^;{}]*)(?:;|$)/gi,
    match => addDeclarationFinding('UI001', match, match[1], match[2])
  );
  scanMatches(
    text,
    /border-radius\s*:\s*([^;{}]*(?:\d+(?:\.\d+)?(?:px|rem|em|%))[^;{}]*)(?:;|$)/gi,
    match => addDeclarationFinding('UI002', match, 'border-radius', match[1])
  );
  scanMatches(text, /box-shadow\s*:\s*([^;{}]+)(?:;|$)/gi, match => {
    if (!/\b(?:none|var\()/.test(match[1])) {
      addDeclarationFinding('UI003', match, 'box-shadow', match[1]);
    }
  });
  scanMatches(
    text,
    /((?:margin|padding)(?:-(?:top|right|bottom|left|inline|block))?|gap|row-gap|column-gap)\s*:\s*([^;{}]*(?:\d+(?:\.\d+)?(?:px|rem|em))[^;{}]*)(?:;|$)/gi,
    match => addDeclarationFinding('UI004', match, match[1], match[2])
  );
  scanMatches(
    text,
    /([^{}]*(?::deep|:global)\([^{}]*\.el-[\w-]+__[\w-]+[^{}]*\)[^{}]*)\{/gi,
    match =>
      findings.push(
        createFinding({
          rule: 'UI007',
          relativePath,
          blockKind,
          context: match[1],
          property: 'selector',
          value: match[1],
          line: baseLine + text.slice(0, match.index).split('\n').length - 1,
        })
      )
  );
  scanMatches(text, /!important\b/gi, match =>
    findings.push(
      createFinding({
        rule: 'UI008',
        relativePath,
        blockKind,
        context: selectorAt(text, match.index),
        property: '!important',
        value: '!important',
        line: baseLine + text.slice(0, match.index).split('\n').length - 1,
      })
    )
  );

  if (!scoped && /^(?:src\/views|src\/page)\//.test(relativePath)) {
    scanMatches(text, /(^|})\s*(\.el-[\w-]+__[\w-]+[^,{]*)[,\{]/gim, match =>
      findings.push(
        createFinding({
          rule: 'UI012',
          relativePath,
          blockKind,
          context: match[2],
          property: 'selector',
          value: match[2],
          line: baseLine + text.slice(0, match.index).split('\n').length - 1,
        })
      )
    );
  }

  return findings;
};

const scanTemplate = (text, relativePath, baseLine) => {
  const findings = [];
  const addTagFinding = (rule, match, tag) => {
    findings.push(
      createFinding({
        rule,
        relativePath,
        blockKind: 'template',
        context: tag,
        property: tag,
        value: tag,
        line: baseLine + text.slice(0, match.index).split('\n').length - 1,
      })
    );
  };

  if (relativePath !== 'src/components/app-dialog/main.vue') {
    scanMatches(text, /<el-dialog\b/gi, match => addTagFinding('UI005', match, 'el-dialog'));
  }
  if (relativePath !== 'src/components/detail-drawer/main.vue') {
    scanMatches(text, /<el-drawer\b/gi, match => addTagFinding('UI006', match, 'el-drawer'));
  }
  scanMatches(
    text,
    /(?:style\s*=\s*["'][^"']*(?:#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))[^"']*["']|(?:color|background-color|border-color)\s*=\s*["'](?:#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))["'])/gi,
    match =>
      findings.push(
        createFinding({
          rule: 'UI001',
          relativePath,
          blockKind: 'template',
          context: 'inline-style',
          property: 'style',
          value: match[0],
          line: baseLine + text.slice(0, match.index).split('\n').length - 1,
        })
      )
  );
  scanMatches(
    text,
    /<(?:el-dialog|el-drawer|app-dialog|form-dialog|detail-drawer)\b[\s\S]*?>/gi,
    match => {
      const sizeMatch = match[0].match(
        /(?::?(?:width|size))\s*=\s*["']([^"']*(?:px|%)[^"']*)["']/i
      );
      if (!sizeMatch) return;
      findings.push(
        createFinding({
          rule: 'UI011',
          relativePath,
          blockKind: 'template',
          context: normalize(match[0].match(/^<[^\s>]+/)?.[0] || 'overlay'),
          property: 'width/size',
          value: sizeMatch[1],
          line: baseLine + text.slice(0, match.index).split('\n').length - 1,
        })
      );
    }
  );
  return findings;
};

const scanScript = (text, relativePath, blockKind, baseLine) => {
  const findings = [];
  scanMatches(text, /#[0-9a-f]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/gi, match =>
    findings.push(
      createFinding({
        rule: 'UI001',
        relativePath,
        blockKind,
        context: normalize(
          text.slice(Math.max(0, match.index - 60), match.index + match[0].length + 60)
        ),
        property: 'color-literal',
        value: match[0],
        line: baseLine + text.slice(0, match.index).split('\n').length - 1,
      })
    )
  );
  return findings;
};

const scanVue = (source, relativePath) => {
  const { descriptor, errors } = parse(source, { filename: relativePath });
  if (errors.length > 0) throw new Error(`${relativePath} 解析失败：${String(errors[0])}`);
  const findings = [];
  if (descriptor.template) {
    const baseLine = lineAt(source, descriptor.template.loc.start.offset);
    findings.push(...scanTemplate(descriptor.template.content, relativePath, baseLine));
  }
  for (const script of [descriptor.script, descriptor.scriptSetup].filter(Boolean)) {
    const baseLine = lineAt(source, script.loc.start.offset);
    findings.push(...scanScript(script.content, relativePath, 'script', baseLine));
  }
  for (const style of descriptor.styles) {
    const baseLine = lineAt(source, style.loc.start.offset);
    findings.push(
      ...scanCss(style.content, relativePath, 'style', baseLine, Boolean(style.scoped))
    );
  }
  return findings;
};

const scanPageLayouts = async findings => {
  const configuredPaths = new Set(Object.keys(pageLayouts));
  const viewFiles = (await walk(path.join(root, 'src/views')))
    .map(file => toPosix(path.relative(root, file)))
    .filter(file => file.endsWith('.vue') && !file.includes('/components/'));

  for (const relativePath of viewFiles) {
    if (routePageExceptions.includes(relativePath)) continue;
    if (!configuredPaths.has(relativePath)) {
      findings.push(
        createFinding({
          rule: 'UI009',
          relativePath,
          blockKind: 'template',
          context: 'page-layout-registry',
          property: 'layout',
          value: 'unregistered',
          line: 1,
        })
      );
      continue;
    }

    const source = await fs.readFile(path.join(root, relativePath), 'utf8');
    const expectedLayout = pageLayouts[relativePath];
    const pattern = new RegExp(
      `<page-container\\b[\\s\\S]*?\\blayout=["']${expectedLayout}["']`,
      'i'
    );
    if (!pattern.test(source)) {
      findings.push(
        createFinding({
          rule: 'UI009',
          relativePath,
          blockKind: 'template',
          context: 'page-container',
          property: 'layout',
          value: expectedLayout,
          line: 1,
        })
      );
    }
  }
};

const scanForbiddenUi = async findings => {
  const packageSource = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const dependencies = { ...packageSource.dependencies, ...packageSource.devDependencies };
  for (const dependency of Object.keys(dependencies)) {
    if (!/(?:avue|ant-design-vue)/i.test(dependency)) continue;
    findings.push(
      createFinding({
        rule: 'UI010',
        relativePath: 'package.json',
        blockKind: 'package',
        context: 'dependencies',
        property: dependency,
        value: dependencies[dependency],
        line: 1,
      })
    );
  }
};

const exceptionFor = finding =>
  exceptions.find(
    exception =>
      exception.rule === finding.rule &&
      exception.path === finding.path &&
      (exception.scope === 'context' ? finding.context : finding.value).includes(exception.match)
  );

const groupFindings = findings => {
  const grouped = new Map();
  for (const finding of findings) {
    const signature = [
      finding.rule,
      finding.path,
      finding.blockKind,
      finding.context,
      finding.property,
      finding.value,
    ].join(' | ');
    const current = grouped.get(signature);
    if (current) current.count += 1;
    else grouped.set(signature, { ...finding, signature, count: 1 });
  }
  return [...grouped.values()].sort((a, b) => a.signature.localeCompare(b.signature));
};

const loadBaseline = async () => {
  try {
    return JSON.parse(await fs.readFile(baselinePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  }
};

const baselineRecord = finding => ({
  rule: finding.rule,
  path: finding.path,
  blockKind: finding.blockKind,
  context: finding.context,
  property: finding.property,
  value: finding.value,
  count: finding.count,
});

const run = async () => {
  validateConfig();
  const files = await walk(path.join(root, 'src'));
  const findings = [];
  for (const absolutePath of files.sort()) {
    const relativePath = toPosix(path.relative(root, absolutePath));
    const source = await fs.readFile(absolutePath, 'utf8');
    if (relativePath.endsWith('.vue')) findings.push(...scanVue(source, relativePath));
    else if (/\.(?:scss|css)$/.test(relativePath)) {
      findings.push(...scanCss(source, relativePath, 'style', 1, false));
    } else if (relativePath.endsWith('.ts')) {
      findings.push(...scanScript(source, relativePath, 'script', 1));
    }
  }
  await scanPageLayouts(findings);
  await scanForbiddenUi(findings);

  const grouped = groupFindings(findings).map(finding => ({
    ...finding,
    exception: exceptionFor(finding),
  }));
  const active = grouped.filter(finding => !finding.exception);
  const counts = Object.keys(ruleLevels).map(rule => ({
    rule,
    name: ruleNames[rule],
    count: grouped
      .filter(finding => finding.rule === rule)
      .reduce((sum, item) => sum + item.count, 0),
    exceptions: grouped
      .filter(finding => finding.rule === rule && finding.exception)
      .reduce((sum, item) => sum + item.count, 0),
  }));

  console.log('Saber 样式审计');
  for (const item of counts) {
    if (item.count > 0) {
      console.log(`  ${item.rule} ${item.name}: ${item.count}（例外 ${item.exceptions}）`);
    }
  }

  if (reportOnly) {
    for (const finding of grouped) {
      const suffix = finding.exception
        ? ` [例外:${finding.exception.category}] ${finding.exception.reason}`
        : '';
      console.log(
        `${finding.level.toUpperCase()} ${finding.rule} ${finding.path}:${finding.line} ${
          finding.property
        }=${finding.value} x${finding.count}${suffix}`
      );
    }
    return;
  }

  if (writeBaseline) {
    const baseline = {
      version: 1,
      generatedAt: '2026-09-14',
      findings: active.map(baselineRecord),
    };
    await fs.writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
    console.log(
      `已写入基线：${toPosix(path.relative(root, baselinePath))}（${baseline.findings.length} 项）`
    );
    return;
  }

  const baseline = await loadBaseline();
  if (!baseline || baseline.version !== 1 || !Array.isArray(baseline.findings)) {
    throw new Error('缺少有效样式基线，请先运行 node scripts/style-audit.mjs --write-baseline');
  }

  const baselineMap = new Map(
    baseline.findings.map(item => [
      [item.rule, item.path, item.blockKind, item.context, item.property, item.value].join(' | '),
      item.count,
    ])
  );
  const activeMap = new Map(active.map(item => [item.signature, item.count]));
  const newErrors = active.filter(
    finding =>
      finding.level === 'error' && finding.count > (baselineMap.get(finding.signature) || 0)
  );
  const stale = baseline.findings.filter(item => {
    const signature = [
      item.rule,
      item.path,
      item.blockKind,
      item.context,
      item.property,
      item.value,
    ].join(' | ');
    return (activeMap.get(signature) || 0) < item.count;
  });

  for (const finding of newErrors) {
    console.error(
      `新增风险 ${finding.rule} ${finding.path}:${finding.line} ${finding.property}=${finding.value}`
    );
  }
  if (failOnStale) {
    for (const item of stale) {
      console.error(`陈旧基线 ${item.rule} ${item.path} ${item.property}=${item.value}`);
    }
  }

  if (newErrors.length > 0 || (failOnStale && stale.length > 0)) process.exitCode = 1;
  else console.log(`审计通过：无新增 error${failOnStale ? '，无陈旧基线' : ''}。`);
};

run().catch(error => {
  console.error(`样式审计失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
