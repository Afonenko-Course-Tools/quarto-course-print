export interface PrintOptions {
  /** Trusted caller: current producer validation and final route resolution succeeded. */
  upstreamCurrent?: boolean;
  /** SHA256 of the immutable installed toolchain distribution, verified by caller. */
  toolchainIdentity?: string;
  /** Previous owned target, for materializing into a fresh release candidate. */
  previous?: string;
  /** Trusted recipe directory; defaults to the extension's installed assets. */
  assets?: string;
}
export interface PrintResult {
  status: "built" | "reused";
  reusable: boolean;
  fingerprint: string;
  engineCalls: number;
  timings: Record<string, number>;
}
/** The existing native Pandoc document consumed by Print; no alternate export representation. */
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
export interface PrintReceipt {
  owner: "course-print";
  recipe: string;
  target: string;
  reusable: boolean;
  fingerprint: string;
  dependencies: string[];
  outputs: FileDigest[];
}
