import { z } from "zod";
import { ResearchProgress } from "@/components/research-progress";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const offer = z.uuid().safeParse(raw.offer),
    id = z.uuid().safeParse(raw.id);
  return (
    <section className="page prose">
      <h1>Research</h1>
      <ResearchProgress
        offerId={offer.success ? offer.data : undefined}
        initialId={id.success ? id.data : undefined}
      />
    </section>
  );
}
