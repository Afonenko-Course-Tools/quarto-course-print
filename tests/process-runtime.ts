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
    if (mode === "unknown") await unknownStartupFault();
    else if (mode === "drain") await concurrentDrain();
    else if (mode === "visible-stderr") await visibleSuccessStderr();
    else {
      await earlyChildExit();
      await unknownStartupFault();
      await concurrentDrain();
      await visibleSuccessStderr();
    }
    console.log("PASS: bundled runtime process boundary");
  }
}
