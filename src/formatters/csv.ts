/** Spreadsheet-safe CSV: strings stay text; numeric values retain their type.
 * JSON exports remain the lossless interchange format. Keep this policy in sync
 * with src/lib/export.ts; the published CLI deliberately has no app imports.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  let text = String(value);
  // Some spreadsheet importers skip leading whitespace/control characters.
  if (typeof value === "string" && (/^[\s\u0000-\u001f]*[=+@-]/u.test(text) || /^[\u0000-\u001f]/u.test(text))) {
    text = "'" + text;
  }
  return /[,"\r\n]/u.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
