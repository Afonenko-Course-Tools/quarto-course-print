/** Real complete source payload -> quarto add -> installed-only CLI and PDF. */
import {
  assert,
  assertInstalled,
  assertNoNodeModules,
  equalBytes,
  run,
  sha256,
} from "./support.ts";

export async function isolatedCommand(
  command: string[],
  env: Record<string, string>,
) {
  const uid = (await run(["id", "-u"])).trim();
  const gid = (await run(["id", "-g"])).trim();
  // Reset sudo environment from the selected UID passwd entry before explicit tool paths.
  return [
    "sudo",
    "unshare",
    "--net",
    "--",
    "setpriv",
    `--reuid=${uid}`,
    `--regid=${gid}`,
    "--clear-groups",
    "--reset-env",
    "env",
    `PATH=${env.PATH}`,
    `DENO_DIR=${env.DENO_DIR}`,
    "DENO_NO_UPDATE_CHECK=1",
    ...command,
  ];
}

async function check(repo: string, packagePath: string) {
  const stage = await Deno.realPath(
    await Deno.makeTempDir({ prefix: "print-installed-" }),
  );
  try {
    const source = `${stage}/source`, consumer = `${stage}/consumer`;
    await Deno.mkdir(source);
    await Deno.mkdir(consumer);
    await run(["cp", "-R", `${repo}/_extensions`, `${source}/_extensions`]);
    await run(["quarto", "add", source, "--no-prompt"], { cwd: consumer });
    const installed = `${consumer}/_extensions/course-print`;
    await assertInstalled(repo, installed);
    await assertNoNodeModules(consumer);
    await Deno.copyFile(packagePath, `${consumer}/package.json`);
    const payload = JSON.parse(await Deno.readTextFile(packagePath));
    await Deno.writeTextFile(
      `${consumer}/header.json`,
      '{"group":"Installed", "date":"2026-10-01"}\n',
    );
    const env = {
      ...Deno.env.toObject(),
      DENO_DIR: `${consumer}/deno-cache`,
      DENO_NO_UPDATE_CHECK: "1",
    };
    let command = [
      "deno",
      "run",
      "--no-config",
      "--no-lock",
      "--no-npm",
      "--cached-only",
      "--deny-net",
      `--allow-read=${consumer}`,
      `--deny-read=${repo},${source}`,
      `--allow-write=${consumer}`,
      "--allow-run=quarto",
      "--allow-env",
      `${installed}/entrypoints/export.ts`,
      "package.json",
      "course-a/sec-work-one",
      "output",
      "header.json",
    ];
    if (Deno.env.get("PRINT_REQUIRE_NETWORK_ISOLATION") === "1") {
      command = await isolatedCommand(command, env);
    }
    const result = JSON.parse(await run(command, { cwd: consumer, env }));
    assert(
      result.status === "built" && result.engineCalls === 2,
      "installed PDF build failed",
    );
    const text = await run([
      "pdftotext",
      `${consumer}/output/handout.pdf`,
      "-",
    ]);
    for (const token of ["TLS", "Installed", "Name", "2026-10-01"]) {
      assert(text.includes(token), token);
    }
    for (const secret of ["TEACHER_SECRET", "GRADING_SECRET", "closedKey"]) {
      assert(!text.includes(secret), secret);
    }
    for (const resource of payload.resources) {
      assert(
        await sha256(
          await Deno.readFile(`${consumer}/output/${resource.target}`),
        ) === resource.sha256,
        `Body resource integrity: ${resource.target}`,
      );
    }
    const original = await Deno.readFile(`${consumer}/output/handout.pdf`);
    // Failed transport integrity is refused before compiler writes.
    const damaged = {
      ...payload,
      resources: payload.resources.map((r: any) => ({
        ...r,
        sha256: "0".repeat(64),
      })),
    };
    await Deno.writeTextFile(
      `${consumer}/package.json`,
      JSON.stringify(damaged),
    );
    const failed = await new Deno.Command(command[0], {
      args: command.slice(1),
      cwd: consumer,
      env,
      stdout: "piped",
      stderr: "piped",
    }).output();
    assert(
      !failed.success &&
        new TextDecoder().decode(failed.stderr).includes("hash mismatch"),
      "damaged Body accepted",
    );
    assert(
      equalBytes(
        await Deno.readFile(`${consumer}/output/handout.pdf`),
        original,
      ),
      "failure replaced old PDF",
    );
    for await (const entry of Deno.readDir(consumer)) {
      assert(
        !entry.name.startsWith(".course-print-attempt-"),
        "failed attempt leaked",
      );
    }
    await assertNoNodeModules(consumer);
    console.log(
      `PASS: installed version/entrypoint, no dev reads/imports, real PDF/resources, failure keeps old artifact; input ${payload.schema}`,
    );
  } finally {
    await Deno.remove(stage, { recursive: true });
  }
}

if (import.meta.main) {
  assert(
    Deno.args.length === 2,
    "usage: installed-cli.ts repository generated-package.json",
  );
  await check(
    await Deno.realPath(Deno.args[0]),
    await Deno.realPath(Deno.args[1]),
  );
}
