import {
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
export { type PrintOptions, type PrintResult } from "./materialize.ts";
import { materialize, type PrintOptions } from "./materialize.ts";
export async function renderPrint(
  p: any,
  work: string,
  out: string,
  header: any,
  options: PrintOptions = {},
) {
  const start = performance.now();
  const doc = preparePrint(p, work, header);
  await verifyResources(p);
  if (options.upstreamCurrent !== true) {
    fail(
      "upstream refresh required: explicitly assert current validated package and final URLs",
    );
  }
  const selected = resourceTargets(doc.blocks);
  const used = p.resources.filter((r: any) => selected.has(r.target));
  return await materialize(
    doc,
    used,
    work,
    out,
    options,
    performance.now() - start,
  );
}
