import {
  preparePrint,
  renderPrint,
} from "../_extensions/course-print/application/export.ts";
import { validatePackage } from "../_extensions/course-print/infrastructure/transport.ts";

const assert = (value: unknown, message: string) => {
  if (!value) throw Error(message);
};
const para = (text: string) => ({ t: "Para", c: [{ t: "Str", c: text }] });
const sample = () => ({
  schema: "course-body-package-v1",
  owner: "course-a",
  release: "owner-attempt-one",
  apiVersion: [1, 23, 1],
  questions: [{
    owner: "course-a",
    id: "exr-manual",
    key: "course-a/exr-manual",
    source: "tasks/corpus.qmd",
    visibility: "public",
    statementVisibility: "restricted",
    hasPublicSolution: false,
    answerType: "manual",
    condition: [para("Production native condition")],
    publicAnswer: [para("Response: ____________________")],
  }],
  works: [{
    owner: "course-a",
    id: "sec-work-one",
    key: "course-a/sec-work-one",
    source: "tasks/work-one.qmd",
    kind: "lab",
    title: "Production work one",
    items: ["course-a/exr-manual"],
    assignments: {
      "course-a/exr-manual": {
        requirement: "required",
        workMode: "individual",
      },
    },
  }, {
    owner: "course-a",
    id: "sec-work-two",
    key: "course-a/sec-work-two",
    source: "tasks/work-two.qmd",
    kind: "test",
    title: "Production work two",
    items: ["course-a/exr-manual"],
    assignments: {
      "course-a/exr-manual": {
        requirement: "required",
        workMode: "individual",
      },
    },
  }],
  resources: [] as any[],
});
function rejects(action: () => unknown, text: string) {
  try {
    action();
  } catch (error) {
    assert(String(error).includes(text), `Unexpected error: ${error}`);
    return;
  }
  throw Error("Expected refusal: " + text);
}

Deno.test("production public schema prints fixed shared canonical question without experimental flag", () => {
  const p = sample();
  for (const work of p.works) {
    const doc = preparePrint(p, work.key, {});
    const text = JSON.stringify(doc);
    assert(
      text.includes(work.title) && text.includes("Production native condition"),
      "Fixed public work lost native body",
    );
    assert(
      text.includes("Response") && !text.includes("closedKey"),
      "Private data reached Print document",
    );
  }
});

Deno.test("production schema rejects private question fields even outside selected work", () => {
  for (const field of ["closedKey", "solution", "gradingNotes", "checked"]) {
    const p: any = sample();
    p.questions.push({
      ...p.questions[0],
      id: "exr-unselected",
      key: "course-a/exr-unselected",
      [field]: field === "checked" ? true : "TEACHER_SECRET",
    });
    rejects(
      () => preparePrint(p, p.works[0].key, {}),
      "поля публичной проекции",
    );
  }
});

Deno.test("production schema rejects ambiguous/unknown contracts and opaque proof flags", () => {
  for (
    const change of [
      { schema: "unknown-body-v1" },
      { experimental: "p0-native-ast-v1" },
      { checked: true },
      { receipt: { checked: true } },
    ]
  ) {
    const p: any = { ...sample(), ...change };
    rejects(() => validatePackage(p), "ADAPTER");
  }
});

Deno.test("production public schema requires current transport identity and fixed work fields", () => {
  const invalid: [string, (p: any) => void][] = [
    ["поля или идентификатор публичного пакета", (p) => {
      p.owner = "";
    }],
    ["поля или идентификатор публичного пакета", (p) => {
      p.release = 4;
    }],
    ["поля или идентификатор публичного пакета", (p) => {
      p.apiVersion = [1, "23"];
    }],
    ["поля или идентификатор публичного пакета", (p) => {
      p.apiVersion = [];
    }],
    ["поля публичного вопроса", (p) => {
      p.questions[0].source = { closedKey: "secret" };
    }],
    ["поля публичного вопроса", (p) => {
      p.questions[0].visibility = "closed";
    }],
    ["поля публичного вопроса", (p) => {
      p.questions[0].answerType = "automatic";
    }],
    ["поля фиксированной работы", (p) => {
      p.works[0].owner = "another";
    }],
    ["поля фиксированной работы", (p) => {
      p.works[0].kind = "generated";
    }],
    ["поля фиксированной работы", (p) => {
      p.works[0].items = [];
    }],
    ["поля фиксированной работы", (p) => {
      p.works[0].source = ["tasks/work-one.qmd"];
    }],
  ];
  for (const [text, change] of invalid) {
    const p = sample();
    change(p);
    rejects(() => preparePrint(p, p.works[0].key, {}), text);
  }
});

