import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p',
  'br',
  'div',
  'span',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'code',
  'ul',
  'ol',
  'li',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'sub',
  'sup',
  'a',
  'img',
  'video',
  'source',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'colgroup',
  'col',
];

const ALLOWED_ATTR = [
  'href',
  'target',
  'title',
  'rel',
  'src',
  'alt',
  'width',
  'height',
  'controls',
  'poster',
  'type',
  'colspan',
  'rowspan',
  'style',
];

const SAFE_STYLE_PROPERTIES = new Set([
  'color',
  'background-color',
  'font-size',
  'font-family',
  'text-align',
  'line-height',
  'text-indent',
  'margin-left',
  'letter-spacing',
]);

const ELEMENT_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'title', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  video: new Set(['src', 'controls', 'width', 'height', 'poster']),
  source: new Set(['src', 'type']),
  th: new Set(['colspan', 'rowspan']),
  td: new Set(['colspan', 'rowspan']),
};

const SAFE_URL = /^(?:(?:https?|mailto):|[/#?]|\.{0,2}\/)/i;

const sanitizeStyle = (style: string) => {
  const source = document.createElement('span').style;
  const safeStyle = document.createElement('span').style;
  source.cssText = style;
  for (const property of SAFE_STYLE_PROPERTIES) {
    const value = source.getPropertyValue(property);
    if (value && !value.toLowerCase().includes('url(')) {
      safeStyle.setProperty(property, value, source.getPropertyPriority(property));
    }
  }
  return safeStyle.cssText;
};

const hasUnsafeStyle = (style: string) => {
  const source = document.createElement('span').style;
  source.cssText = style;
  return Array.from({ length: source.length }, (_value, index) => source.item(index)).some(
    property => {
      const value = source.getPropertyValue(property);
      return !SAFE_STYLE_PROPERTIES.has(property) || value.toLowerCase().includes('url(');
    }
  );
};

DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'style') {
    data.attrValue = sanitizeStyle(data.attrValue);
  }
});

DOMPurify.addHook('afterSanitizeAttributes', node => {
  if (node instanceof HTMLAnchorElement) {
    node.setAttribute('rel', 'nofollow noopener noreferrer');
  }
});

export const sanitizeNoticeHtml = (html?: string): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: SAFE_URL,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
  });
};

export const hasNoticeHtmlCompatibilityRisk = (html?: string): boolean => {
  if (!html) return false;
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(parsed.body.querySelectorAll('*')).some(element => {
    const tag = element.tagName.toLowerCase();
    if (!ALLOWED_TAGS.includes(tag)) return true;
    return Array.from(element.attributes).some(attribute => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('data-w-e-')) return false;
      if (name === 'style') return hasUnsafeStyle(attribute.value);
      const allowed = ELEMENT_ATTRIBUTES[tag];
      if (!allowed?.has(name)) return true;
      if ((name === 'href' || name === 'src' || name === 'poster') && attribute.value) {
        return !SAFE_URL.test(attribute.value);
      }
      return false;
    });
  });
};

export const extractNoticeText = (html?: string): string => {
  if (!html) return '';
  const parsed = new DOMParser().parseFromString(sanitizeNoticeHtml(html), 'text/html');
  return (parsed.body.textContent ?? '').replace(/\s+/g, ' ').trim();
};

export const isNoticeHtmlEmpty = (html?: string): boolean => {
  const sanitized = sanitizeNoticeHtml(html);
  if (!sanitized) return true;
  const parsed = new DOMParser().parseFromString(sanitized, 'text/html');
  const hasRichContent = parsed.body.querySelector('img, video, source, table');
  return !hasRichContent && !(parsed.body.textContent ?? '').replace(/\u00a0/g, ' ').trim();
};
