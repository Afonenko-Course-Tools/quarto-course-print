import { dirname } from "node:path";
import { info, safePath } from "../infrastructure/files.ts";
import { owned } from "./receipt.ts";
export interface PrintAttempt {
  stage: string;
  candidate: string;
  build: string;
  preserveRecovery: boolean;
}
/** Lock, fresh staging and cleanup surround every attempt, including failed rollback. */
export async function withPrintAttempt<T>(
  out: string,
  previous: string | undefined,
  work: string,
  action: (
    attempt: PrintAttempt,
    destination: string,
    previous: string,
  ) => Promise<T>,
): Promise<T> {
  const destination = await safePath(out), parent = dirname(destination);
  const prior = await safePath(previous ?? destination);
  await owned(destination, work);
  if (prior !== destination) await owned(prior, work);
  await Deno.mkdir(parent, { recursive: true });
  const lock = destination + ".print-lock";
  const handle = await Deno.open(lock, { write: true, createNew: true });
  let attempt: PrintAttempt | undefined;
  try {
    await owned(destination, work);
    const stage = await Deno.makeTempDir({
      dir: parent,
      prefix: ".course-print-attempt-",
    });
    attempt = {
      stage,
      candidate: stage + "/candidate",
      build: stage + "/build",
      preserveRecovery: false,
    };
    await Deno.mkdir(attempt.candidate);
    return await action(attempt, destination, prior);
  } finally {
    try {
      if (attempt && !attempt.preserveRecovery) {
        await Deno.remove(attempt.stage, { recursive: true });
      }
    } finally {
      handle.close();
      await Deno.remove(lock);
    }
  }
}
export async function promotePrint(
  attempt: PrintAttempt,
  destination: string,
  work: string,
): Promise<void> {
  const { stage, candidate } = attempt;
  await owned(destination, work);
  const exists = !!await info(destination);
  if (exists) await Deno.rename(destination, stage + "/old");
  try {
    await Deno.rename(candidate, destination);
  } catch (e) {
    if (exists) {
      try {
        await Deno.rename(stage + "/old", destination);
      } catch (rollback) {
        attempt.preserveRecovery = true;
        throw new AggregateError(
          [e, rollback],
          "ADAPTER: promotion and rollback failed; recover previous target from " +
            stage + "/old",
        );
      }
    }
    throw e;
  }
}
