export type TreeKey = string | number;

export interface TreeNode {
  id: TreeKey;
  title?: string;
  children?: TreeNode[];
}

export interface TreeListOptions<T extends TreeNode, Q extends object, R> {
  fetcher: (query: Q) => Promise<R>;
  resolveResponse: (response: R) => T[];
  createInitialQuery: () => Q;
  getRowKey?: (row: T) => TreeKey;
}
