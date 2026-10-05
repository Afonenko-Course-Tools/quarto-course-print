// Local measured materialization only; no claim about upstream collect/compute time.
import { renderPrint } from "../_extensions/course-print/application/export.ts";
const [input, out] = Deno.args;
if (!input || !out) {
  throw Error(
    "usage: benchmark.ts package.json output-directory",
  );
}
const original = JSON.parse(await Deno.readTextFile(input));
const measurements = [];
for (const count of [4, 14, 20]) {
  const p = structuredClone(original), q = p.questions[0];
  p.questions = [];
  for (let i = 0; i < count; i++) {
    const next = structuredClone(q);
    next.id = "exr-bench-" + i;
    next.key = p.owner + "/" + next.id;
    p.questions.push(next);
  }
  p.works = [{ ...p.works[0], items: p.questions.map((q: any) => q.key) }];
  const target = out + "/questions-" + count;
  const opt = {};
  const runs = [];
  runs.push({
    label: "first target render; host already warm",
    ...await renderPrint(p, p.works[0].key, target, {}, opt),
  });
  runs.push({
    label: "repeat current render",
    ...await renderPrint(p, p.works[0].key, target, {}, opt),
  });
  for (let i = 0; i < 5; i++) {
    runs.push({
      label: "warm header edit",
      ...await renderPrint(
        p,
        p.works[0].key,
        target,
        { group: "Group " + i },
        opt,
      ),
    });
  }
  const info = await new Deno.Command("pdfinfo", {
    args: [target + "/handout.pdf"],
    stdout: "piped",
  }).output();
  const pages = Number(
    new TextDecoder().decode(info.stdout).match(/Pages:\s+(\d+)/)?.[1],
  );
  measurements.push({ questions: count, pages, runs });
}
console.log(
  JSON.stringify(
    {
      remark:
        "No fresh-machine cold or upstream benchmark; real Pandoc/Typst and filesystem stages",
      measurements,
    },
    null,
    2,
  ),
);
