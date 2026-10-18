import type { ErrorComponentProps } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { Flame } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  const router = useRouter();
  const detail =
    (error instanceof Error && error.message) || "An unexpected error occurred. Try reloading the page.";
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ink px-6 py-16 text-center">
      <span className="text-ember" aria-hidden="true">
        <Flame className="size-12" strokeWidth={1.8} />
      </span>
      <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.28em] text-ember">The watch faltered</p>
      <h1 className="font-display text-4xl text-parchment sm:text-5xl">Something went wrong</h1>
      <p className="max-w-md font-sans text-sm leading-6 break-words text-dust">{detail}</p>
      <button
        type="button"
        onClick={() => router.invalidate()}
        className="mt-2 rounded-md border border-copper/60 bg-bark px-5 py-2.5 font-sans text-sm font-semibold text-parchment transition-colors hover:bg-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
      >
        Take up the watch again
      </button>
    </main>
  );
}
