// External tools retain their own diagnostics; Body validation does not own them.
function externalFailure(
  tool: string,
  exitCode: number | undefined,
  stdout: string,
  stderr: string,
  cause?: unknown,
): Error {
  const reason = cause instanceof Error ? cause.message : "";
  const error = new Error(
    `Print: внешний инструмент ${tool}${
      exitCode === undefined
        ? " не удалось запустить или завершить ввод/вывод"
        : ` завершился с кодом ${exitCode}`
    }\n${stderr}${stdout}${reason ? "\n" + reason : ""}`,
    {
      cause: cause ??
        Object.assign(
          new Error(
            `Внешний инструмент ${tool} завершился с кодом ${exitCode}.`,
          ),
          { tool, exitCode, stdout, stderr },
        ),
    },
  );
  error.name = "ExternalToolFailure";
  return Object.assign(error, { tool, exitCode, stdout, stderr });
}
export async function command(
  cmd: string,
  args: string[],
  input?: string,
  cwd?: string,
): Promise<string> {
  // Encode before spawning: an invalid internal input must remain a programmer error.
  const bytes = input === undefined
    ? undefined
    : new TextEncoder().encode(input);
  let p: Deno.ChildProcess;
  try {
    p = new Deno.Command(cmd, {
      args,
      cwd,
      stdin: bytes === undefined ? "null" : "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
  } catch (cause) {
    if (!Object.values(Deno.errors).some((kind) => cause instanceof kind)) {
      throw cause;
    }
    throw externalFailure(cmd, undefined, "", "", cause);
  }
  // Drain stdout/stderr while writing stdin, avoiding opposing full pipes.
  // Resolve both outcomes here so output rejection cannot become unhandled while writing.
  const output = p.output().then((out) => ({ out }), (cause) => ({ cause }));
  let inputCause: unknown;
  if (bytes !== undefined) {
    const w = p.stdin.getWriter();
    try {
      await w.write(bytes);
      await w.close();
    } catch (cause) {
      // Bundled Deno can reject close() with a stream-state TypeError after early exit.
      inputCause = cause;
    } finally {
      w.releaseLock();
    }
  }
  const result = await output;
  if (
    inputCause !== undefined && !(inputCause instanceof TypeError) &&
    !Object.values(Deno.errors).some((kind) => inputCause instanceof kind)
  ) throw inputCause;
  if ("cause" in result) {
    if (
      !Object.values(Deno.errors).some((kind) => result.cause instanceof kind)
    ) throw result.cause;
    throw externalFailure(cmd, undefined, "", "", inputCause ?? result.cause);
  }
  const out = result.out;
  const stdout = new TextDecoder().decode(out.stdout);
  const stderr = new TextDecoder().decode(out.stderr);
  if (!out.success || inputCause !== undefined) {
    throw externalFailure(cmd, out.code, stdout, stderr, inputCause);
  }
  // Successful native stderr remains visible, verbatim, without semantic reclassification.
  for (let offset = 0; offset < out.stderr.length;) {
    offset += await Deno.stderr.write(out.stderr.subarray(offset));
  }
  return stdout;
}
