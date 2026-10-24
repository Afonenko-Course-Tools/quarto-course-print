import { assert } from "./support.ts";
const extension = "course-print";
const registry = globalThis as unknown as Record<symbol, unknown>;
const key = Symbol.for("course.performance.agent.v1");
const failures = Symbol.for("course.performance.failures.v1");
Deno.test("optional bridge identity and actual command child environment", async () => {
  const previous = Deno.env.toObject();
  const previousAgent = registry[key];
  const previousFailures = registry[failures];
  try {
    Deno.env.set("COURSE_PERF_MODE", "off");
    const { createMetrics } = await import("../_extensions/course-print/observability/bridge.ts");
    const fn = () => Promise.resolve("native");
    const base = { FUNCTIONAL: "native" };
    const off = createMetrics(extension);
    assert(off.wrapAsync({ id: "test", kind: "command" }, fn) === fn, "off function identity");
    const promise = fn();
    const same = () => promise;
    assert(off.wrapAsync({ id: "test", kind: "command" }, same)() === promise, "off Promise identity");
    assert(off.childEnv(base) === base, "off base identity");
    Deno.env.set("COURSE_PERF_MODE", "trace");
    delete registry[key];
    assert(createMetrics(extension).wrapAsync({ id: "test", kind: "command" }, fn) === fn, "missing agent native function");
    assert((registry[failures] as string[]).some((x) => x.includes(extension)), "missing agent diagnostic");
    const missing = await import("../_extensions/course-print/infrastructure/process.ts?missing-agent");
    assert(await missing.command(Deno.execPath(), ["eval", 'console.log("native-missing")']) === "native-missing\n", "missing agent actual native command");
    let active: string | undefined;
    let linked = true;
    const seen: Array<Record<string, unknown>> = [];
    registry[key] = { abiVersion: 1, metrics: {
      wrapAsync(spec: Record<string, unknown>, native: (...args: unknown[]) => Promise<unknown>) {
        seen.push(spec);
        return async (...args: unknown[]) => {
          active = linked ? "actual-command-parent" : undefined;
          try { return await native(...args); } finally { active = undefined; }
        };
      },
      childEnv(env: Record<string, string>) {
        const copy = { ...env };
        delete copy.COURSE_PERF_PARENT_SPAN_ID;
        if (active) copy.COURSE_PERF_PARENT_SPAN_ID = active;
        return copy;
      },
    } };
    Deno.env.set("COURSE_PERF_PARENT_SPAN_ID", "ghost-parent");
    Deno.env.set("print_FUNCTIONAL_PROBE", "kept-functional-value");
    const { command } = await import("../_extensions/course-print/infrastructure/process.ts?observed");
    const args = ["eval", 'console.log(JSON.stringify({parent:Deno.env.get("COURSE_PERF_PARENT_SPAN_ID"),functional:Deno.env.get("print_FUNCTIONAL_PROBE"),path:Deno.env.get("PATH"),cwd:Deno.cwd(),input:await new Response(Deno.stdin.readable).text()}))'];
    const child = JSON.parse(await command(Deno.execPath(), args, "native input", Deno.cwd()));
    assert(child.parent === "actual-command-parent", JSON.stringify(child));
    assert(child.functional === "kept-functional-value" && child.path === Deno.env.get("PATH"), "functional full environment");
    assert(child.cwd === Deno.cwd() && child.input === "native input", "native cwd/stdin");
    linked = false;
    const unlinked = JSON.parse(await command(Deno.execPath(), args));
    assert(unlinked.parent === undefined, "actual child inherited ghost parent");
    assert(unlinked.functional === "kept-functional-value", "unlinked functional environment");
    assert(seen.length === 1 && seen[0].kind === "command", "one command boundary");
    assert((seen[0].attributes as Record<string, unknown>).extension_id === extension, "extension binding");
    assert(seen[0].document_id === undefined, "batch/unknown source must stay unlinked");
    assert(Deno.env.get("COURSE_PERF_PARENT_SPAN_ID") === "ghost-parent", "parent environment unchanged");
  } finally {
    for (const key of Object.keys(Deno.env.toObject())) if (!(key in previous)) Deno.env.delete(key);
    for (const [key, value] of Object.entries(previous)) Deno.env.set(key, value);
    if (previousAgent === undefined) delete registry[key]; else registry[key] = previousAgent;
    if (previousFailures === undefined) delete registry[failures]; else registry[failures] = previousFailures;
  }
});

Deno.test("denied env and scoped off/missing agent retain native inheritance", async () => {
  const temp = await Deno.makeTempDir({ prefix: "course-print-no-env-" });
  try {
    const helper = new URL("../_extensions/course-print/infrastructure/process.ts", import.meta.url).href;
    const script = temp + "/probe.ts";
    await Deno.writeTextFile(script, `import { command } from ${JSON.stringify(helper)};
const result = await command("/bin/sh", ["-c", 'printf "%s|%s" "$print_PERF_INHERITED" "$COURSE_PERF_PARENT_SPAN_ID"']);
if (result !== "native-inherited|original-parent") throw Error(result);
console.log("native inheritance preserved");
`);
    for (const [mode, permission] of [["trace", "--deny-env"], ["off", "--allow-env=COURSE_PERF_MODE"], ["trace", "--allow-env=COURSE_PERF_MODE"]]) {
      const result = await new Deno.Command(Deno.execPath(), {
        args: ["run", "--no-config", "--no-lock", "--no-prompt", permission, "--allow-read", "--allow-run=/bin/sh", script],
        env: { ...Deno.env.toObject(), COURSE_PERF_MODE: mode, print_PERF_INHERITED: "native-inherited", COURSE_PERF_PARENT_SPAN_ID: "original-parent" },
        clearEnv: true, stdout: "piped", stderr: "piped",
      }).output();
      assert(result.success, mode + "/" + permission + ": " + new TextDecoder().decode(result.stderr));
      assert(new TextDecoder().decode(result.stdout) === "native inheritance preserved\n", "actual native child output");
    }
  } finally { await Deno.remove(temp, { recursive: true }); }
});
