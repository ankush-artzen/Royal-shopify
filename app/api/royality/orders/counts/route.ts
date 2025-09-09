import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
    }

    // --- Existing: Fetch royalty orders ---
    const orders = (await prisma.royaltyOrder.findRaw({
      filter: { shop },
    })) as unknown as any[];

    let totalRoyaltyAmount = 0;
    let totalLineItemRoyalty = 0;

    for (const order of orders) {
      totalRoyaltyAmount += Number(order.calculatedroyaltyamount) || 0;

      if (Array.isArray(order.lineItem)) {
        for (const item of order.lineItem) {
          totalLineItemRoyalty += Number(item?.productRoyalityCalculatedAmount) || 0;
        }
      }
    }

    const totalOrders = orders.length;

    // --- New: Get product with highest totalSold ---
    const topProduct = await prisma.productRoyalty.findFirst({
      where: { shop },
      orderBy: { totalSold: "desc" },
      select: {
        title: true,
        productId: true,
        totalSold: true,
        price: true,
        Royality: true,
      },
    });

    return NextResponse.json({
      totalOrders,
      totalRoyaltyAmount,
      totalLineItemRoyalty,
      topProduct: topProduct || null, 
    });
  } catch (error: any) {
    console.error("Error fetching totals:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
