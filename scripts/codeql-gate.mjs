import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const directory = process.argv[2] ?? "codeql-results";
const files = readdirSync(directory).filter((name) => name.endsWith(".sarif"));
if (!files.length) throw new Error("CodeQL produced no SARIF report.");
let findings = 0;
for (const file of files) {
  const report = JSON.parse(readFileSync(join(directory, file), "utf8"));
  if (!Array.isArray(report.runs) || !report.runs.length)
    throw new Error("CodeQL report has no analysis runs.");
  for (const run of report.runs) {
    for (const result of run.results ?? []) {
      findings++;
      console.error(`CodeQL finding: ${result.ruleId ?? "unknown rule"}`);
    }
  }
}
if (findings)
  throw new Error(
    `CodeQL reported ${findings} findings; deployment is blocked.`,
  );
console.log("CodeQL reports contain no findings.");