Deno.test("production provenance rejects complete URI schemes in every source/base field", () => {
  for (
    const prefix of ["file+data:", "h2:", "custom.scheme:", "custom-scheme:"]
  ) {
    for (
      const field of [
        "question.source",
        "work.source",
        "resource.source",
        "resource.effectiveBase",
      ]
    ) {
      const p: any = sample();
      p.resources.push({
        owner: "course-a",
        source: "assets/data.txt",
        effectiveBase: "tasks/corpus.qmd",
        target: "resources/course-a/data.txt",
        sha256:
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        data: "",
        visibility: "public",
      });
      validatePackage(p);
      const [kind, name] = field.split(".");
      const object = kind === "question"
        ? p.questions[0]
        : kind === "work"
        ? p.works[0]
        : p.resources[0];
      object[name] = prefix + "tasks/corpus.qmd";
      rejects(() => validatePackage(p), "ADAPTER");
    }
  }
});

Deno.test("production transport retains existing closed-marker/native-node and resource guards", () => {
  for (
    const node of [
      { t: "Span", c: [["", ["correct"], []], [{ t: "Str", c: "secret" }]] },
      { t: "Cite", c: [[], [{ t: "Str", c: "unresolved" }]] },
      { t: "RawBlock", c: ["html", "<script>secret</script>"] },
      {
        t: "Link",
        c: [["", [], []], [{ t: "Str", c: "closed" }], ["#sol-hidden", ""]],
      },
    ]
  ) {
    const p: any = sample();
    p.questions.push({
      ...p.questions[0],
      id: "exr-unselected",
      key: "course-a/exr-unselected",
      condition: [node],
    });
    rejects(() => preparePrint(p, p.works[0].key, {}), "ADAPTER");
  }
  for (
    const resource of [
      {
        owner: "course-a",
        source: "assets/data.txt",
        effectiveBase: "tasks/corpus.qmd",
        target: "resources/course-a/data.txt",
        sha256: "a".repeat(64),
        visibility: "public",
        checked: true,
      },
      {
        owner: "course-a",
        source: "assets/data.txt",
        effectiveBase: ".",
        target: "resources/course-a/data.txt",
        sha256: "a".repeat(64),
        data: "",
        visibility: "public",
      },
      {
        owner: "course-a",
        source: "assets/data.txt",
        effectiveBase: "tasks/corpus.qmd",
        target: "resources/course-a/../data.txt",
        sha256: "a".repeat(64),
        data: "",
        visibility: "public",
      },
      {
        owner: "course-a",
        source: "assets/data.txt",
        effectiveBase: "tasks/corpus.qmd",
        target: "resources/course-a/data.txt",
        sha256: "a".repeat(64),
        data: "",
        visibility: "closed",
      },
    ]
  ) {
    const p = sample();
    p.resources.push(resource);
    rejects(() => preparePrint(p, p.works[0].key, {}), "ADAPTER");
  }
});

Deno.test("production malformed resource refuses before native body resource lookup", () => {
  const p: any = sample();
  p.resources.push(null);
  p.questions[0].condition = [{
    t: "Para",
    c: [{
      t: "Link",
      c: [["", [], []], [{ t: "Str", c: "file" }], [
        "resources/course-a/data.txt",
        "",
      ]],
    }],
  }];
  rejects(() => preparePrint(p, p.works[0].key, {}), "ADAPTER");
});

