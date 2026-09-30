import AppShell from "@/components/AppShell";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <AppShell title="Not found">
      <div className="eyebrow mb-8">404 — Not Found</div>
      <h1 className="display text-6xl text-ink mb-10">Nothing here.</h1>
      <p className="font-serif italic text-2xl text-smoke mb-12">
        The page you're looking for doesn't exist.
      </p>
      <Link href="/" className="btn-solid">
        Go to Dashboard
      </Link>
    </AppShell>
  );
}
