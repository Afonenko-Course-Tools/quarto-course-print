import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { command, fail } from "../infrastructure/transport.ts";
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
const marker = ".course-print.json";
const recipe = "course-print-current-v1";
const encode = (s: string) => new TextEncoder().encode(s);
const json = (v: unknown) => JSON.stringify(v);
const digest = async (b: Uint8Array) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(b))),
  ).map((x) => x.toString(16).padStart(2, "0")).join("");
type File = { path: string; sha256: string };
async function info(path: string) {
  try {
    return await Deno.lstat(path);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return null;
    throw e;
  }
}
function safeRelative(path: unknown): path is string {
  return typeof path === "string" && /^[A-Za-z0-9._/-]+$/.test(path) &&
    !isAbsolute(path) &&
    !path.split("/").some((x) => !x || x === "." || x === "..");
}
async function safePath(path: string) {
  if (path.split(/[\\/]/).some((p) => p === "." || p === "..")) {
    fail("destination aliases unsupported");
  }
  const absolute = resolve(path);
  for (let p = absolute;; p = dirname(p)) {
    const existing = await info(p);
    if (existing) {
      // Detect links anywhere in the existing prefix without requesting read
      // permission for ancestors outside an installed consumer's sandbox.
      if (existing.isSymlink || resolve(await Deno.realPath(p)) !== p) {
        fail("symlink destination/input");
      }
      break;
    }
    if (dirname(p) === p) break;
  }
  return absolute;
}
async function readReceipt(dir: string) {
  try {
    return JSON.parse(await Deno.readTextFile(dir + "/" + marker));
  } catch {
    return null;
  }
}
async function owned(dir: string, work: string) {
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
async function files(root: string, prefix = ""): Promise<File[]> {
  const result: File[] = [];
  for await (const e of Deno.readDir(root + (prefix ? "/" + prefix : ""))) {
    const name = prefix ? prefix + "/" + e.name : e.name;
    if (!safeRelative(name) || e.isSymlink) fail("unsafe recipe/artifact file");
    if (e.isDirectory) result.push(...await files(root, name));
    else if (e.isFile) {
      result.push({
        path: name,
        sha256: await digest(await Deno.readFile(root + "/" + name)),
      });
    } else fail("unsupported recipe/artifact file");
  }
  return result.sort((a, b) => a.path.localeCompare(b.path, "en"));
}
async function write(path: string, bytes: Uint8Array) {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeFile(path, bytes);
}
async function matches(root: string, index: File[]) {
  try {
    for (const f of index) {
      if (!safeRelative(f.path)) return false;
      await safePath(root + "/" + f.path);
      if (await digest(await Deno.readFile(root + "/" + f.path)) !== f.sha256) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
async function copyIndex(source: string, dest: string, index: File[]) {
  for (const f of index) {
    const bytes = await Deno.readFile(source + "/" + f.path);
    if (await digest(bytes) !== f.sha256) {
      fail("input changed during materialization");
    }
    await write(dest + "/" + f.path, bytes);
  }
}
export async function materialize(
  doc: any,
  resources: any[],
  work: string,
  out: string,
  options: PrintOptions,
  validationMs: number,
): Promise<PrintResult> {
  const started = performance.now(),
    timings: Record<string, number> = { validate: validationMs };
  const destination = await safePath(out), parent = dirname(destination);
  const assets = await safePath(
    options.assets ?? fileURLToPath(new URL("../assets/", import.meta.url)),
  );
  const previous = await safePath(options.previous ?? destination);
  if (
    options.toolchainIdentity !== undefined &&
    !/^[a-f0-9]{64}$/.test(options.toolchainIdentity)
  ) fail("toolchainIdentity must be verified distribution SHA256");
  await owned(destination, work);
  if (previous !== destination) await owned(previous, work);
  const assetIndex = await files(assets);
  if (
    !assetIndex.some((f) => f.path === "default.typst") ||
    !assetIndex.some((f) => f.path === "template.typst") ||
    !assetIndex.some((f) => f.path.startsWith("fonts/"))
  ) fail("incomplete installed template/font recipe");
  const publicJson = json(doc) + "\n";
  const resourceIndex: File[] = resources.map((r) => ({
    path: r.target,
    sha256: r.sha256,
  })).sort((a, b) => a.path.localeCompare(b.path, "en"));
  const fingerprint = await digest(
    encode(
      json({
        recipe,
        doc,
        resourceIndex,
        assetIndex,
        toolchain: options.toolchainIdentity ?? null,
      }),
    ),
  );
  timings.fingerprint = performance.now() - started;
  const reusable = !!options.toolchainIdentity;
  let engineCalls = 0, status: "built" | "reused" = "built";
  const prior = await readReceipt(previous);
  // The exact expected output set is derived from this validated public projection.
  const expected = [
    "handout.pdf",
    "public.json",
    ...resourceIndex.map((f) => f.path),
  ].sort();
  const knownDependency = (name: unknown): name is string =>
    safeRelative(name) && (name === "handout.typ" ||
      resourceIndex.some((f) => f.path === name) ||
      assetIndex.some((f) => "recipe/" + f.path === name));
  const canReuse = reusable && prior?.owner === "course-print" &&
    prior.target === work && prior.recipe === recipe &&
    prior.reusable === true && prior.fingerprint === fingerprint &&
    Array.isArray(prior.dependencies) &&
    prior.dependencies.every(knownDependency) &&
    prior.dependencies.includes("handout.typ") &&
    new Set(prior.dependencies).size === prior.dependencies.length &&
    Array.isArray(prior.outputs) &&
    prior.outputs.every((f: any) =>
      f && typeof f.sha256 === "string" && safeRelative(f.path)
    ) && json(
        prior.outputs.map((f: File) => f.path).sort(),
      ) === json(expected) &&
    await matches(previous, prior.outputs);
  await Deno.mkdir(parent, { recursive: true });
  // One caller owns a target; concurrent attempts fail rather than interleave publication.
  const lock = destination + ".print-lock";
  const handle = await Deno.open(lock, { write: true, createNew: true });
  let stage: string | undefined;
  let preserveRecovery = false;
  try {
    await owned(destination, work);
    stage = await Deno.makeTempDir({
      dir: parent,
      prefix: ".course-print-attempt-",
    });
    const candidate = stage + "/candidate", build = stage + "/build";
    await Deno.mkdir(candidate);
    let dependencies: string[] = [];
    const staging = performance.now();
    if (canReuse) {
      await copyIndex(previous, candidate, prior.outputs);
      dependencies = prior.dependencies;
      status = "reused";
    } else {
      await Deno.mkdir(build);
      await copyIndex(assets, build + "/recipe", assetIndex);
      await write(build + "/public.json", encode(publicJson));
      for (const r of resources) {
        await write(
          build + "/" + r.target,
          Uint8Array.from(atob(r.data), (c: string) => c.charCodeAt(0)),
        );
      }
      // Explicit public CLI components; no author project, filters, hooks or execution.
      await Deno.writeTextFile(
        build + "/_quarto.yml",
        "project:\n  type: default\n",
      );
      await Deno.mkdir(build + "/empty-data");
      timings.staging = performance.now() - staging;
      const pandoc = performance.now();
      engineCalls++;
      await command(
        "quarto",
        [
          "pandoc",
          "public.json",
          "--from=json",
          "--to=typst",
          "--standalone",
          "--data-dir=empty-data",
          "--template=recipe/default.typst",
          "--metadata=papersize:a4",
          "--metadata=mainfont:DejaVu Sans",
          "--metadata=codefont:DejaVu Sans Mono",
          "--metadata=mathfont:Latin Modern Math",
          "--output=handout.typ",
        ],
        undefined,
        build,
      );
      timings.pandoc = performance.now() - pandoc;
      const typst = performance.now();
      engineCalls++;
      await command(
        "quarto",
        [
          "typst",
          "compile",
          "handout.typ",
          "handout.pdf",
          "--root",
          build,
          "--font-path",
          "recipe/fonts",
          "--ignore-system-fonts",
          "--ignore-embedded-fonts",
          "--deps",
          "deps.json",
          "--deps-format",
          "json",
          "--creation-timestamp",
          "0",
        ],
        undefined,
        build,
      );
      timings.typst = performance.now() - typst;
      const deps = JSON.parse(await Deno.readTextFile(build + "/deps.json"));
      if (!Array.isArray(deps.inputs) || !Array.isArray(deps.outputs)) {
        fail("invalid compiler dependencies");
      }
      dependencies = deps.inputs.map((input: unknown) => {
        if (typeof input !== "string") return fail("invalid compiler input");
        const name = relative(build, resolve(build, input)).split(sep).join(
          "/",
        );
        if (!safeRelative(name)) fail("compiler dependency escaped staging");
        // Every compiler input must belong to the explicit, hashed closure or generated source.
        if (!knownDependency(name)) fail("unknown compiler dependency " + name);
        return name;
      }).sort();
      if (
        !dependencies.includes("handout.typ") ||
        new Set(dependencies).size !== dependencies.length
      ) fail("incomplete compiler dependency evidence");
      const pdf = await Deno.readFile(build + "/handout.pdf");
      if (new TextDecoder().decode(pdf.slice(0, 5)) !== "%PDF-") {
        fail("missing valid PDF output");
      }
      await write(candidate + "/handout.pdf", pdf);
      await write(candidate + "/public.json", encode(publicJson));
      await copyIndex(build, candidate, resourceIndex);
    }
    if (canReuse) timings.staging = performance.now() - staging;
    const verification = performance.now();
    const outputs = await files(candidate);
    if (json(outputs.map((f) => f.path).sort()) !== json(expected)) {
      fail("unexpected target output set");
    }
    const receipt = {
      owner: "course-print",
      recipe,
      target: work,
      reusable,
      fingerprint,
      dependencies,
      outputs,
    };
    await Deno.writeTextFile(candidate + "/" + marker, json(receipt) + "\n");
    // A whole-directory swap; rollback preserves the previous success if promotion fails.
    await owned(destination, work);
    const exists = !!await info(destination);
    if (exists) await Deno.rename(destination, stage + "/old");
    try {
      await Deno.rename(candidate, destination);
    } catch (e) {
      if (exists) {
        try {
          await Deno.rename(stage + "/old", destination);
        } catch (rollback) {
          preserveRecovery = true;
          throw new AggregateError(
            [e, rollback],
            "ADAPTER: promotion and rollback failed; recover previous target from " +
              stage + "/old",
          );
        }
      }
      throw e;
    }
    timings.verifyAndPromote = performance.now() - verification;
    timings.total = performance.now() - started + validationMs;
    return { status, reusable, fingerprint, engineCalls, timings };
  } finally {
    try {
      if (stage && !preserveRecovery) {
        await Deno.remove(stage, { recursive: true });
      }
    } finally {
      handle.close();
      await Deno.remove(lock);
    }
  }
}
