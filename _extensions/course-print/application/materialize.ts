import { fail, type PrintResource } from "../infrastructure/transport.ts";
import { copyIndex, files, json } from "../infrastructure/files.ts";
import { compilePrint } from "./compiler.ts";
import type {
  PrintDocument,
  PrintOptions,
  PrintReceipt,
  PrintResult,
} from "./contracts.ts";
import { prepareRecipe } from "./recipe.ts";
import { marker, reusableReceipt } from "./receipt.ts";
import { promotePrint, withPrintAttempt } from "./promotion.ts";
export type { PrintOptions, PrintResult } from "./contracts.ts";
export async function materialize(
  doc: PrintDocument,
  resources: readonly PrintResource[],
  work: string,
  out: string,
  options: PrintOptions,
  validationMs: number,
): Promise<PrintResult> {
  const started = performance.now(),
    timings: Record<string, number> = { validate: validationMs };
  const recipe = await prepareRecipe(doc, resources, options);
  timings.fingerprint = performance.now() - started;
  return await withPrintAttempt(
    out,
    options.previous,
    work,
    async (attempt, destination, previous) => {
      const prior = await reusableReceipt(previous, work, recipe);
      const staging = performance.now();
      let dependencies: string[],
        status: "built" | "reused",
        engineCalls: number;
      if (prior) {
        await copyIndex(previous, attempt.candidate, prior.outputs);
        dependencies = prior.dependencies;
        status = "reused";
        engineCalls = 0;
        timings.staging = performance.now() - staging;
      } else {
        dependencies = await compilePrint(
          attempt.build,
          attempt.candidate,
          resources,
          recipe,
          timings,
        );
        status = "built";
        engineCalls = 2;
      }
      const verification = performance.now();
      const outputs = await files(attempt.candidate);
      if (
        json(outputs.map((f) => f.path).sort()) !== json(recipe.expected)
      ) fail("unexpected target output set");
      const receipt: PrintReceipt = {
        owner: "course-print",
        recipe: recipe.version,
        target: work,
        reusable: recipe.reusable,
        fingerprint: recipe.fingerprint,
        dependencies,
        outputs,
      };
      await Deno.writeTextFile(
        attempt.candidate + "/" + marker,
        json(receipt) + "\n",
      );
      await promotePrint(attempt, destination, work);
      timings.verifyAndPromote = performance.now() - verification;
      timings.total = performance.now() - started + validationMs;
      return {
        status,
        reusable: recipe.reusable,
        fingerprint: recipe.fingerprint,
        engineCalls,
        timings,
      };
    },
  );
}
