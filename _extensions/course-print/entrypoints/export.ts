import { renderPrint } from "../application/export.ts";
const [source, work, out, header, context] = Deno.args;
if (!source || !work || !out || !context) {
  throw Error(
    "usage: export.ts package.json owner/work output-directory header.json context.json (explicit upstreamCurrent assertion required)",
  );
}
const options = JSON.parse(await Deno.readTextFile(context));
const result = await renderPrint(
  JSON.parse(await Deno.readTextFile(source)),
  work,
  out,
  JSON.parse(await Deno.readTextFile(header)),
  options,
);
console.log(JSON.stringify(result));
