import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BottomNav } from "@/components/vault/BottomNav";
import { useVault } from "@/lib/vault";

// Every vault screen is behind the security check; unlocked state lives only in memory.
export const Route = createFileRoute("/_vault")({
  component: VaultLayout,
});

function VaultLayout() {
  const { status } = useVault();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "new") navigate({ to: "/setup", replace: true });
    if (status === "locked") navigate({ to: "/unlock", replace: true });
  }, [status, navigate]);

  if (status !== "unlocked") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-glow" />
      </div>
    );
  }

  return (
    <>
      <div className="px-5 pb-28">
        <Outlet />
      </div>
      <BottomNav />
    </>
  );
}
