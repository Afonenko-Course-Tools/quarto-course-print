import { renderPrint } from "../application/export.ts";
const [source, work, out, header] = Deno.args;
if (!source || !work || !out) {
  throw Error(
    "usage: export.ts package.json owner/work output-directory [header.json]",
  );
}
await renderPrint(
  JSON.parse(await Deno.readTextFile(source)),
  work,
  out,
  header ? JSON.parse(await Deno.readTextFile(header)) : {},
);
