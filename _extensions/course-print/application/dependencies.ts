import { relative, resolve, sep } from "node:path";
import { fail, record } from "../infrastructure/transport.ts";
import { safeRelative } from "../infrastructure/files.ts";
import type { PrintRecipe } from "./recipe.ts";
export const knownDependency = (
  name: unknown,
  recipe: PrintRecipe,
): name is string =>
  safeRelative(name) &&
  (name === "handout.typ" ||
    recipe.resourceIndex.some((f) => f.path === name) ||
    recipe.assetIndex.some((f) => "recipe/" + f.path === name));
export async function compilerDependencies(
  build: string,
  recipe: PrintRecipe,
): Promise<string[]> {
  const deps: unknown = JSON.parse(
    await Deno.readTextFile(build + "/deps.json"),
  );
  if (
    !record(deps) || !Array.isArray(deps.inputs) || !Array.isArray(deps.outputs)
  ) {
    fail("invalid compiler dependencies");
  }
  const dependencies = deps.inputs.map((input: unknown) => {
    if (typeof input !== "string") return fail("invalid compiler input");
    const name = relative(build, resolve(build, input)).split(sep).join(
      "/",
    );
    if (!safeRelative(name)) fail("compiler dependency escaped staging");
    // Every compiler input must belong to the explicit, hashed closure or generated source.
    if (!knownDependency(name, recipe)) {
      fail("unknown compiler dependency " + name);
    }
    return name;
  }).sort();
  if (
    !dependencies.includes("handout.typ") ||
    new Set(dependencies).size !== dependencies.length
  ) fail("incomplete compiler dependency evidence");
  return dependencies;
}
