import { assert } from "./support.ts";
import { diagnostic } from "../_extensions/course-print/infrastructure/diagnostics.ts";

Deno.test("local diagnostic retains cause and renders related provenance without fabricated lines", () => {
  const cause = new Error("foreign cause");
  const e = diagnostic("ADAPTER", "Некорректное поле.", {
    source: "tasks/work.qmd",
    id: "work-one",
    field: "items",
    related: [{
      source: "tasks/questions.qmd",
      id: "exr-one",
      field: "condition",
    }],
    hint: "Исправьте поле.",
  }, cause);
  assert(
    e.name === "ExtensionDiagnostic" && e.code === "ADAPTER" &&
      e.cause === cause,
  );
  for (
    const part of [
      "Print",
      "tasks/work.qmd",
      "work-one",
      "items",
      "tasks/questions.qmd",
      "exr-one",
      "condition",
      "Подсказка:",
    ]
  ) assert(e.message.includes(part), part);
});
const entry =
  new URL("../_extensions/course-print/entrypoints/export.ts", import.meta.url)
    .pathname;
async function cli(args: string[], env?: Record<string, string>) {
  const o = await new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--no-config",
      "--no-lock",
      "--no-npm",
      "--cached-only",
      "--deny-net",
      "--allow-read",
      "--allow-write",
      "--allow-run",
      "--allow-env",
      entry,
      ...args,
    ],
    stdout: "piped",
    stderr: "piped",
    env,
  }).output();
  return { success: o.success, stderr: new TextDecoder().decode(o.stderr) };
}
Deno.test("CLI emits own usage read JSON diagnostic once", async () => {
  const root = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(root + "/bad.json", "{");
    for (
      const args of [
        [],
        [root + "/missing.json", "course/work", root + "/out"],
        [root + "/bad.json", "course/work", root + "/out"],
      ]
    ) {
      const o = await cli(args);
      assert(
        !o.success &&
          (o.stderr.match(/PRINT.INPUT_INVALID/g) ?? []).length === 1,
        o.stderr,
      );
      assert(!o.stderr.includes("at file:"), o.stderr);
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
Deno.test("CLI keeps unknown internal exception stack", async () => {
  const root = await Deno.makeTempDir();
  try {
    const p = {
      schema: "course-body-package-v1",
      owner: "course-a",
      release: "test",
      apiVersion: [1, 23, 1],
      questions: [{
        owner: "course-a",
        id: "exr-one",
        key: "course-a/exr-one",
        source: "tasks.qmd",
        visibility: "public",
        statementVisibility: "restricted",
        hasPublicSolution: false,
        answerType: "manual",
        condition: [],
        publicAnswer: [],
      }],
      works: [{
        owner: "course-a",
        id: "work-one",
        key: "course-a/work-one",
        source: "work.qmd",
        kind: "test",
        title: "Work",
        items: ["course-a/exr-one"],
        assignments: {
          "course-a/exr-one": {
            requirement: "required",
            workMode: "individual",
          },
        },
      }],
      resources: [],
    };
    await Deno.writeTextFile(root + "/p.json", JSON.stringify(p));
    await Deno.writeTextFile(root + "/header.json", "null");
    const o = await cli([
      root + "/p.json",
      p.works[0].key,
      root + "/out",
      root + "/header.json",
    ]);
    assert(
      !o.success && o.stderr.includes("TypeError") &&
        o.stderr.includes("prepareValidatedPrint"),
      o.stderr,
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("CLI emits semantic and external messages once without replacing foreign IDs", async () => {
  const root = await Deno.makeTempDir();
  try {
    const p = {
      schema: "course-body-package-v1",
      owner: "course-a",
      release: "test",
      apiVersion: [1, 23, 1],
      questions: [],
      works: [{
        owner: "course-a",
        id: "work-one",
        key: "course-a/work-one",
        source: "work.qmd",
        kind: "test",
        title: "Work",
        items: ["course-a/exr-one"],
        assignments: {
          "course-a/exr-one": {
            requirement: "required",
            workMode: "individual",
          },
        },
      }],
      resources: [],
    };
    await Deno.writeTextFile(root + "/p.json", JSON.stringify(p));
    let o = await cli([root + "/p.json", p.works[0].key, root + "/out"]);
    assert(
      o.stderr.includes(root + "/p.json"),
      "CLI lost the known input package path",
    );
    assert(
      !o.success && (o.stderr.match(/ADAPTER/g) ?? []).length === 1 &&
        !o.stderr.includes("at file:"),
      o.stderr,
    );
    const valid = {
      ...p,
      questions: [{
        owner: "course-a",
        id: "exr-one",
        key: "course-a/exr-one",
        source: "tasks.qmd",
        visibility: "public",
        statementVisibility: "restricted",
        hasPublicSolution: false,
        answerType: "manual",
        condition: [],
        publicAnswer: [],
      }],
    };
    await Deno.writeTextFile(root + "/p.json", JSON.stringify(valid));
    await Deno.writeTextFile(
      root + "/quarto",
      '#!/bin/sh\nprintf "FOREIGN.OUT\\n"\nprintf "FOREIGN.ID native detail\\n" >&2\nexit 7\n',
    );
    await Deno.chmod(root + "/quarto", 0o755);
    o = await cli([root + "/p.json", p.works[0].key, root + "/out"], {
      PATH: root + ":" + Deno.env.get("PATH"),
    });
    assert(
      !o.success && (o.stderr.match(/FOREIGN.ID/g) ?? []).length === 1 &&
        o.stderr.includes("FOREIGN.OUT") && o.stderr.includes("7") &&
        !o.stderr.includes("ADAPTER") && !o.stderr.includes("at file:"),
      o.stderr,
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
