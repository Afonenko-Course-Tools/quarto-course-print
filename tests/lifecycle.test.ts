import { renderPrint } from "../_extensions/course-print/application/export.ts";
const render: any = renderPrint;
const assert = (v: unknown, m: string) => {
  if (!v) throw Error(m);
};
const sample = () =>
  JSON.parse(Deno.readTextFileSync(Deno.env.get("P0_PACKAGE")!));
const hash = async (b: Uint8Array) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(b))),
  ).map((x) => x.toString(16).padStart(2, "0")).join("");
const options = () => ({
  upstreamCurrent: true,
  toolchainIdentity: Deno.env.get("PRINT_TOOLCHAIN_ID") || "a".repeat(64),
});
async function rejected(f: () => Promise<unknown>, text: string) {
  try {
    await f();
  } catch (e) {
    assert(String(e).includes(text), String(e));
    return;
  }
  throw Error("expected rejection: " + text);
}
async function scope(f: (dir: string) => Promise<void>) {
  const dir = await Deno.makeTempDir();
  try {
    await f(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}
Deno.test("A11 no-op/key-only/unrelated edits preserve PDF without engine calls, fresh staging removes stale files", () =>
  scope(async (dir) => {
    const p = sample(), out = dir + "/current", opt = options();
    const first = await render(p, p.works[0].key, out, {}, opt);
    assert(
      first?.status === "built",
      "first render must return ready built receipt",
    );
    const pdf = await hash(await Deno.readFile(out + "/handout.pdf"));
    for (const kind of ["none", "key", "unrelated"]) {
      const q = structuredClone(p);
      if (kind === "key") q.questions[1].closedKey.correct = 0;
      if (kind === "unrelated") q.works[1].title = "Unrelated title";
      const hit = await render(q, q.works[0].key, out, {}, opt);
      assert(
        hit.status === "reused" && hit.engineCalls === 0,
        kind + " triggered engine",
      );
      assert(
        await hash(await Deno.readFile(out + "/handout.pdf")) === pdf,
        "PDF changed",
      );
    }
    await Deno.writeTextFile(out + "/obsolete.txt", "stale");
    await render(p, p.works[0].key, out, {}, opt);
    assert(
      !await exists(out + "/obsolete.txt"),
      "stale file survived owned replacement",
    );
    const fresh = await render(p, p.works[0].key, dir + "/fresh", {}, {
      ...opt,
      previous: out,
    });
    assert(
      fresh.status === "reused" && fresh.engineCalls === 0,
      "fresh attempt could not reuse",
    );
  }));
async function exists(p: string) {
  try {
    await Deno.lstat(p);
    return true;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return false;
    throw e;
  }
}
Deno.test("A11 public content/header/resource/URL changes invalidate only affected target", () =>
  scope(async (dir) => {
    const p = sample(), opt = options(), out = dir + "/one";
    await render(p, p.works[0].key, out, {}, opt);
    for (const kind of ["body", "field", "header", "resource", "url"]) {
      const q = structuredClone(p);
      let header = {};
      if (kind === "body") {
        q.questions[0].condition.push({
          t: "Para",
          c: [{ t: "Str", c: "Changed question" }],
        });
      }
      if (kind === "field") {
        q.questions[0].publicAnswer.push({
          t: "Para",
          c: [{ t: "Str", c: "Additional response space __________" }],
        });
      }
      if (kind === "header") header = { group: "Changed" };
      if (kind === "resource") {
        q.resources[0].data = btoa("Changed public data");
        q.resources[0].sha256 = await hash(
          new TextEncoder().encode("Changed public data"),
        );
      }
      if (kind === "url") {
        q.questions[0].condition.push({
          t: "Para",
          c: [{
            t: "Link",
            c: [["", [], []], [{ t: "Str", c: "QRC" }], [
              "https://example.org/current",
              "",
            ]],
          }],
        });
      }
      const result = await render(q, q.works[0].key, dir + "/" + kind, header, {
        ...opt,
        previous: out,
      });
      assert(
        result.status === "built" && result.engineCalls === 2,
        kind + " did not rebuild",
      );
    }
  }));
Deno.test("A11 unknown upstream blocks; unknown toolchain never reuses; invalid input fails before hit", () =>
  scope(async (dir) => {
    const p = sample(), out = dir + "/out";
    await rejected(() => render(p, p.works[0].key, out, {}, {}), "upstream");
    assert(!await exists(out), "unconfirmed upstream wrote output");
    for (let i = 0; i < 2; i++) {
      const r = await render(p, p.works[0].key, out, {}, {
        upstreamCurrent: true,
      });
      assert(!r.reusable && r.status === "built", "unknown identity reused");
    }
    await render(p, p.works[0].key, out, {}, options());
    const q = structuredClone(p);
    q.resources[0].sha256 = "0".repeat(64);
    await rejected(
      () => render(q, q.works[0].key, out, {}, options()),
      "hash mismatch",
    );
    q.resources = p.resources;
    q.questions[0].visibility = "closed";
    await rejected(
      () => render(q, q.works[0].key, out, {}, options()),
      "closed question",
    );
  }));
Deno.test("A11 corrupt artifact rebuilds; removed resources and removed release target stay absent", () =>
  scope(async (dir) => {
    const p = sample(), opt = options(), out = dir + "/release1/one";
    await render(p, p.works[0].key, out, {}, opt);
    await Deno.writeTextFile(out + "/handout.pdf", "corrupt");
    assert(
      (await render(p, p.works[0].key, out, {}, opt)).status === "built",
      "corrupt PDF reused",
    );
    await render(p, p.works[1].key, dir + "/release1/two", {}, opt);
    const q = structuredClone(p);
    q.questions[0].condition = [{
      t: "Para",
      c: [{ t: "Str", c: "No resources" }],
    }];
    await render(q, q.works[0].key, dir + "/release2/one", {}, {
      ...opt,
      previous: out,
    });
    assert(
      !await exists(dir + "/release2/one/resources"),
      "removed resources survived",
    );
    assert(!await exists(dir + "/release2/two"), "deleted target copied");
  }));
Deno.test("A11 template/partial/font inputs invalidate; failed compiler preserves old output and cleans attempt", () =>
  scope(async (dir) => {
    const p = sample(), opt = options(), out = dir + "/out";
    const source = new URL(
      "../_extensions/course-print/assets/",
      import.meta.url,
    );
    const assets = dir + "/assets";
    await copy(source, assets);
    await render(p, p.works[0].key, out, {}, { ...opt, assets });
    for (const name of ["default.typst", "template.typst"]) {
      await Deno.writeTextFile(assets + "/" + name, "\n// changed\n", {
        append: true,
      });
      assert(
        (await render(p, p.works[0].key, out, {}, { ...opt, assets }))
          .status === "built",
        name + " ignored",
      );
    }
    const font = assets + "/fonts/DejaVuSans.ttf";
    const bytes = await Deno.readFile(font);
    await Deno.writeFile(font, new Uint8Array([...bytes, 0]));
    assert(
      (await render(p, p.works[0].key, out, {}, { ...opt, assets })).status ===
        "built",
      "font ignored",
    );
    const before = await hash(await Deno.readFile(out + "/handout.pdf"));
    await Deno.writeTextFile(
      assets + "/template.typst",
      "\n#this-function-does-not-exist()\n",
      { append: true },
    );
    await rejected(
      () => render(p, p.works[0].key, out, {}, { ...opt, assets }),
      "ADAPTER",
    );
    assert(
      await hash(await Deno.readFile(out + "/handout.pdf")) === before,
      "failed render changed current PDF",
    );
    const entries = [];
    for await (const e of Deno.readDir(dir)) entries.push(e.name);
    assert(
      entries.sort().join(",") === "assets,out",
      "failed stage leaked: " + entries,
    );
  }));
async function copy(source: URL | string, dest: string) {
  await Deno.mkdir(dest, { recursive: true });
  for await (const e of Deno.readDir(source)) {
    const s = new URL(
      e.name + "/",
      typeof source === "string" ? new URL("file://" + source + "/") : source,
    );
    if (e.isDirectory) await copy(s, dest + "/" + e.name);
    else {await Deno.copyFile(
        new URL(
          e.name,
          typeof source === "string"
            ? new URL("file://" + source + "/")
            : source,
        ),
        dest + "/" + e.name,
      );}
  }
}
Deno.test("A11 refuses foreign output and symlink destinations", () =>
  scope(async (dir) => {
    const p = sample();
    await Deno.mkdir(dir + "/foreign");
    await Deno.writeTextFile(dir + "/foreign/keep", "mine");
    await rejected(
      () => render(p, p.works[0].key, dir + "/foreign", {}, options()),
      "owned",
    );
    await Deno.symlink(dir + "/foreign", dir + "/alias");
    await rejected(
      () => render(p, p.works[0].key, dir + "/alias", {}, options()),
      "symlink",
    );
    assert(
      await Deno.readTextFile(dir + "/foreign/keep") === "mine",
      "foreign file modified",
    );
  }));
Deno.test("A11 malformed reusable receipt rebuilds rather than trusting metadata", () =>
  scope(async (dir) => {
    const p = sample(), out = dir + "/out", opt = options();
    await render(p, p.works[0].key, out, {}, opt);
    const file = out + "/.course-print.json",
      receipt = JSON.parse(await Deno.readTextFile(file));
    receipt.outputs = [null];
    await Deno.writeTextFile(file, JSON.stringify(receipt));
    const r = await render(p, p.works[0].key, out, {}, opt);
    assert(r.status === "built", "malformed receipt reused");
  }));
Deno.test("A11 promotion failure restores old target; rollback failure retains recoverable backup", () =>
  scope(async (dir) => {
    const p = sample(), out = dir + "/out", opt = options();
    await render(p, p.works[0].key, out, {}, opt);
    const old = await hash(await Deno.readFile(out + "/handout.pdf"));
    const rename = Deno.rename;
    for (const brokenRollback of [false, true]) {
      Deno.rename = async (from, to) => {
        if (String(from).endsWith("/candidate")) {
          throw Error("simulated promotion failure");
        }
        if (brokenRollback && String(from).endsWith("/old")) {
          throw Error("simulated rollback failure");
        }
        await rename(from, to);
      };
      try {
        await rejected(
          () => render(p, p.works[0].key, out, { group: "Changed" }, opt),
          brokenRollback ? "recover" : "promotion",
        );
      } finally {
        Deno.rename = rename;
      }
      if (!brokenRollback) {
        assert(
          await hash(await Deno.readFile(out + "/handout.pdf")) === old,
          "rollback failed",
        );
      } else {
        const dirs = [];
        for await (const e of Deno.readDir(dir)) {
          if (e.name.startsWith(".course-print-attempt-")) dirs.push(e.name);
        }
        assert(dirs.length === 1, "recoverable stage deleted");
        assert(
          await hash(
            await Deno.readFile(dir + "/" + dirs[0] + "/old/handout.pdf"),
          ) === old,
          "backup destroyed",
        );
      }
    }
  }));
Deno.test("A11 shared recipe updates both targets while unselected question edit reuses unaffected work", () =>
  scope(async (dir) => {
    const p = sample(), opt = options(), assets = dir + "/assets";
    await copy(
      new URL("../_extensions/course-print/assets/", import.meta.url),
      assets,
    );
    const recipeOptions = { ...opt, assets };
    for (let i = 0; i < 2; i++) {
      await render(p, p.works[i].key, dir + "/w" + i, {}, recipeOptions);
    }
    const q = structuredClone(p);
    q.questions[1].condition.push({
      t: "Para",
      c: [{ t: "Str", c: "Selected only in work one" }],
    });
    assert(
      (await render(q, q.works[1].key, dir + "/w1", {}, recipeOptions))
        .engineCalls === 0,
      "unrelated question rebuilt",
    );
    await Deno.writeTextFile(
      assets + "/template.typst",
      "\n// shared template revision\n",
      { append: true },
    );
    for (let i = 0; i < 2; i++) {
      assert(
        (await render(p, p.works[i].key, dir + "/w" + i, {}, recipeOptions))
          .engineCalls === 2,
        "shared recipe did not update work",
      );
    }
  }));
Deno.test("A11 unknown or incomplete compiler dependency receipt forces rebuild", () =>
  scope(async (dir) => {
    const p = sample(), out = dir + "/out", opt = options();
    await render(p, p.works[0].key, out, {}, opt);
    for (
      const dependencies of [[], ["outside-current-closure.typ"], [
        "handout.typ",
        "handout.typ",
      ], ["resources/course-a/dot.png"]]
    ) {
      const path = out + "/.course-print.json",
        receipt = JSON.parse(await Deno.readTextFile(path));
      receipt.dependencies = dependencies;
      await Deno.writeTextFile(path, JSON.stringify(receipt));
      const result = await render(p, p.works[0].key, out, {}, opt);
      assert(
        result.status === "built" && result.engineCalls === 2,
        "bad dependency evidence reused: " + JSON.stringify(dependencies),
      );
    }
  }));
