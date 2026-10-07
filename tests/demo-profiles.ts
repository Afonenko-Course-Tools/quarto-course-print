import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [name, root, evidence, mode] = Deno.args;
const bank = join(root, "bank"), failures: string[] = [];
await Deno.mkdir(evidence, { recursive: true });
async function native(args: string[], label: string) {
  const result = await new Deno.Command("quarto", {
    args,
    cwd: bank,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const stdout = new TextDecoder().decode(result.stdout),
    stderr = new TextDecoder().decode(result.stderr);
  await Deno.writeTextFile(join(evidence, label + ".log"), stdout + stderr);
  if (!result.success) {
    throw Error(`native ${label} failed\n${stdout}${stderr}`);
  }
  return stdout;
}
const inspect = (text: string) => JSON.parse(text).config;
const condition = name === "print"
  ? "Объясните, почему публичные стартовые материалы не содержат эталонных решений."
  : "Объясните, почему публичный комплект студента не содержит эталонные решения.";
const forbidden = [
  "control.html",
  "variant-a.html",
  "variant-b.html",
  "Объясните границу доступа",
  condition,
  "Оцените полноту объяснения",
  name === "print"
    ? "Эталонное объяснение"
    : "Математическая модель сама по себе не обеспечивает",
];
const stages = [];
for (const [i, profile] of ["student", "full", "student"].entries()) {
  const config = inspect(
    await native(
      ["inspect", "--profile", profile],
      `${i + 1}-${profile}-inspect`,
    ),
  );
  await native(
    ["render", "--profile", profile, "--fail-if-warnings"],
    `${i + 1}-${profile}-render`,
  );
  const chapters = config.book.chapters;
  const actualOutput = resolve(bank, config.project["output-dir"] ?? "_book");
  const expectedChapters = profile === "student"
    ? ["index.qmd", "corpus.qmd"]
    : [
      "index.qmd",
      "corpus.qmd",
      "control.qmd",
      "variant-a.qmd",
      "variant-b.qmd",
    ];
  if (JSON.stringify(chapters) !== JSON.stringify(expectedChapters)) {
    failures.push(
      `${profile}: native chapters ${JSON.stringify(chapters)} instead of ${
        JSON.stringify(expectedChapters)
      }`,
    );
  }
  const expectedOutput = resolve(bank, `_book/${profile}`);
  if (actualOutput !== expectedOutput) {
    failures.push(
      `${profile}: native output ${actualOutput} instead of ${expectedOutput}`,
    );
  }
  const existing = [];
  for (
    const file of [
      "index.html",
      "corpus.html",
      "control.html",
      "variant-a.html",
      "variant-b.html",
    ]
  ) {
    try {
      await Deno.stat(join(actualOutput, file));
      existing.push(file);
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
    }
  }
  if (profile === "student") {
    for (const file of existing) {
      if (["control.html", "variant-a.html", "variant-b.html"].includes(file)) {
        failures.push(
          `${profile}: full-only HTML remains in student output ${file}`,
        );
      }
    }
    for (const file of ["index.html", "corpus.html", "search.json"]) {
      const text = await Deno.readTextFile(join(actualOutput, file));
      for (const phrase of forbidden) {
        if (text.includes(phrase)) {
          failures.push(`${profile}: ${file} exposes ${phrase}`);
        }
      }
    }
  } else {
    if (existing.length !== 5) {
      failures.push(`full: expected five authored HTML pages, got ${existing}`);
    }
    const control = await Deno.readTextFile(join(actualOutput, "control.html"));
    if (!control.includes("Объясните границу доступа")) {
      failures.push("full: control condition missing");
    }
  }
  stages.push({ profile, chapters, actualOutput, expectedOutput, existing });
}
const exports: unknown[] = [];
if (mode === "--render-group") {
  // The normal gate builds once after the last student render. The authored build
  // itself captures selected full ROOT Body; do not repeat those expensive exports.
  const result = await new Deno.Command("quarto", {
    args: ["run", "build.ts"],
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const stdout = new TextDecoder().decode(result.stdout),
    stderr = new TextDecoder().decode(result.stderr);
  await Deno.writeTextFile(
    join(evidence, "selected-root-build.log"),
    stdout + stderr,
  );
  if (!result.success) {
    throw Error(`authored group build failed\n${stdout}${stderr}`);
  }
  await Deno.stdout.write(result.stdout);
  await Deno.stderr.write(result.stderr);
  const prose = (value: any): string => {
    if (Array.isArray(value)) return value.map(prose).join("");
    if (!value || typeof value !== "object") return "";
    if (value.t === "Str") return value.c;
    if (["Space", "SoftBreak", "LineBreak"].includes(value.t)) return " ";
    return Object.values(value).map(prose).join("");
  };
  for (const variant of ["a", "b"]) {
    if (name === "print") {
      const doc = JSON.parse(
        await Deno.readTextFile(
          join(root, `artifacts/variant-${variant}/public.json`),
        ),
      );
      const text = prose(doc);
      if (!text.includes("exr-control") || !text.includes(condition)) {
        failures.push(
          `selected ROOT build ${variant}: public control condition missing`,
        );
      }
    } else {
      const xml = await Deno.readTextFile(
        join(root, `artifacts/variant-${variant}.xml`),
      );
      if (
        !xml.includes("demo-moodle/exr-control") ||
        !xml.replace(/\s+/g, " ").includes(condition)
      ) {
        failures.push(
          `selected ROOT build ${variant}: public control condition missing`,
        );
      }
      const correctAnswer =
        xml.split('<answer fraction="100"')[1]?.split("</answer>")[0] ?? "";
      if (
        variant === "b" &&
        (!correctAnswer.includes("TLS") || correctAnswer.includes("HTTP") ||
          correctAnswer.includes("FTP"))
      ) {
        failures.push("selected ROOT build b: teacher answer key missing");
      }
    }
    exports.push({
      variant,
      authoredBuildAfterStudent: true,
      publicControlCondition: true,
      teacherKeyUsed: name === "moodle" && variant === "b",
    });
  }
} else {
  const core = join(bank, "_extensions/Afonenko-Course-Tools/course-core");
  const { collectExport } = await import(
    pathToFileURL(join(core, "body-export/collect.ts")).href
  );
  const { buildBodies } = await import(
    pathToFileURL(join(core, "body-export/producer.ts")).href
  );
  for (const variant of ["a", "b"]) {
    const selected = await collectExport(root, {
      book: "bank",
      work: `sec-variant-${variant}`,
    });
    const bodies = await buildBodies(selected.result, {
      projectRoot: selected.projectRoot,
      courseId: selected.courseId,
      work: selected.work,
      includeClosed: true,
    });
    const expected = [
      variant === "a" ? "exr-manual" : "exr-choice",
      "exr-control",
    ];
    if (
      JSON.stringify(bodies.package.questions.map((q: any) => q.id)) !==
        JSON.stringify(expected)
    ) {
      failures.push(
        `full selected root export ${variant}: incorrect question set`,
      );
    }
    if (
      !bodies.package.questions.some((q: any) => Object.hasOwn(q, "solution"))
    ) {
      failures.push(
        `full selected root export ${variant}: teacher partition missing`,
      );
    }
    const control = bodies.publicPackage.questions.find((q: any) =>
      q.id === "exr-control"
    );
    if (!control || !JSON.stringify(control.condition).includes("публичн")) {
      failures.push(
        `full selected root export ${variant}: selected public control condition missing`,
      );
    }
    exports.push({
      variant,
      work: selected.work,
      owner: selected.courseId,
      ids: bodies.package.questions.map((q: any) => q.id),
      teacherPartition: true,
      publicControlCondition: true,
    });
  }
}
await Deno.writeTextFile(
  join(evidence, "native-proof.json"),
  JSON.stringify({ name, stages, exports, failures }, null, 2) + "\n",
);
if (failures.length) throw Error(failures.join("\n"));
console.log(
  "PASS: native student→full→student, separate outputs/nav/search/no teacher conditions, selected ROOT full Body",
);
