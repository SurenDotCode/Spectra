"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="page empty">
      <h1>This view couldn’t load.</h1>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
