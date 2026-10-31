"use client";
import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, ShieldAlert } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[uplift] Page error:", error.message);
  }, [error]);
  return (
    <main className="not-found-page">
      <div className="not-found-card">
        <span className="not-found-icon warm"><ShieldAlert size={26} /></span>
        <span className="eyebrow">WE HIT A SMALL SNAG</span>
        <h1>That view couldn’t load.</h1>
        <p>Check that PostgreSQL is running and <code>DATABASE_URL</code> is set, then try again. No records were changed.</p>
        <div className="not-found-links">
          <button className="button primary" onClick={reset}><RotateCcw size={15} />Try again</button>
          <Link href="/" className="button secondary">Back to overview</Link>
        </div>
      </div>
    </main>
  );
}
