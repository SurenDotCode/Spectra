import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:sk_live|sk-proj|ghp|gho)_[A-Za-z0-9]{20,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
];
let failed = false;
for (const file of files) {
  if (file === "scripts/secret-scan.mjs") continue;
  const text = readFileSync(file, "utf8");
  if (patterns.some((p) => p.test(text))) {
    console.error(`Potential secret in ${file}`);
    failed = true;
  }
  if (/^\.env(?!\.example)/.test(file)) {
    console.error("Environment file tracked");
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("Tracked-file secret pattern scan passed.");