Deno.test("production public package renders native PDF and exact current resources with freshness guard", async () => {
  const p: any = sample();
  p.resources = [{
    owner: "course-a",
    source: "assets/data.txt",
    effectiveBase: "tasks/corpus.qmd",
    target: "resources/course-a/data.txt",
    sha256: "780884633d1f0d1cbe4028352b53822916834f3005877a6af0cefe7c20bf2116",
    data: "cHVibGljIGRhdGEgJiA8ID4ge3tsaXRlcmFsfX0K",
    visibility: "public",
  }, {
    owner: "course-a",
    source: "assets/dot.png",
    effectiveBase: "tasks/corpus.qmd",
    target: "resources/course-a/dot.png",
    sha256: "b6a99386130538b6676338acf4da682f17853fb992b7e1ffd3445b7ae59e3d8c",
    data:
      "iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAE0lEQVR4nGOwaJhPEDGMKhqMigAhtcDx4hYylgAAAABJRU5ErkJggg==",
    visibility: "public",
  }];
  p.questions[0].condition.push({
    t: "Para",
    c: [
      {
        t: "Link",
        c: [["", [], []], [{ t: "Str", c: "Public attachment" }], [
          "resources/course-a/data.txt",
          "",
        ]],
      },
      { t: "Space" },
      {
        t: "Image",
        c: [["", [], []], [{ t: "Str", c: "Public image" }], [
          "resources/course-a/dot.png",
          "",
        ]],
      },
    ],
  });
  const root = await Deno.makeTempDir(), out = root + "/output";
  async function refusal(options: any, expected: string) {
    try {
      await renderPrint(p, p.works[0].key, out, {}, options);
    } catch (error) {
      assert(String(error).includes(expected), String(error));
      return;
    }
    throw Error("Expected refusal: " + expected);
  }
  try {
    const result = await renderPrint(p, p.works[0].key, out, {
      group: "Production",
    }, {});
    assert(
      result.status === "built" && result.engineCalls === 2,
      "Production transport failed native PDF materialization",
    );
    const pdf = await Deno.readFile(out + "/handout.pdf");
    assert(
      new TextDecoder().decode(pdf.slice(0, 5)) === "%PDF-",
      "Invalid native PDF",
    );
    const text = await new Deno.Command("pdftotext", {
      args: [out + "/handout.pdf", "-"],
      stdout: "piped",
    }).output();
    assert(
      text.success &&
        new TextDecoder().decode(text.stdout).includes(
          "Production native condition",
        ),
      "PDF lost condition",
    );
    for (const resource of p.resources) {
      const bytes = await Deno.readFile(out + "/" + resource.target);
      assert(
        btoa(String.fromCharCode(...bytes)) === resource.data,
        "Current mapped resource bytes differ",
      );
    }
    const capture = Deno.env.get("PRINT_PUBLIC_PACKAGE");
    if (capture) {
      await Deno.writeTextFile(capture, JSON.stringify(p, null, 2) + "\n");
    }
    p.resources[0].data = btoa("changed without a refreshed hash");
    await refusal({}, "SHA-256 ресурса");
    const current = await Deno.readFile(out + "/handout.pdf");
    assert(
      current.length === pdf.length &&
        current.every((byte, index) => byte === pdf[index]),
      "Invalid resource replaced current PDF",
    );
    assert(
      await Deno.readTextFile(out + "/resources/course-a/data.txt") ===
        "public data & < > {{literal}}\n",
      "Invalid resource replaced current bytes",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("unknown legacy transport refuses malformed records and native URL slots with adapter errors", () => {
  const legacy = () => {
    const { schema: _schema, ...p } = sample();
    return { ...p, experimental: "p0-native-ast-v1" };
  };
  for (const field of ["questions", "works", "resources"] as const) {
    const p = legacy();
    const malformed: unknown = { ...p, [field]: [null] };
    rejects(() => preparePrint(malformed, p.works[0].key, {}), "ADAPTER");
  }
  for (
    const node of [
      { t: "Link", c: [] },
      { t: "Image", c: [[], [], [null]] },
      { t: "Span", c: [null, []] },
    ]
  ) {
    const p = legacy();
    const malformed: unknown = {
      ...p,
      questions: [{ ...p.questions[0], condition: [node] }],
    };
    rejects(() => preparePrint(malformed, p.works[0].key, {}), "ADAPTER");
  }
});

Deno.test("qualified assignments print optional labels for all current work kinds", () => {
  for (const kind of ["lab", "seminar", "practical", "test"]) {
    const p: any = sample();
    p.works[0].kind = kind;
    p.works[0].assignments["course-a/exr-manual"].requirement = "optional";
    assert(
      JSON.stringify(preparePrint(p, p.works[0].key, {})).includes(
        "Необязательное",
      ),
      "optional assignment lost",
    );
  }
});
Deno.test("assignments require exact qualified member keys and closed enum fields", () => {
  for (
    const assignments of [
      undefined,
      {},
      [],
      null,
      { "exr-manual": { requirement: "required", workMode: "individual" } },
      {
        "course-a/exr-manual": {
          requirement: "required",
          workMode: "individual",
        },
        "course-a/exr-other": {
          requirement: "required",
          workMode: "individual",
        },
      },
      ...[
        { requirement: "recommended", workMode: "individual" },
        { requirement: "required", workMode: "team" },
        { requirement: "required", workMode: "individual", stage: "review" },
        { requirement: "required", workMode: "individual", extra: true },
        { requirement: "required" },
      ].map((a) => ({ "course-a/exr-manual": a })),
    ]
  ) {
    const p: any = sample();
    p.works[0].assignments = assignments;
    rejects(() => preparePrint(p, p.works[0].key, {}), "ADAPTER");
  }
  for (const kind of ["exam", "handout"]) {
    const p: any = sample();
    p.works[0].kind = kind;
    rejects(() => preparePrint(p, p.works[0].key, {}), "ADAPTER");
  }
  const p: any = sample();
  p.works[0].requirements = { "exr-manual": "optional" };
  rejects(() => preparePrint(p, p.works[0].key, {}), "ADAPTER");
});
Deno.test("website statement policy is independent of participant-safe transport", () => {
  for (const statementVisibility of ["open", "restricted"]) {
    const p: any = sample();
    p.works = p.works.slice(0, 1);
    p.questions[0].statementVisibility = statementVisibility;
    preparePrint(p, p.works[0].key, {});
    for (const kind of ["test", "practical"]) {
      p.works[0].kind = kind;
      if (statementVisibility === "open") {
        rejects(() => preparePrint(p, p.works[0].key, {}), "ADAPTER");
      } else preparePrint(p, p.works[0].key, {});
    }
  }
  for (
    const change of [{ statementVisibility: "private" }, {
      hasPublicSolution: "true",
    }, { purpose: "objectives" }]
  ) {
    const p: any = sample();
    Object.assign(p.questions[0], change);
    rejects(() => preparePrint(p, p.works[0].key, {}), "ADAPTER");
  }
});
Deno.test("demonstration stage validates the participant declaration without copying solutions", () => {
  const p: any = sample();
  p.works = p.works.slice(0, 1);
  p.works[0].assignments["course-a/exr-manual"].stage = "demonstration";
  rejects(() => preparePrint(p, p.works[0].key, {}), "ADAPTER");
  Object.assign(p.questions[0], {
    statementVisibility: "open",
    purpose: "demonstration",
    hasPublicSolution: true,
  });
  preparePrint(p, p.works[0].key, {});
});
Deno.test("explicit stable work ID need not use Quarto section prefix", () => {
  const p: any = sample();
  p.works[0].id = "lab-one";
  p.works[0].key = "course-a/lab-one";
  const doc = preparePrint(p, p.works[0].key, {});
  assert(
    JSON.stringify(doc).includes(p.works[0].title),
    "native work title lost",
  );
});

Deno.test("external compiler refusal preserves foreign diagnostics before final PDF write", async () => {
  const root = await Deno.makeTempDir();
  const oldPath = Deno.env.get("PATH")!;
  try {
    await Deno.writeTextFile(
      root + "/quarto",
      '#!/bin/sh\nprintf "FOREIGN.OUT\\n"\nprintf "FOREIGN.ID detail\\n" >&2\nexit 9\n',
    );
    await Deno.chmod(root + "/quarto", 0o755);
    Deno.env.set("PATH", root + ":" + oldPath);
    const p = sample();
    try {
      await renderPrint(p, p.works[0].key, root + "/out", {}, {});
      throw Error("expected compiler refusal");
    } catch (error) {
      const e = error as Error & {
        exitCode: number;
        stdout: string;
        stderr: string;
      };
      assert(e.name === "ExternalToolFailure" && e.exitCode === 9, String(e));
      assert(
        e.stdout === "FOREIGN.OUT\n" && e.stderr === "FOREIGN.ID detail\n",
        "lost compiler streams",
      );
      assert(e.cause !== undefined, "lost compiler cause");
    }
    let missing = false;
    try {
      await Deno.stat(root + "/out/handout.pdf");
    } catch (e) {
      missing = e instanceof Deno.errors.NotFound;
    }
    assert(missing, "external refusal wrote a final PDF");
  } finally {
    Deno.env.set("PATH", oldPath);
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("own guards identify Print source question field and repair hint", () => {
  const cases: [string, (p: any) => void][] = [
    ["closedKey", (p) => {
      p.questions[0].closedKey = "PRIVATE";
    }],
    ["condition", (p) => {
      p.questions[0].condition = [{ t: "RawBlock", c: ["html", "bad"] }];
    }],
    ["condition", (p) => {
      p.questions[0].condition = [{
        t: "Link",
        c: [["", [], []], [], ["#closed", ""]],
      }];
    }],
  ];
  for (const [field, change] of cases) {
    const p: any = sample();
    change(p);
    try {
      preparePrint(p, p.works[0].key, {});
      throw Error("expected refusal");
    } catch (error) {
      const e = error as Error & { code: string };
      assert(
        e.name === "ExtensionDiagnostic" && e.code === "ADAPTER",
        String(e),
      );
      for (
        const part of [
          "Print",
          "tasks/corpus.qmd",
          "exr-manual",
          field,
          "Подсказка:",
        ]
      ) assert(e.message.includes(part), `missing ${part}: ${e.message}`);
      assert(!e.message.includes("PRIVATE"), "private value leaked");
    }
  }
});
Deno.test("resource encoding and hash refusals retain source resource field and foreign cause", async () => {
  for (const [data, field] of [["%%", "data"], ["", "sha256"]]) {
    const p: any = sample();
    p.resources = [{
      owner: p.owner,
      source: "assets/data.txt",
      effectiveBase: "tasks/corpus.qmd",
      target: "resources/course-a/data.txt",
      sha256: "a".repeat(64),
      data,
      visibility: "public",
    }];
    try {
      await renderPrint(p, p.works[0].key, "/no-output", {}, {});
      throw Error("expected refusal");
    } catch (error) {
      const e = error as Error & { code: string };
      assert(
        e.name === "ExtensionDiagnostic" && e.code === "ADAPTER",
        String(e),
      );
      for (
        const part of [
          "Print",
          "assets/data.txt",
          "resources/course-a/data.txt",
          field,
          "Подсказка:",
        ]
      ) assert(e.message.includes(part), `missing ${part}`);
      if (field === "data") {
        assert(e.cause instanceof Error, "encoding cause discarded");
      }
    }
  }
});
Deno.test("output alias refusal identifies output and preserves package before final PDF", async () => {
  const root = await Deno.makeTempDir();
  try {
    const p = sample(), before = JSON.stringify(p);
    try {
      await renderPrint(p, p.works[0].key, root + "/a/../out", {}, {});
      throw Error("expected refusal");
    } catch (error) {
      const e = error as Error & { code: string };
      assert(
        e.code === "ADAPTER" && e.message.includes("Print") &&
          e.message.includes("output") && e.message.includes(p.works[0].key),
        String(e),
      );
    }
    assert(JSON.stringify(p) === before, "mutated input");
    let missing = false;
    try {
      await Deno.stat(root + "/out/handout.pdf");
    } catch (e) {
      missing = e instanceof Deno.errors.NotFound;
    }
    assert(missing, "output alias wrote PDF");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("Print sets native Russian language metadata for generated captions", () => {
  const p = sample();
  const doc = preparePrint(p, p.works[0].key, {});
  assert(
    JSON.stringify(doc.meta.lang) ===
      JSON.stringify({ t: "MetaString", c: "ru" }),
    "native Print language is missing",
  );
});

Deno.test("rejected assignment never creates output or invokes the compiler", async () => {
  const root = await Deno.makeTempDir();
  try {
    const p: any = sample();
    p.works[0].assignments = {};
    try {
      await renderPrint(p, p.works[0].key, root + "/out", {}, {});
      throw Error("expected refusal");
    } catch (error) {
      assert(String(error).includes("assignments"), String(error));
    }
    try {
      await Deno.stat(root + "/out");
      throw Error("invalid package created output");
    } catch (error) {
      assert(error instanceof Deno.errors.NotFound, String(error));
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("native producer in-memory optional purpose may be undefined", () => {
  const p: any = sample();
  p.questions[0].purpose = undefined;
  preparePrint(p, p.works[0].key, {});
});

Deno.test("fractional theory time accepts the native optional work field and prints PDF", async () => {
  const p: any = sample();
  p.works[0].theoryTime = 7.5;
  const root = await Deno.makeTempDir();
  try {
    const result = await renderPrint(p, p.works[0].key, root + "/out", {}, {});
    assert(result.status === "built", "fractional theory package failed PDF");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
  p.works[0].theoryTime = undefined;
  preparePrint(p, p.works[0].key, {});
});
Deno.test("theory time rejects nonpositive nonfinite and nonnumber values", () => {
  for (const theoryTime of [0, -1, NaN, Infinity, -Infinity, "7.5", null]) {
    const p: any = sample();
    p.works[0].theoryTime = theoryTime;
    rejects(() => preparePrint(p, p.works[0].key, {}), "ADAPTER");
  }
});

Deno.test("transport enums reject arrays that stringify to valid values", () => {
  for (
    const mutate of [
      (p: any) => {
        p.questions[0].statementVisibility = ["restricted"];
      },
      (p: any) => {
        p.questions[0].purpose = ["discussion"];
      },
      (p: any) => {
        p.works[0].assignments["course-a/exr-manual"].requirement = [
          "required",
        ];
      },
      (p: any) => {
        p.works[0].assignments["course-a/exr-manual"].workMode = ["individual"];
      },
      (p: any) => {
        p.works[0].assignments["course-a/exr-manual"].stage = ["classroom"];
      },
    ]
  ) {
    const p: any = sample();
    p.works = p.works.slice(0, 1);
    mutate(p);
    rejects(() => preparePrint(p, p.works[0].key, {}), "ADAPTER");
  }
});

Deno.test("direct API treats undefined assignment stage as omitted", () => {
  const p: any = sample();
  const before = preparePrint(p, p.works[0].key, {});
  p.works[0].assignments["course-a/exr-manual"].stage = undefined;
  assert(
    JSON.stringify(preparePrint(p, p.works[0].key, {})) ===
      JSON.stringify(before),
    "undefined optional stage changed participant document",
  );
});
Deno.test("optional stage still refuses null and unknown enum values", () => {
  for (const stage of [null, "review", ["classroom"], { stage: "classroom" }]) {
    const p: any = sample();
    p.works[0].assignments["course-a/exr-manual"].stage = stage;
    rejects(() => preparePrint(p, p.works[0].key, {}), "ADAPTER");
  }
});
Deno.test("invalid theory time identifies its actual transport field", () => {
  const p: any = sample();
  p.works[0].theoryTime = 0;
  try {
    preparePrint(p, p.works[0].key, {});
    throw Error("expected refusal");
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes("theoryTime"),
      String(error),
    );
  }
});
