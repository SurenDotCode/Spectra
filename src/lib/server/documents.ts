import "server-only";
import { Worker } from "node:worker_threads";
import path from "node:path";
import { z } from "zod";
import { inspectDocument, cleanText } from "../security/upload";
import { AppError } from "../errors";
export async function documentText(name: string, bytes: Uint8Array) {
  if (inspectDocument(name, bytes) === "text")
    return cleanText(Buffer.from(bytes).toString("utf8"));
  return new Promise<string>((resolve, reject) => {
    const worker = new Worker(path.join(process.cwd(), "workers/pdf.mjs"), {
      workerData: bytes,
      resourceLimits: { maxOldGenerationSizeMb: 128, stackSizeMb: 4 },
    });
    const timer = setTimeout(() => {
      void worker.terminate();
      reject(
        new AppError(
          "PDF",
          415,
          "PDF processing timed out. Upload a text export.",
        ),
      );
    }, 8000);
    worker.once("message", (message: unknown) => {
      clearTimeout(timer);
      void worker.terminate();
      const result = z
        .object({ text: z.string().optional(), error: z.string().optional() })
        .safeParse(message);
      if (!result.success || !result.data.text)
        reject(
          new AppError(
            "PDF",
            415,
            "PDF could not be read safely. Upload a text export.",
          ),
        );
      else resolve(cleanText(result.data.text));
    });
    worker.once("error", () => {
      clearTimeout(timer);
      reject(new AppError("PDF", 415, "PDF could not be read safely."));
    });
  });
}
