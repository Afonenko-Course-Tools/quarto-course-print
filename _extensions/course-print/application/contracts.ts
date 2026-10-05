export interface PrintOptions {
  assets?: string;
}
export interface PrintResult {
  status: "built";
  engineCalls: number;
  timings: Record<string, number>;
}
export interface PrintDocument {
  "pandoc-api-version": unknown[];
  meta: Record<string, unknown>;
  blocks: unknown[];
}
export interface PrintHeader {
  date?: string;
  group?: string;
}
export interface FileDigest {
  path: string;
  sha256: string;
}
