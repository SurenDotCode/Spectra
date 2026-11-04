import { z } from "zod";
import { sourceSchema, safeUrl, type Source } from "../schemas";
import type { SearchProvider, Charge } from "./interfaces";
import { AppError } from "../errors";
export class TavilySearchProvider implements SearchProvider {
  constructor(
    private key: string,
    private charge: Charge,
    private request: typeof fetch = fetch,
  ) {}
  async search(query: string): Promise<Source[]> {
    if (query.length > 500) throw new AppError("QUERY");
    await this.charge("search");
    const response = await this.request("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: 8,
        include_answer: false,
        include_raw_content: false,
        auto_parameters: false,
      }),
      signal: AbortSignal.timeout(18000),
    });
    if (!response.ok)
      throw new AppError(
        "SEARCH",
        503,
        "Web search is unavailable or its quota was reached.",
      );
    const r = z
      .object({
        results: z
          .array(
            z.object({
              url: z.string(),
              title: z.string(),
              content: z.string(),
            }),
          )
          .max(30),
      })
      .parse(await response.json());
    return r.results
      .filter((s) => safeUrl.safeParse(s.url).success)
      .map((s) =>
        sourceSchema.parse({
          url: s.url,
          title: s.title.slice(0, 1500),
          text: s.content.slice(0, 50000),
          kind: "search",
          fetchedAt: new Date().toISOString(),
          links: [],
        }),
      );
  }
}
