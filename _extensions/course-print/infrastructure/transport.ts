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
    kind: "lab" | "test" | "exam" | "handout";
    title: string;
    items: string[];
    requirements?: Record<string, "required" | "optional">;
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
export function fail(detail: string): never {
  throw Error("ADAPTER: " + detail);
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
    fail("invalid production package fields or identity");
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
      fail("invalid production resource transport: actual bytes required");
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
        "answerType",
        "condition",
        "publicAnswer",
      ])
    ) {
      fail("invalid production question fields: public projection required");
    }
    if (
      typeof q.id !== "string" || !/^exr-[a-z0-9-]+$/.test(q.id) ||
      !source(q.source) || q.visibility !== "public" ||
      typeof q.answerType !== "string" ||
      !["manual", "single-choice", "numeric", "multipart", "matching"].includes(
        q.answerType,
      )
    ) {
      fail("invalid production question transport");
    }
    if (!array(q.condition) || !array(q.publicAnswer)) {
      fail("missing native body");
    }
    validateBody(q.condition, p.resources);
    validateBody(q.publicAnswer, p.resources);
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
        ...(record(w) && Object.hasOwn(w, "requirements")
          ? ["requirements"]
          : []),
      ]) ||
      w.owner !== p.owner || typeof w.id !== "string" ||
      !/^[a-z][a-z0-9-]*$/.test(w.id) ||
      w.key !== p.owner + "/" + w.id || !source(w.source) ||
      typeof w.kind !== "string" ||
      !["lab", "test", "exam", "handout"].includes(w.kind) ||
      typeof w.title !== "string" || !w.title.trim() ||
      !array(w.items) || !w.items.length
    ) {
      fail("invalid production work transport");
    }
    if (
      Object.hasOwn(w, "requirements") && (
        !record(w.requirements) ||
        Object.entries(w.requirements).some(([id, requirement]) =>
          !/^exr-[a-z0-9-]+$/.test(id) ||
          !(w.items as unknown[]).includes(p.owner + "/" + id) ||
          !["required", "optional"].includes(String(requirement))
        )
      )
    ) fail("invalid task requirements");
  }
}
function assertPackage(p: unknown): asserts p is BodyPackage {
  if (!record(p)) fail("unsupported package or missing fields");
  if (Object.hasOwn(p, "schema") && Object.hasOwn(p, "experimental")) {
    fail("ambiguous package contract");
  }
  const production = p.schema === productionSchema;
  if (
    !production ||
    !array(p.apiVersion) ||
    !array(p.questions) || !array(p.works) ||
    !array(p.resources)
  ) fail("unsupported package or missing fields");
  if (typeof p.owner !== "string") {
    fail("invalid owner/key or duplicate question");
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
    ) fail("invalid owner/key or duplicate question");
    keys.add(q.key);
    if (!array(q.condition) || !array(q.publicAnswer)) {
      fail("missing native body");
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
    ) fail("resource owner, visibility, path or collision");
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
    ) fail("invalid fixed work");
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
export function validateBody(blocks: unknown[], resources: readonly unknown[]) {
  const walk = (v: unknown): void => {
    if (array(v)) {
      v.forEach(walk);
      return;
    }
    if (!record(v)) return;
    if (v.t) {
      if (typeof v.t !== "string" || !allowed.has(v.t)) {
        fail("unsupported native node " + v.t);
      }
      if (["Div", "Span", "Code", "CodeBlock", "Figure"].includes(v.t)) {
        if (!array(v.c) || !array(v.c[0])) {
          fail("malformed native attributes");
        }
        const a: unknown[] = v.c[0];
        if (
          typeof a[0] !== "string" || !array(a[1]) ||
          !a[1].every((s: unknown) => typeof s === "string")
        ) fail("malformed native attributes");
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
        ) fail("unsupported anchor or closed body marker");
      }
      if (v.t === "Header") {
        if (!array(v.c) || !array(v.c[1])) {
          fail("malformed native header");
        }
        if (typeof v.c[1][0] !== "string") fail("malformed native header");
      }
      if (v.t === "Math") {
        if (!array(v.c) || typeof v.c[1] !== "string") {
          fail("malformed native math");
        }
        if (/\\label\s*\{|#eq-|\\ref\s*\{/.test(v.c[1])) {
          fail("equation labels/references unsupported");
        }
      }
      if (v.t === "Link" || v.t === "Image") {
        if (
          !array(v.c) || !array(v.c[2]) ||
          typeof v.c[2][0] !== "string"
        ) fail("malformed native URL");
        const href: string = v.c[2][0];
        if (
          !resources.some((r) => record(r) && r.target === href) &&
          !(v.t === "Link" && /^https?:\/\//.test(href))
        ) fail("unmapped, closed or unsupported link " + href);
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
export async function verifyResources(p: BodyPackage) {
  for (const r of p.resources) {
    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0));
    } catch {
      fail("bad resource encoding");
    }
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
      ),
    ).map((x) => x.toString(16).padStart(2, "0")).join("");
    if (hash !== r.sha256) fail("resource hash mismatch");
  }
}
// Only native URL slots select files; ordinary prose is never a resource request.
export function resourceTargets(value: unknown): Set<string> {
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
      ) fail("malformed native URL");
      targets.add(node.c[2][0]);
    }
    for (const child of Object.values(node)) {
      if (child && typeof child === "object") walk(child);
    }
  };
  walk(value);
  return targets;
}
