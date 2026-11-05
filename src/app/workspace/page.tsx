import { OfferWorkspace } from "@/components/offer-workspace";
export default function Page() {
  return (
    <section className="page session-page">
      <div className="eyebrow">New session</div>
      <h1>What do you sell?</h1>
      <OfferWorkspace />
    </section>
  );
}
