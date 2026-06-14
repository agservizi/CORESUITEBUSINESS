"use client";

import { usePathname } from "next/navigation";
import AiTopBarButton from "@/components/ai/AiTopBarButton";
import {
  aiScopeFromPathname,
  aiTitleFromPathname,
  aiModuleKeyFromPathname,
} from "@/lib/ai/scope-from-path";

export default function AiContextTopBarButton() {
  const pathname = usePathname();
  const moduleKey = aiModuleKeyFromPathname(pathname);
  return (
    <AiTopBarButton
      target={{
        scope: aiScopeFromPathname(pathname),
        moduleKey,
        title: aiTitleFromPathname(pathname),
      }}
    />
  );
}
