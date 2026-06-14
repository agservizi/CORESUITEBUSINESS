"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeModeProvider } from "@/context/ThemeModeProvider";
import { AiAssistantProvider } from "@/context/AiAssistantProvider";

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeModeProvider>
        <AiAssistantProvider>{children}</AiAssistantProvider>
      </ThemeModeProvider>
    </AppRouterCacheProvider>
  );
}
