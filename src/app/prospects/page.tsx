import { z } from "zod";
import { ProspectBoard } from "@/components/prospect-board";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const value = z.uuid().safeParse((await searchParams).search);
  return (
    <section className="page">
      <div className="eyebrow">Your research</div>
      <h1>Prospects</h1>
      <ProspectBoard searchId={value.success ? value.data : undefined} />
    </section>
  );
}
