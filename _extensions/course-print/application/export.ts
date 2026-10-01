import {
  command,
  fail,
  resourceTargets,
  validateBody,
  validatePackage,
  verifyResources,
} from "../infrastructure/transport.ts";
const para = (s: string) => ({ t: "Para", c: [{ t: "Str", c: s }] });
export function preparePrint(p: any, work: string, header: any) {
  validatePackage(p);
  const w = p.works.find((w: any) => w.key === work);
  if (!w) fail("unknown work binding");
  const blocks: any[] = [
    { t: "Header", c: [1, ["", [], []], [{ t: "Str", c: w.title }]] },
    para(
      `Date: ${header.date ?? "________________"}    Group: ${
        header.group ?? "________________"
      }`,
    ),
    para("Name: ____________________________________________________"),
  ];
  for (const key of w.items) {
    const q = p.questions.find((q: any) => q.key === key);
    if (q.visibility !== "public") {
      fail(
        "closed question requires a separately authorized delivery policy; P0 public only",
      );
    }
    if (
      !["manual", "single-choice", "numeric", "multipart", "matching"].includes(
        q.answerType,
      )
    ) fail("unsupported answer form");
    validateBody(q.condition, p);
    validateBody(q.publicAnswer, p);
    blocks.push(
      { t: "Header", c: [2, ["", [], []], [{ t: "Str", c: q.id }]] },
      ...structuredClone(q.condition),
      ...structuredClone(q.publicAnswer),
    );
  }
  return { "pandoc-api-version": p.apiVersion, meta: {}, blocks };
}
export async function renderPrint(
  p: any,
  work: string,
  out: string,
  header: any,
): Promise<void> {
  const doc = preparePrint(p, work, header);
  await verifyResources(p);
  const selectedTargets = resourceTargets(doc.blocks);
  const used = p.resources.filter((r: any) => selectedTargets.has(r.target));
  const stage = await Deno.makeTempDir({ prefix: "course-print-p0-" });
  try {
    await Deno.writeTextFile(
      stage + "/_quarto.yml",
      "project:\n  type: default\nformat:\n  typst:\n    papersize: a4\n",
    );
    await Deno.writeTextFile(stage + "/public.json", JSON.stringify(doc));
    for (const r of used) {
      const target = stage + "/" + r.target;
      await Deno.mkdir(target.slice(0, target.lastIndexOf("/")), {
        recursive: true,
      });
      await Deno.writeFile(
        target,
        Uint8Array.from(atob(r.data), (c: string) => c.charCodeAt(0)),
      );
    }
    // Lua installs already validated native nodes directly. No Markdown serialization or parser.
    await Deno.writeTextFile(
      stage + "/native.lua",
      "function Pandoc(doc) return pandoc.read(io.open('public.json'):read('*a'), 'json') end\n",
    );
    await Deno.writeTextFile(
      stage + "/handout.qmd",
      "---\nfilters: [native.lua]\n---\n",
    );
    await command(
      "quarto",
      ["render", "handout.qmd", "--to", "typst"],
      undefined,
      stage,
    );
    await Deno.mkdir(out, { recursive: true });
    await Deno.copyFile(stage + "/handout.pdf", out + "/handout.pdf");
    for (const r of used) {
      const target = out + "/" + r.target;
      await Deno.mkdir(target.slice(0, target.lastIndexOf("/")), {
        recursive: true,
      });
      await Deno.copyFile(stage + "/" + r.target, target);
    }
    await Deno.writeTextFile(
      out + "/public.json",
      JSON.stringify(doc, null, 2) + "\n",
    );
  } finally {
    await Deno.remove(stage, { recursive: true });
  }
}
