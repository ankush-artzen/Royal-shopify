import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
    }

    const royaltiesPerOrder = await prisma.royaltyTransaction.groupBy({
        by: ["orderId", "orderName", "currency", "createdAt"], // ✅ include createdAt
        where: { shop },
        _sum: {
          amount: true,
          Royality: true,
        },
        orderBy: { createdAt: "desc" }, // now valid
      });
      
    return NextResponse.json({ data: royaltiesPerOrder });
  } catch (error) {
    console.error("Error fetching royalties per order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
