export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-8 w-8 rounded-full border-2 border-border border-t-accent animate-spin"
          aria-label="Loading"
        />
        <p className="text-xs text-text-secondary tracking-widest uppercase">
          Loading
        </p>
      </div>
    </div>
  );
}
