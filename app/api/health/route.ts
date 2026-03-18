import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "ContextLayer",
    timestamp: new Date().toISOString(),
    env: {
      hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    },
  });
}
