import { loadNativeRun } from "./_extensions/course-core/infrastructure/native-run.ts";
import { assembleRelease } from "./_extensions/course-core/domain/release.ts";
import { buildBodies } from "./_extensions/course-core/body-export/producer.ts";
const run = await loadNativeRun(Deno.cwd());
const result = assembleRelease(
  run.documents.map((d) => d.source),
  run.documents,
  run.adapters,
  {
    view: run.profiles.includes("full") ? "full" : "student",
    profiles: run.profiles,
  },
);
const bodies = await buildBodies(result, {
  projectRoot: Deno.cwd(),
  work: "sec-work-one",
  includeClosed: run.profiles.includes("full"),
  sources: ["corpus.qmd", "work-one.qmd", "work-two.qmd"],
});
await Deno.writeTextFile(
  "public-package.json",
  JSON.stringify(bodies.publicPackage),
);
await Deno.writeTextFile(
  "teacher-package.json",
  JSON.stringify(bodies.package),
);
