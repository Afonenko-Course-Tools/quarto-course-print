import { dirname, isAbsolute, resolve } from "node:path";
import { fail } from "./transport.ts";
import type { FileDigest } from "../application/contracts.ts";
export const encode = (s: string) => new TextEncoder().encode(s);
export const json = (v: unknown) => JSON.stringify(v);
export const digest = async (b: Uint8Array) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(b))),
  ).map((x) => x.toString(16).padStart(2, "0")).join("");

export async function info(path: string) {
  try {
    return await Deno.lstat(path);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return null;
    throw e;
  }
}
export function safeRelative(path: unknown): path is string {
  return typeof path === "string" && /^[A-Za-z0-9._/-]+$/.test(path) &&
    !isAbsolute(path) &&
    !path.split("/").some((x) => !x || x === "." || x === "..");
}
export async function safePath(path: string) {
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
export async function files(root: string, prefix = ""): Promise<FileDigest[]> {
  const result: FileDigest[] = [];
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
export async function write(path: string, bytes: Uint8Array) {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeFile(path, bytes);
}
export async function matches(root: string, index: FileDigest[]) {
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
export async function copyIndex(
  source: string,
  dest: string,
  index: FileDigest[],
) {
  for (const f of index) {
    const bytes = await Deno.readFile(source + "/" + f.path);
    if (await digest(bytes) !== f.sha256) {
      fail("input changed during materialization");
    }
    await write(dest + "/" + f.path, bytes);
  }
}
