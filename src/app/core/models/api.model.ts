export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export type QueryParamValue = string | number | boolean | readonly (string | number | boolean)[];
export type QueryParams = Record<string, QueryParamValue>;
