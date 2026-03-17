/** ISO 8601 timestamp string */
export type Timestamp = string;

/** Generic ID type */
export type ID = string;

/** Status shared across entities */
export type Status = "idle" | "running" | "paused" | "completed" | "error";

/** Generic key-value metadata */
export type Metadata = Record<string, string | number | boolean | null>;

/** Pagination params */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  cursor?: string;
}

/** Generic async result */
export type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };
