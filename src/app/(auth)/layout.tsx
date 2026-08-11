import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-xl font-bold text-navy">
            planMyOwnHouse
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          {children}
        </div>
      </div>
    </div>
  );
}
