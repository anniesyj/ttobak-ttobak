import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { checkoutId } = (await req.json()) as { checkoutId: string };
    if (!checkoutId) {
      return NextResponse.json({ error: "Missing checkoutId" }, { status: 400 });
    }

    const token = process.env.POLAR_ACCESS_TOKEN!;

    // Checkout Session 조회 (GET /v1/checkouts/{id})
    // status가 succeeded면 결제 성공으로 판단  [oai_citation:5‡Polar](https://polar.sh/docs/api-reference/checkouts/get-session?utm_source=chatgpt.com)
    const res = await fetch(`https://api.polar.sh/v1/checkouts/${checkoutId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.detail || data?.error || "Failed to fetch checkout session" },
        { status: 500 }
      );
    }

    const status = String(data?.status || "").toLowerCase();
    const succeeded = status === "succeeded";

    return NextResponse.json({ succeeded, status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}