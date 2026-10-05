import {
  type BodyPackage,
  fail,
  type PrintResource,
  resourceTargets,
  validateBody,
  validatePackage,
  verifyResources,
} from "../infrastructure/transport.ts";
import type { PrintDocument, PrintHeader } from "./contracts.ts";
export type { PrintDocument, PrintHeader } from "./contracts.ts";
const para = (s: string) => ({ t: "Para", c: [{ t: "Str", c: s }] });
export function preparePrint(
  input: unknown,
  work: string,
  header: PrintHeader,
): PrintDocument {
  return prepareValidatedPrint(validatePackage(input), work, header);
}
function prepareValidatedPrint(
  p: BodyPackage,
  work: string,
  header: PrintHeader,
): PrintDocument {
  const w = p.works.find((w) => w.key === work);
  if (!w) fail("unknown work binding");
  const blocks: unknown[] = [
    { t: "Header", c: [1, ["", [], []], [{ t: "Str", c: w.title }]] },
    para(
      `Date: ${header.date ?? "________________"}    Group: ${
        header.group ?? "________________"
      }`,
    ),
    para("Name: ____________________________________________________"),
  ];
  for (const key of w.items) {
    const q = p.questions.find((q) => q.key === key);
    if (!q) fail("unknown question binding");
    if (q.visibility !== "public") {
      fail(
        "closed question requires a separately authorized delivery policy; P0 public only",
      );
    }
    if (
      typeof q.answerType !== "string" ||
      !["manual", "single-choice", "numeric", "multipart", "matching"].includes(
        q.answerType,
      )
    ) fail("unsupported answer form");
    validateBody(q.condition, p.resources);
    validateBody(q.publicAnswer, p.resources);
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
  input: unknown,
  work: string,
  out: string,
  header: PrintHeader,
  options: PrintOptions = {},
) {
  const start = performance.now();
  const p = validatePackage(input);
  const doc = prepareValidatedPrint(p, work, header);
  await verifyResources(p);
  if (options.upstreamCurrent !== true) {
    fail(
      "upstream refresh required: explicitly assert current validated package and final URLs",
    );
  }
  const selected = resourceTargets(doc.blocks);
  const used: PrintResource[] = p.resources.filter((r) =>
    selected.has(r.target)
  );
  return await materialize(
    doc,
    used,
    work,
    out,
    options,
    performance.now() - start,
  );
}
