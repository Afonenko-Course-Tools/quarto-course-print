import { assert, sample } from "./native-sample.ts";
import {
  preparePrint,
  renderPrint,
} from "../_extensions/course-print/application/export.ts";
Deno.test("native print needs no receipt identity or upstream assertion", async () => {
  const root = await Deno.makeTempDir();
  try {
    const p = sample();
    const result = await renderPrint(p, p.works[0].key, root + "/out", {});
    assert(result.engineCalls === 2, "native compiler calls");
    assert(
      (await Deno.readTextFile(root + "/out/public.json")).includes(
        "Public native condition",
      ),
      "public current body",
    );
    const names = [];
    for await (const e of Deno.readDir(root + "/out")) names.push(e.name);
    assert(!names.some((n) => n.includes("receipt")), "receipt emitted");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
Deno.test("legacy permissive Print package is unsupported", () => {
  const p: any = sample();
  delete p.schema;
  p.experimental = "p0-native-ast-v1";
  let failed = false;
  try {
    preparePrint(p, p.works[0].key, {});
  } catch {
    failed = true;
  }
  assert(failed, "experimental transport accepted");
});

Deno.test("native Print refresh removes resources absent from current body", async () => {
  const root = await Deno.makeTempDir();
  try {
    const p: any = sample();
    p.resources = [{
      owner: p.owner,
      source: "index.qmd",
      effectiveBase: root,
      target: "assets/old.txt",
      sha256:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      data: "",
      visibility: "public",
    }];
    p.questions[0].condition.push({
      t: "Para",
      c: [{
        t: "Link",
        c: [["", [], []], [{ t: "Str", c: "Old" }], ["assets/old.txt", ""]],
      }],
    });
    await renderPrint(p, p.works[0].key, root + "/out", {});
    await renderPrint(sample(), p.works[0].key, root + "/out", {});
    let exists = true;
    try {
      await Deno.stat(root + "/out/assets/old.txt");
    } catch {
      exists = false;
    }
    assert(!exists, "unselected stale resource remains in current export");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("previous public document cannot authorize deletion of a source file", async () => {
  const root = await Deno.makeTempDir();
  try {
    await Deno.mkdir(root + "/out");
    await Deno.writeTextFile(root + "/out/index.qmd", "SOURCE_MUST_SURVIVE");
    await Deno.writeTextFile(
      root + "/out/public.json",
      JSON.stringify({
        blocks: [{
          t: "Para",
          c: [{
            t: "Link",
            c: [["", [], []], [{ t: "Str", c: "old" }], ["index.qmd", ""]],
          }],
        }],
      }),
    );
    try {
      await renderPrint(sample(), "course-a/sec-work-one", root + "/out", {});
    } catch {}
    assert(
      await Deno.readTextFile(root + "/out/index.qmd") ===
        "SOURCE_MUST_SURVIVE",
      "previous document deleted native source",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
