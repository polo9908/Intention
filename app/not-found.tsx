import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-grid">
      <div className="text-center space-y-6 max-w-md px-6">
        <p className="text-xs tracking-widest text-accent uppercase">404</p>
        <h1 className="text-3xl font-bold text-text-primary">
          Page not found
        </h1>
        <p className="text-text-secondary text-sm leading-relaxed">
          The resource you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 border border-accent text-accent text-sm rounded
                     hover:bg-accent/10 transition-colors duration-200"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
