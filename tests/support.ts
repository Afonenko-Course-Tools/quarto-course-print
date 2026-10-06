export function assert(
  value: unknown,
  message = "assertion failed",
): asserts value {
  if (!value) throw Error(message);
}

export async function run(
  command: string[],
  options: Deno.CommandOptions = {},
) {
  const result = await new Deno.Command(command[0], {
    ...options,
    args: command.slice(1),
    stdout: "piped",
    stderr: "piped",
  }).output();
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  assert(
    result.success,
    `Command failed: ${command.join(" ")}\n${stdout}\n${stderr}`,
  );
  return stdout;
}

export async function assertInstalled(repo: string, installed: string) {
  const expected =
    (await Deno.readTextFile(`${repo}/_extensions/course-print/_extension.yml`))
      .match(/^version:\s*(\S+)$/m)?.[1];
  const metadata = await Deno.readTextFile(`${installed}/_extension.yml`);
  assert(
    expected && metadata.match(/^version:\s*(\S+)$/m)?.[1] === expected,
    "installed extension version differs",
  );
  assert(
    metadata.includes("entrypoint: entrypoints/export.ts"),
    "installed entrypoint metadata missing",
  );
  assert(
    (await Deno.stat(`${installed}/entrypoints/export.ts`)).isFile,
    "installed entrypoint missing",
  );
}

export async function assertNoNodeModules(root: string) {
  for await (const entry of Deno.readDir(root)) {
    assert(entry.name !== "node_modules", "consumer created node_modules");
    if (entry.isDirectory) await assertNoNodeModules(`${root}/${entry.name}`);
  }
}

export async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(
    new Uint8Array(digest),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}

export function equalBytes(actual: Uint8Array, expected: Uint8Array) {
  return actual.length === expected.length &&
    actual.every((b, i) => b === expected[i]);
}
