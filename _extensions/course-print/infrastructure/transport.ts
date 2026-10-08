import { diagnostic, type DiagnosticContext } from "./diagnostics.ts";
// Public native Body transport.
export const productionSchema = "course-body-package-v1";
export interface PublicBodyPackage {
  schema: typeof productionSchema;
  owner: string;
  release: string;
  apiVersion: number[];
  questions: {
    owner: string;
    id: string;
    key: string;
    source: string;
    visibility: "public";
    statementVisibility: "open" | "restricted";
    purpose?: "demonstration" | "discussion" | "independent-study" | "control";
    hasPublicSolution: boolean;
    answerType:
      | "manual"
      | "single-choice"
      | "numeric"
      | "multipart"
      | "matching";
    condition: unknown[];
    publicAnswer: unknown[];
  }[];
  works: {
    owner: string;
    id: string;
    key: string;
    source: string;
    kind: "lab" | "seminar" | "practical" | "test";
    title: string;
    theoryTime?: number;
    items: string[];
    assignments: Record<
      string,
      {
        stage?: "demonstration" | "classroom" | "homework";
        requirement: "required" | "optional";
        workMode: "individual" | "pair" | "group";
      }
    >;
  }[];
  resources: {
    owner: string;
    source: string;
    effectiveBase: string;
    target: string;
    sha256: string;
    data: string;
    visibility: "public";
  }[];
}
export type BodyPackage = PublicBodyPackage;
export type PrintResource = BodyPackage["resources"][number];
export function fail(
  detail: string,
  context: DiagnosticContext = {},
  cause?: unknown,
): never {
  throw diagnostic("ADAPTER", detail, {
    hint: "Исправьте публичный пакет Body и повторите экспорт.",
    ...context,
  }, cause);
}
function context(
  value: unknown,
  field: string,
  hint?: string,
): DiagnosticContext {
  return {
    source: record(value) && typeof value.source === "string"
      ? value.source
      : undefined,
    id: record(value) && typeof value.id === "string"
      ? value.id
      : record(value) && typeof value.target === "string"
      ? value.target
      : undefined,
    field,
    ...(hint ? { hint } : {}),
  };
}
export const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !array(v);
const array = (v: unknown): v is unknown[] => Array.isArray(v);
const fields = (v: unknown, names: string[]): v is Record<string, unknown> =>
  record(v) &&
  Object.keys(v).length === names.length &&
  Object.keys(v).every((key) => names.includes(key));
const source = (v: unknown) =>
  typeof v === "string" && v.length > 0 &&
  !/[\\\x00]/.test(v) && !v.startsWith("/") &&
  !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(v) &&
  !v.split("/").some((part) => part === "" || part === "." || part === "..");
