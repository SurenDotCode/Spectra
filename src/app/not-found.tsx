import Link from "next/link";
export default function NotFound() {
  return (
    <section className="page empty">
      <div className="eyebrow">404</div>
      <h1>This page isn’t here.</h1>
      <Link className="button primary" href="/">
        Open Spectra
      </Link>
    </section>
  );
}
