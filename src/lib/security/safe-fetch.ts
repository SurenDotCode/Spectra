import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import ipaddr from "ipaddr.js";
import robotsParser from "robots-parser";
import { load } from "cheerio";
import { AppError } from "../errors";
import type { Source } from "../schemas";
import type { FetchProvider } from "../providers/interfaces";
export const crawlerAgent = "SpectraResearch/1.0";
export function publicAddress(address: string) {
  try {
    const a = ipaddr.process(address);
    return a.range() === "unicast";
  } catch {
    return false;
  }
}
export function publicUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppError("SSRF", 400, "Invalid public URL.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port)) ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    (ipaddr.isValid(host) && !publicAddress(host))
  )
    throw new AppError("SSRF", 400, "This URL is not allowed.");
  if (host === "linkedin.com" || host.endsWith(".linkedin.com"))
    throw new AppError("RESTRICTED", 400, "LinkedIn pages are not fetched.");
  url.hash = "";
  return url;
}
type Resolved = { address: string; family: number };
type Raw = {
  url: string;
  status: number;
  headers: Record<string, string | undefined>;
  text: string;
};
export type Resolver = (host: string) => Promise<Resolved[]>;
export type Transport = (url: URL, ip: Resolved) => Promise<Raw>;
export async function nodeTransport(url: URL, ip: Resolved): Promise<Raw> {
  return new Promise((resolve, reject) => {
    const run = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = run(
      url,
      {
        method: "GET",
        agent: false,
        headers: {
          "User-Agent": crawlerAgent,
          Accept: "text/html,text/plain,application/xhtml+xml",
          "Accept-Encoding": "identity",
        },
        lookup: (_host, options, callback) => {
          if (options.all) callback(null, [ip]);
          else callback(null, ip.address, ip.family);
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        const type = res.headers["content-type"] ?? "";
        if (
          res.headers["content-encoding"] &&
          res.headers["content-encoding"] !== "identity"
        ) {
          res.destroy();
          reject(new AppError("FETCH_ENCODING", 422));
          return;
        }
        const redirect =
          (res.statusCode ?? 0) >= 300 && (res.statusCode ?? 0) < 400;
        if (
          !redirect &&
          !/^(text\/(html|plain)|application\/xhtml\+xml)(;|$)/i.test(type)
        ) {
          res.destroy();
          reject(new AppError("FETCH_TYPE", 422));
          return;
        }
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 1000000) {
            res.destroy();
            reject(new AppError("FETCH_SIZE", 413));
          } else chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () =>
          resolve({
            url: url.href,
            status: res.statusCode ?? 500,
            headers: { location: res.headers.location, "content-type": type },
            text: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    const timer = setTimeout(
      () => req.destroy(new AppError("FETCH_TIMEOUT", 504)),
      7000,
    );
    req.on("error", reject);
    req.on("close", () => clearTimeout(timer));
    req.end();
  });
}
export class SafeFetchProvider implements FetchProvider {
  constructor(
    private limit: (domain: string) => Promise<void>,
    private resolver: Resolver = (host) =>
      lookup(host, { all: true, verbatim: true }),
    private transport: Transport = nodeTransport,
  ) {}
  private async raw(
    value: string,
    checkRobots: boolean,
    redirects = 0,
  ): Promise<Raw> {
    const url = publicUrl(value);
    const addresses = await this.resolver(url.hostname.replace(/^\[|\]$/g, ""));
    if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
      throw new AppError("SSRF", 400, "This address is not public.");
    await this.limit(url.hostname);
    if (checkRobots) {
      const robots = await this.raw(new URL("/robots.txt", url).href, false);
      if (robots.status !== 404) {
        if (
          robots.status !== 200 ||
          robotsParser(new URL("/robots.txt", url).href, robots.text).isAllowed(
            url.href,
            crawlerAgent,
          ) === false
        )
          throw new AppError(
            "ROBOTS",
            403,
            "This site does not permit research crawling.",
          );
      }
    }
    const result = await this.transport(url, addresses[0]);
    if (result.status >= 300 && result.status < 400) {
      if (redirects >= 3 || !result.headers.location)
        throw new AppError("REDIRECT", 422);
      return this.raw(
        new URL(result.headers.location, url).href,
        checkRobots,
        redirects + 1,
      );
    }
    return result;
  }
  async fetch(value: string): Promise<Source> {
    const r = await this.raw(value, true);
    if (r.status !== 200)
      throw new AppError(
        "FETCH_STATUS",
        422,
        "The public page could not be read.",
      );
    const $ = load(r.text);
    $(
      'script,style,noscript,iframe,svg,form input,[hidden],[aria-hidden="true"],template',
    ).remove();
    $("[style]").each((_, e) => {
      const style = $(e).attr("style") ?? "";
      if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test(style))
        $(e).remove();
    });
    const links = [
      ...new Set(
        $("a[href]")
          .toArray()
          .map((e) => {
            try {
              return publicUrl(new URL($(e).attr("href") ?? "", r.url).href)
                .href;
            } catch {
              return "";
            }
          })
          .filter(Boolean),
      ),
    ].slice(0, 100);
    const linkedin = $("a[href]")
      .toArray()
      .map((e) => $(e).attr("href") ?? "")
      .filter((x) =>
        /^https:\/\/(www\.)?linkedin\.com\/(in|company)\//.test(x),
      );
    const publishedEmails = $("a[href^='mailto:']")
      .toArray()
      .map((e) => {
        try {
          return decodeURIComponent(
            ($(e).attr("href") ?? "").slice(7).split("?")[0],
          );
        } catch {
          return "";
        }
      })
      .filter(Boolean)
      .join(" ");
    return {
      url: r.url,
      title: $("title").text().slice(0, 1500),
      text: (
        $.root().text().replace(/\s+/g, " ").trim().slice(0, 48000) +
        (publishedEmails
          ? " Published email links: " + publishedEmails.slice(0, 2000)
          : "")
      ).trim(),
      links: [
        ...($("form").length && /contact/i.test(new URL(r.url).pathname)
          ? [r.url]
          : []),
        ...links,
        ...linkedin,
      ].slice(0, 100),
      kind: "page",
      fetchedAt: new Date().toISOString(),
    };
  }
}
