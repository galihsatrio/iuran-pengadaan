"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function RouteProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Setiap kali URL selesai berpindah, matikan loader
    setLoading(false);
    setProgress(100);
    const timeout = setTimeout(() => setProgress(0), 200);
    return () => clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target || !target.href) return;

      const targetUrl = new URL(target.href, window.location.href);
      const isInternal = targetUrl.origin === window.location.origin;
      const isSamePage = targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search;
      const isTargetBlank = target.target === "_blank";

      // Abaikan jika buka tab baru, download, atau halaman yang persis sama
      if (!isInternal || isSamePage || isTargetBlank || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      // Mulai progress bar halus
      setLoading(true);
      setProgress(25);

      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            clearInterval(interval);
            return prev;
          }
          return prev + Math.floor(Math.random() * 15) + 5;
        });
      }, 150);

      return () => clearInterval(interval);
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });
    return () => document.removeEventListener("click", handleAnchorClick, { capture: true });
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-1 bg-transparent overflow-hidden"
    >
      <div
        className="h-full bg-emerald-500 shadow-sm shadow-emerald-400 transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition: progress === 100 ? "width 100ms ease-out, opacity 200ms ease-out 100ms" : "width 200ms ease-out",
        }}
      />
    </div>
  );
}
