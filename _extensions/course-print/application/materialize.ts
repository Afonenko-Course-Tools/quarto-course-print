import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fail,
  type PrintResource,
  resourceTargets,
} from "../infrastructure/transport.ts";
import {
  files,
  info,
  safePath,
  safeRelative,
  write,
} from "../infrastructure/files.ts";
import { compilePrint } from "./compiler.ts";
import type { PrintDocument, PrintOptions, PrintResult } from "./contracts.ts";
export type { PrintOptions, PrintResult } from "./contracts.ts";
export async function materialize(
  doc: PrintDocument,
  resources: readonly PrintResource[],
  work: string,
  out: string,
  options: PrintOptions,
  validationMs: number,
): Promise<PrintResult> {
  const started = performance.now(),
    timings: Record<string, number> = { validate: validationMs };
  const destination = await safePath(out, { id: work, field: "output" });
  const assets = await safePath(
    options.assets ?? fileURLToPath(new URL("../assets", import.meta.url)),
    { id: work, field: "assets" },
  );
  const assetIndex = await files(assets);
  await Deno.mkdir(dirname(destination), { recursive: true });
  const build = await Deno.makeTempDir({
    dir: dirname(destination),
    prefix: ".course-print-build-",
  });
  try {
    await compilePrint(
      build,
      resources,
      assets,
      assetIndex,
      JSON.stringify(doc),
      timings,
    );
    // Validate every destination before copying current selected bytes. No old output authorizes reuse.
    const oldResources: string[] = [];
    if (await info(destination + "/public.json")) {
      await safePath(destination + "/public.json");
      const old = JSON.parse(
        await Deno.readTextFile(destination + "/public.json"),
      );
      if (!Array.isArray(old.blocks)) {
        fail("Некорректный ранее записанный публичный документ.", {
          source: destination + "/public.json",
          id: work,
          field: "blocks",
        });
      }
      for (const target of resourceTargets(old.blocks)) {
        if (/^https?:\/\//.test(target)) continue;
        if (
          !safeRelative(target) ||
          /(^|\/)(?:\.[^/]+|_extensions|_freeze|_generated)(\/|$)/.test(
            target,
          ) ||
          /\.(?:qmd|md|rmd|ipynb|ya?ml|lua|ts|cue|r|py|sh|toml)$/i.test(
            target,
          ) ||
          target === "public.json" ||
          target === "handout.pdf"
        ) {
          fail("Небезопасный путь прежнего ресурса.", {
            source: destination + "/public.json",
            id: target,
            field: "blocks",
          });
        }
        await safePath(destination + "/" + target);
        oldResources.push(target);
      }
    }
    for (const r of resources) {
      if (r.target === "public.json" || r.target === "handout.pdf") {
        fail("Ресурс занимает зарезервированный путь Print.", {
          source: r.source,
          id: r.target,
          field: "target",
          hint: "Выберите путь ресурса, отличный от public.json и handout.pdf.",
        });
      }
    }
    const selected = [
      "handout.pdf",
      "public.json",
      ...resources.map((r) => r.target),
    ];
    for (const name of selected) {
      await safePath(destination + "/" + name, { id: work, field: "output" });
    }
    for (const target of oldResources) {
      if (
        !selected.includes(target) && await info(destination + "/" + target)
      ) await Deno.remove(destination + "/" + target);
    }
    for (const name of selected) {
      await write(
        destination + "/" + name,
        await Deno.readFile(build + "/" + name),
      );
    }
    timings.total = performance.now() - started + validationMs;
    return { status: "built", engineCalls: 2, timings };
  } finally {
    await Deno.remove(build, { recursive: true });
  }
}
