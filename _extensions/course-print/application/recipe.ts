import { fileURLToPath } from "node:url";
import { fail, type PrintResource } from "../infrastructure/transport.ts";
import {
  digest,
  encode,
  files,
  json,
  safePath,
} from "../infrastructure/files.ts";
import type { FileDigest, PrintDocument, PrintOptions } from "./contracts.ts";
export interface PrintRecipe {
  version: string;
  assets: string;
  assetIndex: FileDigest[];
  resourceIndex: FileDigest[];
  publicJson: string;
  fingerprint: string;
  reusable: boolean;
  expected: string[];
}
export async function prepareRecipe(
  doc: PrintDocument,
  resources: readonly PrintResource[],
  options: PrintOptions,
): Promise<PrintRecipe> {
  const version = "course-print-current-v1";
  const assets = await safePath(
    options.assets ?? fileURLToPath(new URL("../assets/", import.meta.url)),
  );
  if (
    options.toolchainIdentity !== undefined &&
    !/^[a-f0-9]{64}$/.test(options.toolchainIdentity)
  ) fail("toolchainIdentity must be verified distribution SHA256");
  const assetIndex = await files(assets);
  if (
    !assetIndex.some((f) => f.path === "default.typst") ||
    !assetIndex.some((f) => f.path === "template.typst") ||
    !assetIndex.some((f) => f.path.startsWith("fonts/"))
  ) fail("incomplete installed template/font recipe");
  const publicJson = json(doc) + "\n";
  const resourceIndex: FileDigest[] = resources.map((r) => ({
    path: r.target,
    sha256: r.sha256,
  })).sort((a, b) => a.path.localeCompare(b.path, "en"));
  const fingerprint = await digest(
    encode(
      json({
        recipe: version,
        doc,
        resourceIndex,
        assetIndex,
        toolchain: options.toolchainIdentity ?? null,
      }),
    ),
  );
  return {
    version,
    assets,
    assetIndex,
    resourceIndex,
    publicJson,
    fingerprint,
    reusable: !!options.toolchainIdentity,
    expected: [
      "handout.pdf",
      "public.json",
      ...resourceIndex.map((f) => f.path),
    ].sort(),
  };
}
