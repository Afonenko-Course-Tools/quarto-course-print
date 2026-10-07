import { command } from "../_extensions/course-print/infrastructure/process.ts";
import { assert } from "./support.ts";

Deno.test("external nonzero preserves tool exit streams and cause without ADAPTER", async () => {
  try {
    await command(Deno.execPath(), [
      "eval",
      'console.log("FOREIGN.STDOUT"); console.error("FOREIGN.ID stderr"); Deno.exit(7)',
    ]);
    throw Error("expected external refusal");
  } catch (error) {
    const e = error as Error & {
      tool: string;
      exitCode: number;
      stdout: string;
      stderr: string;
    };
    assert(e.name === "ExternalToolFailure", String(e));
    assert(e.tool === Deno.execPath() && e.exitCode === 7, "lost tool/exit");
    assert(
      e.stdout === "FOREIGN.STDOUT\n" && e.stderr === "FOREIGN.ID stderr\n",
      "lost streams",
    );
    assert(
      e.cause !== undefined && !e.message.includes("ADAPTER"),
      "lost foreign cause",
    );
  }
});
Deno.test("successful stderr stays tool output and input/cwd contract is unchanged", async () => {
  const stdout = await command(
    Deno.execPath(),
    [
      "eval",
      'console.error("native warning"); console.log(await new Response(Deno.stdin.readable).text()); console.log(Deno.cwd())',
    ],
    "public input",
    Deno.cwd(),
  );
  assert(stdout === "public input\n" + Deno.cwd() + "\n", stdout);
});
Deno.test("missing executable retains original failure cause", async () => {
  try {
    await command("/no-such-print-tool-20261007", []);
    throw Error("expected refusal");
  } catch (error) {
    const e = error as Error & { tool: string; cause: unknown };
    assert(
      e.name === "ExternalToolFailure" &&
        e.cause instanceof Deno.errors.NotFound,
      String(e),
    );
    assert(e.tool === "/no-such-print-tool-20261007", "lost tool");
  }
});
