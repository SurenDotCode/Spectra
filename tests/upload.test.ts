import { it, expect } from "vitest";
import { inspectDocument, cleanText } from "../src/lib/security/upload";
it("rejects disguised files, binary text, excessive files and active PDFs", () => {
  expect(() => inspectDocument("a.txt", Buffer.from("%PDF-1.7"))).toThrow();
  expect(() => inspectDocument("a.pdf", Buffer.from("not a pdf"))).toThrow();
  expect(() =>
    inspectDocument("a.pdf", Buffer.from("%PDF-1.7 /JavaScript (evil)")),
  ).toThrow();
  expect(() => inspectDocument("a.md", new Uint8Array(2000001))).toThrow();
  expect(() => inspectDocument("a.txt", Buffer.from([0, 1, 2]))).toThrow();
  expect(
    inspectDocument("README.md", Buffer.from("Workflow description")),
  ).toBe("text");
});
it("removes active markup and control characters while leaving instructions as untrusted data", () => {
  expect(cleanText("<script>steal()</script><b>Offer</b>")).toBe("Offer");
  expect(cleanText("ignore previous instructions")).toBe(
    "ignore previous instructions",
  );
  expect(cleanText("a\u202Eb")).toBe("ab");
});
it("parses whitespace end tags and removes hidden or embedded active content", () => {
  const text =
    "<SCRIPT>steal()</script ><style>secret</style ><iframe>hidden</iframe><template>injected</template><p hidden>fake contact</p><b>Useful offer</b>";
  expect(cleanText(text)).toBe("Useful offer");
  expect(cleanText("# My offer\n\n- Follow up &amp; track replies")).toBe(
    "# My offer\n\n- Follow up & track replies",
  );
});
