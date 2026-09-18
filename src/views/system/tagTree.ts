import type { TagStatus, TagTreeNode } from '@/api/system/tag';

export interface TagTreeFilter {
  name?: string;
  code?: string;
  status?: TagStatus;
}

export interface TagTreeSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  children?: TagTreeSelectOption[];
}

const normalizeFilterText = (value?: string) => value?.trim().toLowerCase() ?? '';

export const hasTagTreeFilter = (filter: TagTreeFilter) =>
  Boolean(normalizeFilterText(filter.name) || normalizeFilterText(filter.code)) ||
  filter.status !== undefined;

export const filterTagTree = (rows: TagTreeNode[], filter: TagTreeFilter): TagTreeNode[] => {
  if (!hasTagTreeFilter(filter)) return rows;

  const name = normalizeFilterText(filter.name);
  const code = normalizeFilterText(filter.code);

  return rows.flatMap(row => {
    const children = filterTagTree(row.children ?? [], filter);
    const selfMatches =
      (!name || row.tagName.toLowerCase().includes(name)) &&
      (!code || row.tagCode.toLowerCase().includes(code)) &&
      (filter.status === undefined || row.status === filter.status);

    return selfMatches || children.length ? [{ ...row, children }] : [];
  });
};

export const findTagNode = (rows: TagTreeNode[], id: string): TagTreeNode | undefined => {
  for (const row of rows) {
    if (row.id === id) return row;
    const child = findTagNode(row.children ?? [], id);
    if (child) return child;
  }
};

export const collectDescendantIds = (rows: TagTreeNode[], id: string) => {
  const ids = new Set<string>();
  const target = findTagNode(rows, id);

  const collect = (nodes: TagTreeNode[]) => {
    nodes.forEach(node => {
      ids.add(node.id);
      collect(node.children ?? []);
    });
  };

  collect(target?.children ?? []);
  return ids;
};

export const mapTagTreeSelectOptions = (
  rows: TagTreeNode[],
  disabledIds = new Set<string>()
): TagTreeSelectOption[] =>
  rows.map(row => ({
    value: row.id,
    label: row.tagName,
    disabled: disabledIds.has(row.id),
    children: row.children?.length ? mapTagTreeSelectOptions(row.children, disabledIds) : undefined,
  }));

export const collectExpandableIds = (rows: TagTreeNode[]) => {
  const ids: string[] = [];
  rows.forEach(row => {
    if (row.children?.length) {
      ids.push(row.id);
      ids.push(...collectExpandableIds(row.children));
    }
  });
  return ids;
};

export const countTagTreeNodes = (rows: TagTreeNode[]): number =>
  rows.reduce((total, row) => total + 1 + countTagTreeNodes(row.children ?? []), 0);
