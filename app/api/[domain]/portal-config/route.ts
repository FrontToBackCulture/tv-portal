import { NextRequest, NextResponse } from "next/server";
import { savePortalConfig } from "@/lib/portal-db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params;

  try {
    const body = await req.json();
    const ok = await savePortalConfig(domain, {
      tabOrder: body.tabOrder || [],
      sectionOrder: body.sectionOrder || {},
    });

    if (!ok) {
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
