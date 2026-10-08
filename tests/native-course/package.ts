import { loadNativeRun } from "./_extensions/course-core/infrastructure/native-run.ts";
import { collectExport } from "./_extensions/course-core/body-export/collect.ts";
import { buildBodies } from "./_extensions/course-core/body-export/producer.ts";
const run = await loadNativeRun(Deno.cwd());
const selected = await collectExport(Deno.cwd(), {
  book: ".",
  work: "sec-work-one",
});
const bodies = await buildBodies(selected.result, {
  projectRoot: selected.projectRoot,
  courseId: selected.courseId,
  work: selected.work,
  includeClosed: run.profiles.includes("full"),
});
await Deno.writeTextFile(
  "public-package.json",
  JSON.stringify(bodies.publicPackage),
);
await Deno.writeTextFile(
  "teacher-package.json",
  JSON.stringify(bodies.package),
);
