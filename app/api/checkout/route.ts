import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
    const productId = process.env.POLAR_PRODUCT_ID!;
    const token = process.env.POLAR_ACCESS_TOKEN!;
    const discountCode = process.env.POLAR_DISCOUNT_CODE;

    const payload: any = {
      products: [productId],
      success_url: `${baseUrl}/?checkout_id={CHECKOUT_ID}`,
      return_url: `${baseUrl}/`,
    };

    if (discountCode) {
      payload.discounts = [
        {
          code: discountCode,
        },
      ];
    }

    const res = await fetch("https://api.polar.sh/v1/checkouts/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: data.url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}