function validateProduction(
  p: Record<string, unknown> & {
    apiVersion: unknown[];
    questions: unknown[];
    works: unknown[];
    resources: unknown[];
  },
) {
  if (
    !fields(p, [
      "schema",
      "owner",
      "release",
      "apiVersion",
      "questions",
      "works",
      "resources",
    ]) ||
    typeof p.owner !== "string" || !/^[a-z][a-z0-9-]*$/.test(p.owner) ||
    typeof p.release !== "string" || !p.release.trim() ||
    !p.apiVersion.length ||
    p.apiVersion.some((n: unknown) =>
      typeof n !== "number" || !Number.isInteger(n) || n < 0
    )
  ) {
    fail("Некорректные поля или идентификатор публичного пакета.", {
      field: "schema/owner/release/apiVersion/questions/works/resources",
    });
  }
  for (const r of p.resources) {
    if (
      !fields(r, [
        "owner",
        "source",
        "effectiveBase",
        "target",
        "sha256",
        "data",
        "visibility",
      ]) ||
      !source(r.source) ||
      !(source(r.effectiveBase) ||
        (typeof r.effectiveBase === "string" &&
          r.effectiveBase.startsWith("/") &&
          !/[\\\x00]/.test(r.effectiveBase))) ||
      typeof r.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(r.sha256)
    ) {
      fail(
        "Некорректный транспорт ресурса: нужны фактические публичные байты.",
        context(r, "owner/source/effectiveBase/target/sha256/data/visibility"),
      );
    }
  }
  for (const q of p.questions) {
    if (
      !fields(q, [
        "owner",
        "id",
        "key",
        "source",
        "visibility",
        "statementVisibility",
        "hasPublicSolution",
        ...(record(q) && Object.hasOwn(q, "purpose") ? ["purpose"] : []),
        "answerType",
        "condition",
        "publicAnswer",
      ])
    ) {
      fail(
        "Вопрос должен содержать только поля публичной проекции.",
        context(
          q,
          record(q)
            ? Object.keys(q).filter((key) =>
              ![
                "owner",
                "id",
                "key",
                "source",
                "visibility",
                "statementVisibility",
                "hasPublicSolution",
                "purpose",
                "answerType",
                "condition",
                "publicAnswer",
              ].includes(key)
            ).join(",") || "condition/publicAnswer"
            : "questions",
        ),
      );
    }
    if (
      typeof q.id !== "string" || !/^exr-[a-z0-9-]+$/.test(q.id) ||
      !source(q.source) || q.visibility !== "public" ||
      !["open", "restricted"].includes(q.statementVisibility as string) ||
      typeof q.hasPublicSolution !== "boolean" ||
      (q.purpose !== undefined &&
        !["demonstration", "discussion", "independent-study", "control"]
          .includes(q.purpose as string)) ||
      typeof q.answerType !== "string" ||
      !["manual", "single-choice", "numeric", "multipart", "matching"].includes(
        q.answerType,
      )
    ) {
      fail(
        "Некорректные поля публичного вопроса.",
        context(
          q,
          "id/source/visibility/statementVisibility/purpose/hasPublicSolution/answerType",
        ),
      );
    }
    if (!array(q.condition) || !array(q.publicAnswer)) {
      fail(
        "Отсутствует native Body вопроса.",
        context(q, "condition/publicAnswer"),
      );
    }
    validateBody(q.condition, p.resources, context(q, "condition"));
    validateBody(q.publicAnswer, p.resources, context(q, "publicAnswer"));
  }
  for (const w of p.works) {
    if (
      !fields(w, [
        "owner",
        "id",
        "key",
        "source",
        "kind",
        "title",
        "items",
        "assignments",
        ...(record(w) && Object.hasOwn(w, "theoryTime") ? ["theoryTime"] : []),
      ]) ||
      w.owner !== p.owner || typeof w.id !== "string" ||
      !/^[a-z][a-z0-9-]*$/.test(w.id) ||
      w.key !== p.owner + "/" + w.id || !source(w.source) ||
      typeof w.kind !== "string" ||
      !["lab", "seminar", "practical", "test"].includes(w.kind) ||
      typeof w.title !== "string" || !w.title.trim() ||
      (w.theoryTime !== undefined &&
        (typeof w.theoryTime !== "number" || !Number.isFinite(w.theoryTime) ||
          w.theoryTime <= 0)) ||
      !array(w.items) || !w.items.length
    ) {
      fail(
        "Некорректные поля фиксированной работы.",
        context(w, "owner/id/key/source/kind/title/items"),
      );
    }
    if (
      !record(w.assignments) ||
      Object.keys(w.assignments).length !== w.items.length ||
      Object.entries(w.assignments).some(([key, assignment]) =>
        !(w.items as unknown[]).includes(key) ||
        !fields(assignment, [
          "requirement",
          "workMode",
          ...(record(assignment) && Object.hasOwn(assignment, "stage")
            ? ["stage"]
            : []),
        ]) ||
        !["required", "optional"].includes(assignment.requirement as string) ||
        !["individual", "pair", "group"].includes(
          assignment.workMode as string,
        ) ||
        (Object.hasOwn(assignment, "stage") &&
          !["demonstration", "classroom", "homework"].includes(
            assignment.stage as string,
          ))
      )
    ) {
      fail(
        "Некорректные назначения заданий работы.",
        context(w, "assignments"),
      );
    }
    for (const key of w.items) {
      const q = p.questions.find((q) => record(q) && q.key === key);
      if (!record(q)) continue; // The complete item closure is checked below.
      if (
        (w.kind === "test" || w.kind === "practical") &&
        q.statementVisibility !== "restricted"
      ) {
        fail("test и practical назначают только restricted условия.", {
          ...context(w, "statementVisibility"),
          related: [{ source: String(q.source), id: String(q.id) }],
        });
      }
      const assignment = w.assignments[key as string];
      if (
        record(assignment) && assignment.stage === "demonstration" &&
        (q.statementVisibility !== "open" || q.purpose !== "demonstration" ||
          q.hasPublicSolution !== true)
      ) {
        fail(
          "Демонстрационное назначение требует открытой демонстрации с публичным решением.",
          {
            ...context(w, "assignments.stage"),
            related: [{ source: String(q.source), id: String(q.id) }],
          },
        );
      }
    }
  }
}
function assertPackage(p: unknown): asserts p is BodyPackage {
  if (!record(p)) {
    fail("Неподдерживаемый пакет или отсутствуют обязательные поля.", {
      field: "schema/apiVersion/questions/works/resources",
    });
  }
  if (Object.hasOwn(p, "schema") && Object.hasOwn(p, "experimental")) {
    fail("Неоднозначный контракт пакета.", { field: "schema/experimental" });
  }
  const production = p.schema === productionSchema;
  if (
    !production ||
    !array(p.apiVersion) ||
    !array(p.questions) || !array(p.works) ||
    !array(p.resources)
  ) {
    fail("Неподдерживаемый пакет или отсутствуют обязательные поля.", {
      field: "schema/apiVersion/questions/works/resources",
    });
  }
  if (typeof p.owner !== "string") {
    fail("Некорректный владелец или ключ, либо вопрос повторяется.", {
      field: "owner/key/questions",
    });
  }
  if (production) {
    validateProduction({
      ...p,
      apiVersion: p.apiVersion,
      questions: p.questions,
      works: p.works,
      resources: p.resources,
    });
  }
  const keys = new Set<string>(), targets = new Set<string>();
  for (const q of p.questions) {
    if (
      !record(q) || q.owner !== p.owner || typeof q.id !== "string" ||
      typeof q.key !== "string" ||
      q.key !== p.owner + "/" + q.id || keys.has(q.key)
    ) {
      fail(
        "Некорректный владелец или ключ, либо вопрос повторяется.",
        context(q, "owner/key"),
      );
    }
    keys.add(q.key);
    if (!array(q.condition) || !array(q.publicAnswer)) {
      fail(
        "Отсутствует native Body вопроса.",
        context(q, "condition/publicAnswer"),
      );
    }
  }
  for (const r of p.resources) {
    if (
      !record(r) || r.owner !== p.owner || r.visibility !== "public" ||
      typeof r.target !== "string" ||
      typeof r.data !== "string" || typeof r.sha256 !== "string" ||
      !/^[a-zA-Z0-9._/-]+$/.test(r.target) || r.target.startsWith("/") ||
      /(^|\/)(?:\.[^/]+|_extensions|_freeze|_generated)(\/|$)/.test(r.target) ||
      /\.(?:qmd|md|rmd|ipynb|ya?ml|lua|ts|cue|r|py|sh|toml)$/i.test(r.target) ||
      r.target.split("/").some((part: string) =>
        part === "" || part === "." || part === ".."
      ) || targets.has(r.target)
    ) {
      fail(
        "Неверный владелец, видимость, путь или повторяющийся ресурс.",
        context(r, "owner/visibility/target"),
      );
    }
    targets.add(r.target);
  }
  const wk = new Set();
  for (const w of p.works) {
    if (
      !record(w) || typeof w.key !== "string" || wk.has(w.key) ||
      typeof w.title !== "string" || !array(w.items) ||
      new Set(w.items).size !== w.items.length || w.items.some((k: unknown) =>
        typeof k !== "string" || !keys.has(k)
      )
    ) {
      fail(
        "Некорректный состав фиксированной работы.",
        context(w, "key/items"),
      );
    }
    wk.add(w.key);
  }
}
export function validatePackage(p: unknown): BodyPackage {
  assertPackage(p);
  return p;
}
const allowed = new Set(
  "Str Space SoftBreak LineBreak Emph Strong Underline Strikeout Superscript Subscript SmallCaps Quoted Code Math Link Image Span Para Plain BlockQuote OrderedList BulletList DefinitionList HorizontalRule Table Figure Header Div CodeBlock AlignLeft AlignRight AlignCenter AlignDefault ColWidth ColWidthDefault Decimal DefaultStyle DefaultDelim Period OneParen TwoParens InlineMath DisplayMath SingleQuote DoubleQuote"
    .split(" "),
);
export function validateBody(
  blocks: unknown[],
  resources: readonly unknown[],
  context: DiagnosticContext = {},
) {
  const walk = (v: unknown): void => {
    if (array(v)) {
      v.forEach(walk);
      return;
    }
    if (!record(v)) return;
    if (v.t) {
      if (typeof v.t !== "string" || !allowed.has(v.t)) {
        fail("Неподдерживаемый native узел: " + v.t, {
          ...context,
          hint: "Используйте поддерживаемый публичный AST вместо этого узла.",
        });
      }
      if (["Div", "Span", "Code", "CodeBlock", "Figure"].includes(v.t)) {
        if (!array(v.c) || !array(v.c[0])) {
          fail("Некорректные native атрибуты.", context);
        }
        const a: unknown[] = v.c[0];
        if (
          typeof a[0] !== "string" || !array(a[1]) ||
          !a[1].every((s: unknown) => typeof s === "string")
        ) fail("Некорректные native атрибуты.", context);
        if (
          a[0] || a[1].some((s: unknown) =>
            [
              "correct",
              "answer-spec",
              "grading-notes",
              "solution",
              "demo-sol",
              "control",
            ].includes(String(s))
          )
        ) fail("Неподдерживаемый якорь или закрытый маркер Body.", context);
      }
      if (v.t === "Header") {
        if (!array(v.c) || !array(v.c[1])) {
          fail("Некорректный native заголовок.", context);
        }
        if (typeof v.c[1][0] !== "string") {
          fail("Некорректный native заголовок.", context);
        }
      }
      if (v.t === "Math") {
        if (!array(v.c) || typeof v.c[1] !== "string") {
          fail("Некорректная native формула.", context);
        }
        if (/\\label\s*\{|#eq-|\\ref\s*\{/.test(v.c[1])) {
          fail("Метки и ссылки формул не поддерживаются.", context);
        }
      }
      if (v.t === "Link" || v.t === "Image") {
        if (
          !array(v.c) || !array(v.c[2]) ||
          typeof v.c[2][0] !== "string"
        ) fail("Некорректный native URL.", context);
        const href: string = v.c[2][0];
        if (
          !resources.some((r) => record(r) && r.target === href) &&
          !(v.t === "Link" && /^https?:\/\//.test(href))
        ) {
          fail(
            "Ссылка не сопоставлена с публичным ресурсом, закрыта или не поддерживается: " +
              href,
            {
              ...context,
              hint:
                "Выберите сопоставленный публичный ресурс либо HTTP(S)-ссылку.",
            },
          );
        }
      }
    }
    for (const x of Object.values(v)) {
      if (array(x)) {
        for (const n of x) walk(n);
      } else if (x && typeof x === "object") {
        walk(x);
      }
    }
  };
  walk(blocks);
}
export async function verifyResources(
  p: BodyPackage,
  related?: DiagnosticContext["related"],
) {
  for (const r of p.resources) {
    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0));
    } catch (cause) {
      fail("Некорректная кодировка ресурса.", {
        ...context(r, "data", "Передайте фактические байты ресурса в Base64."),
        related,
      }, cause);
    }
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
      ),
    ).map((x) => x.toString(16).padStart(2, "0")).join("");
    if (hash !== r.sha256) {
      fail("SHA-256 ресурса не соответствует его байтам.", {
        ...context(r, "sha256", "Обновите SHA-256 по текущим байтам ресурса."),
        related,
      });
    }
  }
}
// Only native URL slots select files; ordinary prose is never a resource request.
export function resourceTargets(
  value: unknown,
  context: DiagnosticContext = {},
): Set<string> {
  const targets = new Set<string>();
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (array(node)) {
      node.forEach(walk);
      return;
    }
    if (!record(node)) return;
    if (node.t === "Link" || node.t === "Image") {
      if (
        !array(node.c) || !array(node.c[2]) ||
        typeof node.c[2][0] !== "string"
      ) fail("Некорректный native URL.", context);
      targets.add(node.c[2][0]);
    }
    for (const child of Object.values(node)) {
      if (child && typeof child === "object") walk(child);
    }
  };
  walk(value);
  return targets;
}
