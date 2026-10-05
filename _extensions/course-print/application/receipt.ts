import { fail, record } from "../infrastructure/transport.ts";
import { info, json, matches, safeRelative } from "../infrastructure/files.ts";
import type { FileDigest, PrintReceipt } from "./contracts.ts";
import type { PrintRecipe } from "./recipe.ts";
import { knownDependency } from "./dependencies.ts";
export const marker = ".course-print.json";
export async function readReceipt(
  dir: string,
): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = JSON.parse(
      await Deno.readTextFile(dir + "/" + marker),
    );
    return record(value) ? value : null;
  } catch {
    return null;
  }
}
export async function owned(dir: string, work: string) {
  const stat = await info(dir);
  if (!stat) return;
  if (stat.isSymlink || !stat.isDirectory) {
    fail("expected owned target directory, no symlink");
  }
  const entries = [];
  for await (const e of Deno.readDir(dir)) entries.push(e.name);
  if (!entries.length) return;
  const r = await readReceipt(dir);
  if (r?.owner !== "course-print" || r.target !== work) {
    fail("refusing non-owned target directory");
  }
}

/** Validate the receipt against the current public projection before any reuse. */
export async function reusableReceipt(
  previous: string,
  work: string,
  recipe: PrintRecipe,
): Promise<PrintReceipt | null> {
  const prior = await readReceipt(previous);
  if (
    !(recipe.reusable && prior?.owner === "course-print" &&
      prior.target === work &&
      prior.recipe === recipe.version && prior.reusable === true &&
      prior.fingerprint === recipe.fingerprint &&
      Array.isArray(prior.dependencies) &&
      prior.dependencies.every((name) => knownDependency(name, recipe)) &&
      prior.dependencies.includes("handout.typ") &&
      new Set(prior.dependencies).size === prior.dependencies.length &&
      Array.isArray(prior.outputs) &&
      prior.outputs.every((f): f is FileDigest =>
        record(f) && typeof f.sha256 === "string" && safeRelative(f.path)
      ) &&
      json(prior.outputs.map((f) => f.path).sort()) === json(recipe.expected) &&
      await matches(previous, prior.outputs))
  ) return null;
  return {
    owner: "course-print",
    target: work,
    recipe: recipe.version,
    reusable: true,
    fingerprint: recipe.fingerprint,
    dependencies: prior.dependencies,
    outputs: prior.outputs,
  };
}
