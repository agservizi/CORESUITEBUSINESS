"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAiAssistant } from "@/context/AiAssistantProvider";
import { aiScopeFromPathname, aiTitleFromPathname } from "@/lib/ai/scope-from-path";

export default function AiGlobalHotkeys() {
  const pathname = usePathname();
  const { openAssistant } = useAiAssistant();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        openAssistant({
          scope: aiScopeFromPathname(pathname),
          title: aiTitleFromPathname(pathname),
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, openAssistant]);

  return null;
}
