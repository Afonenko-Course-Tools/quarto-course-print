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
  if (!w) {
    fail("Работа не найдена в публичном пакете.", {
      id: work,
      field: "works",
      hint: "Укажите ключ существующей фиксированной работы.",
    });
  }
  const blocks: unknown[] = [
    { t: "Header", c: [1, ["", [], []], [{ t: "Str", c: w.title }]] },
    para(
      `Дата: ${header.date ?? "________________"}    Группа: ${
        header.group ?? "________________"
      }`,
    ),
    para("ФИО: ____________________________________________________"),
  ];
  for (const key of w.items) {
    const q = p.questions.find((q) => q.key === key);
    if (!q) {
      fail("Вопрос работы не найден.", {
        id: key,
        field: "items",
        related: [{ source: w.source, id: w.id }],
      });
    }
    if (q.visibility !== "public") {
      fail(
        "Закрытый вопрос не поддерживается.",
        { source: q.source, id: q.id, field: "visibility" },
      );
    }
    if (
      typeof q.answerType !== "string" ||
      !["manual", "single-choice", "numeric", "multipart", "matching"].includes(
        q.answerType,
      )
    ) {
      fail("Форма ответа не поддерживается.", {
        source: q.source,
        id: q.id,
        field: "answerType",
      });
    }
    validateBody(q.condition, p.resources, {
      source: q.source,
      id: q.id,
      field: "condition",
      related: [{ source: w.source, id: w.id }],
    });
    validateBody(q.publicAnswer, p.resources, {
      source: q.source,
      id: q.id,
      field: "publicAnswer",
      related: [{ source: w.source, id: w.id }],
    });
    blocks.push(
      {
        t: "Header",
        c: [2, ["", [], []], [{
          t: "Str",
          c: q.id +
            (w.requirements?.[q.id] === "optional" ? " (Необязательное)" : ""),
        }]],
      },
      ...structuredClone(q.condition),
      ...structuredClone(q.publicAnswer),
    );
  }
  // Per-page header anchors have no cross-question identity in a printed handout.
  const strip = (v: any): void => {
    if (!v || typeof v !== "object") return;
    if (v.t === "Header") v.c[1][0] = "";
    Object.values(v).forEach((x) => {
      if (Array.isArray(x)) x.forEach(strip);
      else strip(x);
    });
  };
  blocks.forEach(strip);
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
  await verifyResources(p, [{
    source: p.works.find((w) => w.key === work)?.source,
    id: work,
  }]);
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
