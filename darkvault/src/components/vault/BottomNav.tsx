import { Link, useLocation } from "@tanstack/react-router";
import { Bell, FolderLock, Home, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/documents", label: "Documents", icon: FolderLock },
  { to: "/reminders", label: "Reminders", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors",
                  active ? "text-glow" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-full transition-all",
                    active && "bg-primary/20 shadow-[var(--shadow-glow)]",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
