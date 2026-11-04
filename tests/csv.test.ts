import { it, expect } from "vitest";
import { csvCell, prospectsCsv } from "../src/lib/csv";
it.each([
  '=HYPERLINK("evil")',
  "+cmd",
  "-cmd",
  "@sum(A1)",
  "\t=1",
  "\r=1",
  "\n=1",
  "  =1",
])("neutralizes spreadsheet formulas: %s", (v) =>
  expect(csvCell(v).startsWith("\"'")).toBe(true),
);
it("escapes quotes and retains BOM", () => {
  expect(csvCell('A "brand"')).toBe('"A ""brand"""');
  expect(prospectsCsv([]).charCodeAt(0)).toBe(0xfeff);
});
