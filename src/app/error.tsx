'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="empty-state">
      <h1 className="page-title">A little pause.</h1>
      <p>We couldn’t load this page. Please try again in a moment.</p>
      <button className="button primary" onClick={reset} style={{ marginTop: 20 }}>
        Try again
      </button>
    </div>
  );
}
