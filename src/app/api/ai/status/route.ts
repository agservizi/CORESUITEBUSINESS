import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { DEFAULT_GROQ_MODEL, isGroqConfigured } from "@/lib/ai/assist-service";

export const GET = withApi(
  async () => {
    return NextResponse.json({
      configured: isGroqConfigured(),
      model: DEFAULT_GROQ_MODEL,
    });
  },
  { requireCsrf: false }
);
