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
  }, {
    owner: "course-a",
    id: "sec-work-two",
    key: "course-a/sec-work-two",
    source: "tasks/work-two.qmd",
    kind: "test",
    title: "Production work two",
    items: ["course-a/exr-manual"],
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
      "production question fields",
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
    ["production package", (p) => {
      p.owner = "";
    }],
    ["production package", (p) => {
      p.release = 4;
    }],
    ["production package", (p) => {
      p.apiVersion = [1, "23"];
    }],
    ["production package", (p) => {
      p.apiVersion = [];
    }],
    ["production question", (p) => {
      p.questions[0].source = { closedKey: "secret" };
    }],
    ["production question", (p) => {
      p.questions[0].visibility = "closed";
    }],
    ["production question", (p) => {
      p.questions[0].answerType = "automatic";
    }],
    ["production work", (p) => {
      p.works[0].owner = "another";
    }],
    ["production work", (p) => {
      p.works[0].kind = "generated";
    }],
    ["production work", (p) => {
      p.works[0].items = [];
    }],
    ["production work", (p) => {
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
    await refusal({}, "resource hash mismatch");
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
