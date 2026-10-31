import Link from "next/link";
import { ArrowLeft, Leaf } from "lucide-react";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-card">
        <span className="not-found-icon"><Leaf size={26} /></span>
        <span className="eyebrow">404 · PAGE NOT FOUND</span>
        <h1>Let’s get you back on track.</h1>
        <p>The page you followed doesn’t exist. Your workspace is still right where you left it.</p>
        <div className="not-found-links">
          <Link href="/" className="button primary"><ArrowLeft size={15} />Back to overview</Link>
          <Link href="/students" className="button secondary">Student directory</Link>
        </div>
      </div>
    </main>
  );
}
