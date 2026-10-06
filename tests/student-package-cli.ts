import { assert } from "./support.ts";
if (import.meta.main) {
  assert(
    Deno.args.length === 1,
    "usage: student-package-cli.ts public-package.json",
  );
  const p = JSON.parse(await Deno.readTextFile(Deno.args[0]));
  assert(
    p.questions[1].answerType === "single-choice",
    "student answer type changed",
  );
  for (const secret of ["TEACHER_SECRET", "GRADING_SECRET", "closedKey"]) {
    assert(
      !JSON.stringify(p).includes(secret),
      `${secret} leaked into student package`,
    );
  }
}
