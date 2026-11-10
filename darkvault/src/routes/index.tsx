import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import hacker from "@/assets/hooded_hacker_binary.jpg";
import { BinaryRain } from "@/components/vault/BinaryRain";
import { Logo, Wordmark } from "@/components/vault/Brand";
import { useVault } from "@/lib/vault";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DarkVault — Initializing Secure Access" },
      {
        name: "description",
        content:
          "DarkVault: your personal digital vault for documents and reminders, secured with a 6-digit code.",
      },
      { property: "og:title", content: "DarkVault — Your Personal Digital Vault" },
      {
        property: "og:description",
        content:
          "Keep certificates, IDs and reminders private on your phone. Secure. Private. Yours.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Splash,
});

const SPLASH_MS = 3000;

function Splash() {
  const { status, settings } = useVault();
  const navigate = useNavigate();
  const [timeUp, setTimeUp] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimeUp(true), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!timeUp || status === "loading") return;
    navigate({
      to: status === "new" ? "/setup" : status === "unlocked" ? "/home" : "/unlock",
      replace: true,
    });
  }, [timeUp, status, navigate]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-end overflow-hidden bg-background pb-14">
      <img
        src={hacker}
        alt=""
        width={864}
        height={1536}
        className="absolute inset-0 h-full w-full object-cover object-top opacity-90"
      />
      <BinaryRain
        active={settings.binaryRain}
        className="absolute inset-0 h-full w-full opacity-60 mix-blend-screen"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

      <div className="relative z-10 flex flex-col items-center px-8 animate-rise-in">
        <Logo className="mb-6 h-32 w-32 animate-pulse-ring" />
        <Wordmark className="text-5xl text-on-image glow-text" />
        <p className="mt-2 text-lg font-semibold text-on-image">Your Personal Digital Vault</p>
        <p className="mt-3 font-mono text-[11px] tracking-wider text-glow">
          {"> ACCESS LEVEL: PERSONAL | STATUS: ENCRYPTED"}
        </p>
      </div>

      <div className="relative z-10 mt-16 w-full px-14">
        <div className="mx-auto mb-6 h-6 w-56 rounded-[50%] border-2 border-glow/70 shadow-[var(--shadow-glow)]" />
        <p className="mb-3 text-center text-sm text-on-image/90">Initializing Secure Access...</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-strong">
          <div className="h-full animate-load-bar rounded-full bg-[image:var(--gradient-neon)] shadow-[var(--shadow-glow)]" />
        </div>
      </div>
    </main>
  );
}
