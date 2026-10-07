import { command } from "../_extensions/course-print/infrastructure/process.ts";
import { assert } from "./support.ts";

export async function earlyChildExit() {
  try {
    await command("/bin/sh", [
      "-c",
      "printf 'EARLY_STDOUT\\n'; printf 'EARLY_STDERR\\n' >&2; exit 31",
    ], "x".repeat(2_000_000));
    throw Error("expected external failure");
  } catch (error) {
    assert(
      error instanceof Error && error.name === "ExternalToolFailure",
      String(error),
    );
    const detail = error as Error & {
      tool: string;
      exitCode: number;
      stdout: string;
      stderr: string;
    };
    assert(
      detail.tool === "/bin/sh" && detail.exitCode === 31,
      `lost real tool/exit: ${JSON.stringify(detail)}`,
    );
    assert(
      detail.stdout === "EARLY_STDOUT\n" && detail.stderr === "EARLY_STDERR\n",
      `lost real streams: ${JSON.stringify(detail)}`,
    );
    assert(
      error.cause instanceof TypeError ||
        error.cause instanceof Deno.errors.BrokenPipe,
      "lost stdin operational cause",
    );
    const nativeCause = error.cause as Error;
    assert(
      error.message.split(nativeCause.message).length === 2,
      "native stdin refusal reason is hidden or duplicated",
    );
    for (const marker of ["EARLY_STDOUT", "EARLY_STDERR"]) {
      assert(
        error.message.split(marker).length === 2,
        "native streams duplicated",
      );
    }
  }
}
export async function unknownStartupFault() {
  const original = new TypeError("programming fault while reading arguments");
  const args = new Proxy([] as string[], {
    get() {
      throw original;
    },
  });
  try {
    await command(Deno.execPath(), args);
    throw Error("expected original fault");
  } catch (error) {
    assert(
      error === original && original.stack?.includes("process-runtime.ts"),
      "unknown startup exception was masked",
    );
  }
}
export async function concurrentDrain() {
  const out = await command("/bin/sh", [
    "-c",
    "head -c 1000000 /dev/zero; cat >/dev/null; printf DRAINED",
  ], "x".repeat(2_000_000));
  assert(
    out.length === 1_000_007 && out.endsWith("DRAINED"),
    "output pipes were not drained concurrently",
  );
}
export async function visibleSuccessStderr() {
  const result = await new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--no-config",
      "--no-lock",
      "--no-npm",
      "--cached-only",
      "--deny-net",
      "--allow-read",
      "--allow-run",
      "--allow-env",
      new URL(import.meta.url).pathname,
      "success-stderr",
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
  const stdout = new TextDecoder().decode(result.stdout),
    stderr = new TextDecoder().decode(result.stderr);
  assert(
    result.success && stdout === "SUCCESS_OUT" &&
      stderr === "NATIVE.SUCCESS stderr",
    `successful stderr lost/duplicated: ${JSON.stringify({ stdout, stderr })}`,
  );
}
export async function visibleStartupCause() {
  try {
    await command("/nonexistent/final-review-quarto", []);
    throw Error("expected startup refusal");
  } catch (error) {
    assert(
      error instanceof Error && error.name === "ExternalToolFailure",
      String(error),
    );
    const original = error.cause;
    assert(original instanceof Deno.errors.NotFound, "lost original OS error");
    assert(
      error.message.split(original.message).length === 2,
      "expected OS refusal reason is hidden or duplicated",
    );
  }
}
export async function installedCliCause() {
  const root = await Deno.makeTempDir({ prefix: "print-startup-cause-" });
  const repo = new URL("../", import.meta.url).pathname.replace(/\/$/, "");
  try {
    const add = await new Deno.Command("quarto", {
      args: ["add", repo, "--no-prompt"],
      cwd: root,
      stdout: "piped",
      stderr: "piped",
    }).output();
    assert(add.success, new TextDecoder().decode(add.stderr));
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
        answerType: "manual",
        condition: [{
          t: "Para",
          c: [{ t: "Str", c: "Public native condition" }],
        }],
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
      }],
      resources: [],
    };
    await Deno.writeTextFile(root + "/package.json", JSON.stringify(p));
    await Deno.writeTextFile(
      root + "/binding.json",
      '{"defaultGrade":1,"shuffle":false}',
    );
    let nativeCause: unknown;
    try {
      new Deno.Command("quarto", { args: [], env: { PATH: root } }).spawn();
    } catch (error) {
      nativeCause = error;
    }
    assert(
      nativeCause instanceof Deno.errors.NotFound,
      "expected native startup refusal",
    );
    const result = await new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--no-config",
        "--no-lock",
        "--no-npm",
        "--cached-only",
        "--deny-net",
        `--allow-read=${root}`,
        `--deny-read=${repo}`,
        `--allow-write=${root}`,
        "--allow-run",
        "--allow-env",
        `${root}/_extensions/course-print/entrypoints/export.ts`,
        ...["package.json", p.works[0].key, "output"],
      ],
      cwd: root,
      env: { PATH: root },
      stdout: "piped",
      stderr: "piped",
    }).output();
    const stderr = new TextDecoder().decode(result.stderr);
    assert(
      !result.success &&
        stderr.split(nativeCause.message).length === 2,
      `installed CLI hides or duplicates native OS cause: ${stderr}`,
    );
    assert(!stderr.includes("at file:") && !stderr.includes("ADAPTER"), stderr);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
}
if (import.meta.main) {
  const mode = Deno.args[0];
  if (mode === "success-stderr") {
    const out = await command("/bin/sh", [
      "-c",
      "printf SUCCESS_OUT; printf 'NATIVE.SUCCESS stderr' >&2",
    ]);
    await Deno.stdout.write(new TextEncoder().encode(out));
  } else {
    console.log(`Actual runtime Deno ${Deno.version.deno}`);
    if (mode === "startup-cause") await visibleStartupCause();
    else if (mode === "stdin-cause") await earlyChildExit();
    else if (mode === "installed-cause") await installedCliCause();
    else if (mode === "unknown") await unknownStartupFault();
    else if (mode === "drain") await concurrentDrain();
    else if (mode === "visible-stderr") await visibleSuccessStderr();
    else {
      await visibleStartupCause();
      await installedCliCause();
      await earlyChildExit();
      await unknownStartupFault();
      await concurrentDrain();
      await visibleSuccessStderr();
    }
    console.log("PASS: bundled runtime process boundary");
  }
}
