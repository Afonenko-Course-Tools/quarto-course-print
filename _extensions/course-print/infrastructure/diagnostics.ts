export interface DiagnosticContext {
  source?: string;
  id?: string;
  field?: string;
  related?: { source?: string; id?: string; field?: string }[];
  hint?: string;
}
export function diagnostic(
  code: string,
  message: string,
  context: DiagnosticContext = {},
  cause?: unknown,
): Error & { code: string } {
  const location = (c: { source?: string; id?: string; field?: string }) =>
    [
      c.source && `источник=${c.source}`,
      c.id && `ID=${c.id}`,
      c.field && `поле=${c.field}`,
    ].filter(Boolean).join("; ");
  const text = [
    `${code}: Print: ${message}`,
    location(context),
    ...context.related?.map((c) => `Связано: ${location(c)}`) ?? [],
    context.hint && `Подсказка: ${context.hint}`,
  ].filter(Boolean).join("\n");
  const error = new Error(text, cause === undefined ? undefined : { cause });
  error.name = "ExtensionDiagnostic";
  return Object.assign(error, { code });
}
