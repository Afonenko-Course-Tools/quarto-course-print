// External tools retain their own diagnostics; Body validation does not own them.
export async function command(
  cmd: string,
  args: string[],
  input?: string,
  cwd?: string,
): Promise<string> {
  let exitCode: number | undefined;
  let stdout = "", stderr = "";
  try {
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
    exitCode = out.code;
    stdout = new TextDecoder().decode(out.stdout);
    stderr = new TextDecoder().decode(out.stderr);
    if (!out.success) {
      throw Object.assign(
        new Error(`Внешний инструмент ${cmd} завершился с кодом ${exitCode}.`),
        { tool: cmd, exitCode, stdout, stderr },
      );
    }
    return stdout;
  } catch (cause) {
    const error = new Error(
      `Print: внешний инструмент ${cmd}${
        exitCode === undefined
          ? " не удалось запустить"
          : ` завершился с кодом ${exitCode}`
      }\n${stderr}${stdout}`,
      { cause },
    );
    error.name = "ExternalToolFailure";
    throw Object.assign(error, { tool: cmd, exitCode, stdout, stderr });
  }
}
