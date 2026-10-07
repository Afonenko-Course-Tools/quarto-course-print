import { renderPrint } from "../application/export.ts";
import { diagnostic } from "../infrastructure/diagnostics.ts";
const [source, work, out, header] = Deno.args;
async function readJson(path: string, field: string): Promise<unknown> {
  let text: string;
  try {
    text = await Deno.readTextFile(path);
  } catch (cause) {
    throw diagnostic(
      "PRINT.INPUT_INVALID",
      "Не удалось прочитать входной JSON.",
      { source: path, field, hint: "Укажите доступный файл JSON." },
      cause,
    );
  }
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw diagnostic("PRINT.INPUT_INVALID", "Некорректный входной JSON.", {
      source: path,
      field,
      hint: "Исправьте синтаксис JSON.",
    }, cause);
  }
}
try {
  if (!source || !work || !out) {
    throw diagnostic(
      "PRINT.INPUT_INVALID",
      "Нужны файл публичного пакета, ключ работы и каталог результата.",
      {
        field: "arguments",
        hint:
          "export.ts public-package.json course/work output-directory [header.json]",
      },
    );
  }
  console.log(
    JSON.stringify(
      await renderPrint(
        await readJson(source, "package"),
        work,
        out,
        header ? await readJson(header, "header") as any : {},
      ),
    ),
  );
} catch (error) {
  if (
    error instanceof Error &&
    ["ExtensionDiagnostic", "ExternalToolFailure"].includes(error.name)
  ) {
    console.error(
      error.message +
        (error.name === "ExtensionDiagnostic" && source
          ? `\nВходной пакет: ${source}`
          : ""),
    );
    Deno.exit(1);
  }
  throw error;
}
