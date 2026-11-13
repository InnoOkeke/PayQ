import { NextResponse } from "next/server";
import { resolveNaturalLanguageIntent } from "@/lib/aevum/intentResolver";
import { listAllRecipients } from "@/lib/recipients";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { prompt, senderAccount = "0x0000000000000000000000000000000000000000" } =
      await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const knownRecipients = await listAllRecipients();
    const resolved = resolveNaturalLanguageIntent(prompt, senderAccount, knownRecipients);

    return NextResponse.json({
      success: true,
      resolved,
    });
  } catch (error: any) {
    console.error("Resolve intent error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
