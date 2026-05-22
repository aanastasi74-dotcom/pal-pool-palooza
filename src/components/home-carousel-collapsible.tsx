import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { HomeMatchCarousel } from "./home-match-carousel";

const STORAGE_KEY = "perebas:home-carousel-collapsed";

export function HomeCarouselCollapsible() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-expanded="false"
        aria-label="Mostrar destaques"
      >
        <ChevronDown className="h-3.5 w-3.5" />
        Destaques
      </button>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl">
      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
        <HomeMatchCarousel />
      </div>
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-foreground shadow-card backdrop-blur transition hover:bg-background"
        aria-expanded="true"
        aria-label="Recolher destaques"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
    </div>
  );
}
