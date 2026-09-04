export interface PageState {
  currentPage: number;
  pageSize: number;
  total: number;
}

export interface PageResult<T> {
  records: T[];
  total: number;
}

export interface PaginationChange {
  currentPage: number;
  pageSize: number;
}

export interface PageListOptions<T, Q extends object, R> {
  fetcher: (current: number, size: number, query: Q) => Promise<R>;
  resolveResponse: (response: R) => PageResult<T>;
  createInitialQuery: () => Q;
  initialPageSize?: number;
}
