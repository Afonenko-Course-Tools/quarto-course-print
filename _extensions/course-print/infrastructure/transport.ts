// Public installed transport and the separate experimental fixture capability.
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
    kind: "lab" | "test" | "exam";
    title: string;
    items: string[];
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
export const fail = (detail: string): never => {
  throw Error("ADAPTER: " + detail);
};
const record = (v: any) =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const fields = (v: any, names: string[]) =>
  record(v) &&
  Object.keys(v).length === names.length &&
  Object.keys(v).every((key) => names.includes(key));
const source = (v: unknown) =>
  typeof v === "string" && v.length > 0 &&
  !/[\\\x00]/.test(v) && !v.startsWith("/") &&
  !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(v) &&
  !v.split("/").some((part) => part === "" || part === "." || part === "..");
function validateProduction(p: any) {
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
      !source(r.source) || !source(r.effectiveBase) ||
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
      !["manual", "single-choice", "numeric", "multipart", "matching"].includes(
        q.answerType,
      )
    ) {
      fail("invalid production question transport");
    }
    if (!Array.isArray(q.condition) || !Array.isArray(q.publicAnswer)) {
      fail("missing native body");
    }
    validateBody(q.condition, p);
    validateBody(q.publicAnswer, p);
  }
  for (const w of p.works) {
    if (
      !fields(w, ["owner", "id", "key", "source", "kind", "title", "items"]) ||
      w.owner !== p.owner || typeof w.id !== "string" ||
      !/^sec-[a-z0-9-]+$/.test(w.id) ||
      w.key !== p.owner + "/" + w.id || !source(w.source) ||
      !["lab", "test", "exam"].includes(w.kind) ||
      typeof w.title !== "string" || !w.title.trim() ||
      !Array.isArray(w.items) || !w.items.length
    ) {
      fail("invalid production work transport");
    }
  }
}
export function validatePackage(p: any) {
  if (!record(p)) fail("unsupported package or missing fields");
  if (Object.hasOwn(p, "schema") && Object.hasOwn(p, "experimental")) {
    fail("ambiguous package contract");
  }
  const production = p.schema === productionSchema;
  if (
    (!production &&
      (Object.hasOwn(p, "schema") || p.experimental !== "p0-native-ast-v1")) ||
    !Array.isArray(p.apiVersion) ||
    !Array.isArray(p.questions) || !Array.isArray(p.works) ||
    !Array.isArray(p.resources)
  ) fail("unsupported package or missing fields");
  if (production) validateProduction(p);
  const keys = new Set<string>(), targets = new Set<string>();
  for (const q of p.questions) {
    if (
      q.owner !== p.owner || typeof q.id !== "string" ||
      q.key !== p.owner + "/" + q.id || keys.has(q.key)
    ) fail("invalid owner/key or duplicate question");
    keys.add(q.key);
    if (!Array.isArray(q.condition) || !Array.isArray(q.publicAnswer)) {
      fail("missing native body");
    }
  }
  for (const r of p.resources) {
    if (
      r.owner !== p.owner || r.visibility !== "public" ||
      typeof r.data !== "string" || typeof r.sha256 !== "string" ||
      !/^resources\/[a-zA-Z0-9._/-]+$/.test(r.target) ||
      r.target.split("/").some((part: string) =>
        part === "" || part === "." || part === ".."
      ) || targets.has(r.target)
    ) fail("resource owner, visibility, path or collision");
    targets.add(r.target);
  }
  const wk = new Set();
  for (const w of p.works) {
    if (
      typeof w.key !== "string" || wk.has(w.key) ||
      typeof w.title !== "string" || !Array.isArray(w.items) ||
      new Set(w.items).size !== w.items.length || w.items.some((k: string) =>
        !keys.has(k)
      )
    ) fail("invalid fixed work");
    wk.add(w.key);
  }
  return p;
}
const allowed = new Set(
  "Str Space SoftBreak LineBreak Emph Strong Underline Strikeout Superscript Subscript SmallCaps Quoted Code Math Link Image Span Para Plain BlockQuote OrderedList BulletList DefinitionList HorizontalRule Table Figure Header Div CodeBlock AlignLeft AlignRight AlignCenter AlignDefault ColWidth ColWidthDefault Decimal DefaultStyle DefaultDelim Period OneParen TwoParens InlineMath DisplayMath SingleQuote DoubleQuote"
    .split(" "),
);
export function validateBody(blocks: any[], p: any) {
  const walk = (v: any) => {
    if (!v || typeof v !== "object") return;
    if (v.t) {
      if (!allowed.has(v.t)) fail("unsupported native node " + v.t);
      if (["Div", "Span", "Code", "CodeBlock", "Figure"].includes(v.t)) {
        const a = v.c[0];
        if (
          a[0] || a[1].some((s: string) =>
            [
              "correct",
              "answer-spec",
              "grading-notes",
              "solution",
              "demo-sol",
              "control",
            ].includes(s)
          )
        ) fail("unsupported anchor or closed body marker");
      }
      if (v.t === "Header" && v.c[1][0]) fail("anchored header unsupported");
      if (v.t === "Math" && /\\label\s*\{|#eq-|\\ref\s*\{/.test(v.c[1])) {
        fail("equation labels/references unsupported");
      }
      if (v.t === "Link" || v.t === "Image") {
        const href = v.c[2][0];
        if (
          !p.resources.some((r: any) => r.target === href) &&
          !(v.t === "Link" && /^https?:\/\//.test(href))
        ) fail("unmapped, closed or unsupported link " + href);
      }
    }
    for (const x of Object.values(v)) {
      if (Array.isArray(x)) {
        for (const n of x) walk(n);
      } else if (x && typeof x === "object") {
        walk(x);
      }
    }
  };
  walk(blocks);
}
export async function verifyResources(p: any) {
  for (const r of p.resources) {
    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0));
    } catch {
      fail("bad resource encoding");
    }
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new Uint8Array(bytes!)),
      ),
    ).map((x) => x.toString(16).padStart(2, "0")).join("");
    if (hash !== r.sha256) fail("resource hash mismatch");
  }
}
export async function command(
  cmd: string,
  args: string[],
  input?: string,
  cwd?: string,
) {
  const p = new Deno.Command(cmd, {
    args,
    cwd,
    stdin: input === undefined ? "null" : "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  if (input !== undefined) {
    const w = p.stdin.getWriter();
    await w.write(new TextEncoder().encode(input));
    await w.close();
  }
  const out = await p.output();
  if (!out.success) {
    fail(
      new TextDecoder().decode(out.stderr) +
        new TextDecoder().decode(out.stdout),
    );
  }
  return new TextDecoder().decode(out.stdout);
}

// Only native URL slots select files; ordinary prose is never a resource request.
export function resourceTargets(value: unknown): Set<string> {
  const targets = new Set<string>();
  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node.t === "Link" || node.t === "Image") targets.add(node.c[2][0]);
    for (const child of Object.values(node)) {
      if (child && typeof child === "object") walk(child);
    }
  };
  walk(value);
  return targets;
}
