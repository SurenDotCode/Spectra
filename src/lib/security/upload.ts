import { AppError } from "../errors";
import { load } from "cheerio";
export function inspectDocument(name: string, bytes: Uint8Array) {
  if (bytes.length === 0 || bytes.length > 2000000)
    throw new AppError("UPLOAD_SIZE", 413, "Documents must be under 2 MB.");
  const extension = name.toLowerCase().split(".").pop();
  const text = Buffer.from(bytes).toString("utf8");
  if (extension === "pdf") {
    if (
      !text.startsWith("%PDF-") ||
      /\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b/.test(text)
    )
      throw new AppError(
        "UPLOAD_TYPE",
        415,
        "Upload a plain PDF without scripts or attachments.",
      );
    return "pdf" as const;
  }
  if (
    !["md", "txt"].includes(extension ?? "") ||
    bytes.includes(0) ||
    text.includes("\uFFFD") ||
    text.startsWith("%PDF-")
  )
    throw new AppError(
      "UPLOAD_TYPE",
      415,
      "Upload UTF-8 .md, .txt, or a plain PDF.",
    );
  if (bytes.length > 80000)
    throw new AppError(
      "UPLOAD_SIZE",
      413,
      "Text documents must be under 80 KB.",
    );
  return "text" as const;
}
export function cleanText(text: string) {
  // Extract plain text with an HTML parser; this is never trusted HTML output.
  const $ = load(text, {}, false);
  $(
    "script,style,iframe,object,embed,template,noscript,[hidden],[aria-hidden='true']",
  ).remove();
  return $.root()
    .text()
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g,
      "",
    )
    .slice(0, 20000)
    .trim();
}
