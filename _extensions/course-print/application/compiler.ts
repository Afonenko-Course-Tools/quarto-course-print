import { command } from "../infrastructure/process.ts";
import { fail, type PrintResource } from "../infrastructure/transport.ts";
import { copyIndex, encode, write } from "../infrastructure/files.ts";
import type { FileDigest } from "./contracts.ts";

export async function compilePrint(
  build: string,
  resources: readonly PrintResource[],
  assets: string,
  assetIndex: FileDigest[],
  publicJson: string,
  timings: Record<string, number>,
): Promise<void> {
  const staging = performance.now();
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
      "--creation-timestamp",
      "0",
    ],
    undefined,
    build,
  );
  timings.typst = performance.now() - typst;
  const pdf = await Deno.readFile(build + "/handout.pdf");
  if (new TextDecoder().decode(pdf.slice(0, 5)) !== "%PDF-") {
    fail("Компилятор не создал корректный PDF.", {
      field: "handout.pdf",
      hint: "Проверьте результат native компиляции.",
    });
  }
}
