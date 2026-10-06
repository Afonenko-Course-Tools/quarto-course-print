/** Exercise actual setpriv reset; full namespace entry remains the installed CI gate. */
import { isolatedCommand } from "./installed-cli.ts";
import { assert, run } from "./support.ts";

Deno.test("setpriv resets selected user environment while preserving explicit tool paths", async () => {
  const env: Record<string, string> = {
    ...Deno.env.toObject(),
    PRINT_INHERITED_ENV_PROBE: "must be cleared",
    DENO_DIR: "/tmp/print-environment-probe-cache",
  };
  const command = await isolatedCommand(["env", "-0"], env);
  assert(command.slice(0, 4).join(" ") === "sudo unshare --net --");
  const uid = (await run(["id", "-u"])).trim();
  const gid = (await run(["id", "-g"])).trim();
  assert(
    command.includes(`--reuid=${uid}`) && command.includes(`--regid=${gid}`),
  );
  assert(command.includes("--clear-groups"));
  // Focused local check avoids UID/group and namespace syscalls. Installed CI
  // still executes the entire mandatory isolation command.
  const environmentCommand = command.slice(4).filter((arg) =>
    !arg.startsWith("--reuid=") && !arg.startsWith("--regid=") &&
    arg !== "--clear-groups"
  );
  const actual = Object.fromEntries(
    (await run(environmentCommand, { env })).split("\0")
      .filter(Boolean).map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1)];
      }),
  );
  assert(
    !("PRINT_INHERITED_ENV_PROBE" in actual),
    "inherited environment leaked",
  );
  const passwd = (await run(["getent", "passwd", uid])).trim().split(":");
  assert(actual.HOME === passwd[5], "HOME not reset to passwd entry");
  assert(
    actual.USER === passwd[0] && actual.LOGNAME === passwd[0],
    "user identity not reset",
  );
  assert(actual.SHELL === (passwd[6] || "/bin/sh"), "SHELL not reset");
  assert(
    actual.PATH === env.PATH && actual.DENO_DIR === env.DENO_DIR,
    "explicit tool paths lost",
  );
  assert(actual.DENO_NO_UPDATE_CHECK === "1", "offline update policy lost");
});
