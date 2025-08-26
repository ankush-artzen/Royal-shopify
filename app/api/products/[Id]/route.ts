import { NextRequest, NextResponse } from "next/server";
import { findSessionsByShop } from "@/lib/db/session-storage";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productId = params.id; // from [id] in URL
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop"); // from ?shop=<shop-domain>

    if (!shop || !productId) {
      return NextResponse.json(
        { error: "Missing shop or productId parameter" },
        { status: 400 }
      );
    }

    // Get session from DB
    const sessions = await findSessionsByShop(shop);
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: `No active session found for shop: ${shop}` }, { status: 401 });
    }

    const session = sessions.at(-1);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Session is missing access token" }, { status: 401 });
    }

    // Fetch product via Shopify REST API
    const url = `https://${shop}/admin/api/2025-07/products.json?ids=${productId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": session.accessToken,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    const product = data.products?.[0] || null;

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error: any) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
