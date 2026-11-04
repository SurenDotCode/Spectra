import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, it, expect } from "vitest";
import {
  nodeTransport,
  SafeFetchProvider,
} from "../src/lib/security/safe-fetch";
let server: Server;
let port: number;
beforeAll(async () => {
  server = createServer((req, res) => {
    expect(req.headers.cookie).toBeUndefined();
    expect(req.headers.authorization).toBeUndefined();
    expect(req.headers["user-agent"]).toBe("SpectraResearch/1.0");
    if (req.url === "/slow") return;
    if (req.url === "/type") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("{}");
      return;
    }
    if (req.url === "/encoding") {
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Content-Encoding": "gzip",
      });
      res.end("compressed");
      return;
    }
    if (req.url === "/large") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("a".repeat(1000001));
      return;
    }
    if (req.url === "/redirect") {
      res.writeHead(302, { Location: "https://example.com/next" });
      res.end();
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h1>Public page</h1>");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No port");
  port = address.port;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
const request = (path: string) =>
  nodeTransport(new URL(`http://pinned-fixture.invalid:${port}${path}`), {
    address: "127.0.0.1",
    family: 4,
  });
it("pins the socket to supplied IP without another DNS lookup", async () => {
  expect((await request("/ok")).text).toContain("Public page");
});
it("rejects oversized, compressed and non-document responses", async () => {
  await expect(request("/large")).rejects.toThrow();
  await expect(request("/encoding")).rejects.toThrow();
  await expect(request("/type")).rejects.toThrow();
});
it("returns redirects to the policy layer rather than following them", async () => {
  const r = await request("/redirect");
  expect(r.status).toBe(302);
  expect(r.headers.location).toBe("https://example.com/next");
});
it("terminates stalled responses", async () => {
  await expect(request("/slow")).rejects.toThrow();
}, 10000);
it("extracts visible text and source links while removing active and hidden content", async () => {
  const provider = new SafeFetchProvider(
    async () => {},
    async () => [{ address: "93.184.216.34", family: 4 }],
    async (url) => ({
      url: url.href,
      status: 200,
      headers: {},
      text:
        url.pathname === "/robots.txt"
          ? "User-agent: *\nAllow: /"
          : '<title>Fixture</title><script>secret()</script><div hidden>hidden</div><p style="display:none">concealed</p><p>Real content</p><a href="/contact">Contact</a><a href="https://linkedin.com/in/person">Person</a><a href="javascript:alert(1)">bad</a>',
    }),
  );
  const source = await provider.fetch("https://example.com");
  expect(source.text).toContain("Real content");
  expect(source.text).not.toMatch(/secret\(\)|hidden|concealed/);
  expect(source.links).toContain("https://example.com/contact");
  expect(source.links).toContain("https://linkedin.com/in/person");
  expect(source.links.every((x) => x.startsWith("https://"))).toBe(true);
});
it("stops redirect loops and refuses missing pages and robots errors", async () => {
  const dns = async () => [{ address: "93.184.216.34", family: 4 }];
  const looping = new SafeFetchProvider(
    async () => {},
    dns,
    async (url) =>
      url.pathname === "/robots.txt"
        ? { url: url.href, status: 404, headers: {}, text: "" }
        : {
            url: url.href,
            status: 302,
            headers: { location: "/again" },
            text: "",
          },
  );
  await expect(looping.fetch("https://example.com")).rejects.toThrow();
  const failed = new SafeFetchProvider(
    async () => {},
    dns,
    async (url) => ({ url: url.href, status: 500, headers: {}, text: "" }),
  );
  await expect(failed.fetch("https://example.com")).rejects.toThrow();
  const missing = new SafeFetchProvider(
    async () => {},
    dns,
    async (url) => ({ url: url.href, status: 404, headers: {}, text: "" }),
  );
  await expect(missing.fetch("https://example.com")).rejects.toThrow();
});
