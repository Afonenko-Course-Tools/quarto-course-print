import {
  preparePrint,
  renderPrint,
} from "../_extensions/course-print/application/export.ts";
const assert = (x: unknown, m = "assertion failed") => {
  if (!x) throw Error(m);
};
const sample = () => {
  const path = Deno.env.get("BODY_PACKAGE");
  if (!path) {
    throw Error(
      "BODY_PACKAGE required: run CORE=/path/to/current/core bash tools/check.sh",
    );
  }
  return JSON.parse(Deno.readTextFileSync(path));
};
Deno.test("public native document embeds header and fields, excludes all teacher content including demo", () => {
  const p = sample();
  const doc = preparePrint(p, p.works[0].key, {
    date: "2026-10-01",
    group: "A",
  });
  const text = JSON.stringify(doc);
  for (
    const s of [
      "TEACHER_SECRET",
      "GRADING_SECRET",
      "closedKey",
      "correct",
      "demo-sol",
    ]
  ) assert(!text.includes(s), s);
  for (const s of ["Name", "Group", "Date", "TLS", "{{literal}}"]) {
    assert(text.includes(s), s);
  }
});
Deno.test("unsupported repeated equation and closed items reject before render", () => {
  for (const kind of ["equation", "closed", "collision"]) {
    const p = sample();
    if (kind === "equation") {
      p.questions[0].condition.push({
        t: "Div",
        c: [["eq-repeat", [], []], []],
      });
    }
    if (kind === "closed") p.questions[0].visibility = "closed";
    if (kind === "collision") {
      p.resources.push({ ...p.resources[0], source: "other" });
    }
    let rejected = false;
    try {
      preparePrint(p, p.works[0].key, {});
    } catch (e) {
      rejected = String(e).includes("ADAPTER");
    }
    assert(rejected, kind);
  }
});
Deno.test("isolated default Quarto Typst PDF needs no QMD source or web build", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const p = sample();
    await renderPrint(p, p.works[0].key, dir, {}, {});
    const pdf = await Deno.readFile(dir + "/handout.pdf");
    assert(new TextDecoder().decode(pdf.slice(0, 4)) === "%PDF");
    const o = await new Deno.Command("pdftotext", {
      args: [dir + "/handout.pdf", "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    const text = new TextDecoder().decode(o.stdout);
    assert(
      text.includes("TLS") && text.includes("Name") &&
        !text.includes("TEACHER_SECRET"),
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
Deno.test("print retains mapped public file targets beside the PDF", async () => {
  const p = sample(), dir = await Deno.makeTempDir();
  try {
    await renderPrint(p, p.works[0].key, dir, {}, {});
    assert(
      (await Deno.readTextFile(dir + "/" + p.resources[0].target)).includes(
        "public data",
      ),
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
Deno.test("closed links, foreign resources and source correctness markers fail closed", () => {
  for (const kind of ["link", "owner", "correct"]) {
    const p = sample();
    if (kind === "link") {
      p.questions[0].condition = [{
        t: "Para",
        c: [{
          t: "Link",
          c: [["", [], []], [{ t: "Str", c: "secret" }], ["#sol-manual", ""]],
        }],
      }];
    }
    if (kind === "owner") p.resources[0].owner = "other";
    if (kind === "correct") {
      p.questions[0].condition = [{
        t: "Para",
        c: [{
          t: "Span",
          c: [["", ["correct"], []], [{ t: "Str", c: "secret" }]],
        }],
      }];
    }
    let rejected = false;
    try {
      preparePrint(p, p.works[0].key, {});
    } catch (e) {
      rejected = String(e).includes("ADAPTER");
    }
    assert(rejected, kind);
  }
});
Deno.test("review: printed work copies exact native targets and excludes resource prefixes and prose names", async () => {
  const p = sample(), dir = await Deno.makeTempDir();
  for (
    const target of ["resources/course-a/data", "resources/course-a/prose.txt"]
  ) p.resources.push({ ...p.resources[0], target });
  p.questions[0].condition.push({
    t: "Para",
    c: [{ t: "Str", c: "resources/course-a/prose.txt" }],
  });
  try {
    await renderPrint(p, p.works[0].key, dir, {}, {});
    await Deno.stat(dir + "/" + p.resources[0].target);
    for (const name of ["data", "prose.txt"]) {
      let missing = false;
      try {
        await Deno.stat(dir + "/resources/course-a/" + name);
      } catch (e) {
        missing = e instanceof Deno.errors.NotFound;
      }
      assert(missing, name);
    }
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
Deno.test("review: print rejects aliases before creating output", async () => {
  for (
    const target of [
      "resources/course-a/./data.txt",
      "resources/course-a/a/../data.txt",
      "resources//course-a/data.txt",
    ]
  ) {
    const p = sample(), dir = await Deno.makeTempDir();
    p.resources.push({ ...p.resources[0], target });
    try {
      let rejected = false;
      try {
        await renderPrint(p, p.works[0].key, dir + "/out", {}, {});
      } catch (e) {
        rejected = String(e).includes("ADAPTER");
      }
      assert(rejected, target);
      let missing = false;
      try {
        await Deno.stat(dir + "/out");
      } catch (e) {
        missing = e instanceof Deno.errors.NotFound;
      }
      assert(missing, "output created");
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  }
});
Deno.test("installed font closure renders Cyrillic, bold, italic, code and math without system fonts", async () => {
  const p = sample(), dir = await Deno.makeTempDir();
  p.questions[0].condition = [
    { t: "Para", c: [{ t: "Str", c: "Пример кириллицы: ёж, группа, ответ." }] },
    {
      t: "Para",
      c: [{ t: "Strong", c: [{ t: "Str", c: "Полужирный текст" }] }, {
        t: "Space",
      }, { t: "Emph", c: [{ t: "Str", c: "Курсивный текст" }] }],
    },
    {
      t: "CodeBlock",
      c: [["", [], []], 'const ответ = 42;\nprint("Проверка кода")'],
    },
    {
      t: "Para",
      c: [{
        t: "Math",
        c: [
          { t: "DisplayMath" },
          "\\sum_{i=1}^{n} i^2 + \\frac{\\alpha}{2} = x^2",
        ],
      }],
    },
  ];
  try {
    await renderPrint(p, p.works[0].key, dir, {}, {});
    const output = await new Deno.Command("pdftotext", {
      args: [dir + "/handout.pdf", "-"],
      stdout: "piped",
    }).output();
    const text = new TextDecoder().decode(output.stdout);
    for (
      const part of [
        "Пример кириллицы",
        "Полужирный текст",
        "Курсивный текст",
        "Проверка кода",
      ]
    ) assert(text.includes(part), part);
    const fonts = await new Deno.Command("pdffonts", {
      args: [dir + "/handout.pdf"],
      stdout: "piped",
    }).output();
    assert(
      new TextDecoder().decode(fonts.stdout).includes("DejaVuSans-Oblique"),
      "emphasis lost italic font",
    );
    const capture = Deno.env.get("PRINT_GLYPH_PDF");
    if (capture) await Deno.copyFile(dir + "/handout.pdf", capture);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
