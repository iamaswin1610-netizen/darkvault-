import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function ScreenHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: boolean;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="flex items-center gap-3 pb-4 pt-6">
      {back && (
        <button
          type="button"
          onClick={() => router.history.back()}
          className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-accent"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between">
      <h2 className="label-caps">{children}</h2>
      {right}
    </div>
  );
}
