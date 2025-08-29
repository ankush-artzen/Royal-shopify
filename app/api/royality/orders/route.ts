import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
    }

    const orders = await prisma.royaltyOrder.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      select: {
        orderId: true,
        orderName: true,
        currency: true,
        createdAt: true,
        calculatedroyaltyamount: true,
        lineItem: true,
      },
    });

    const uniqueOrdersMap = new Map<string, typeof orders[0]>();
    orders.forEach((order) => {
      if (!uniqueOrdersMap.has(order.orderId)) {
        uniqueOrdersMap.set(order.orderId, order);
      }
    });

    const uniqueOrders = Array.from(uniqueOrdersMap.values());

    // Calculate total royalty across all orders
    const totalCalculatedRoyalty = uniqueOrders.reduce(
      (sum, order) => sum + (order.calculatedroyaltyamount || 0),
      0
    );

    return NextResponse.json({
      orders: uniqueOrders,
      totalCalculatedRoyalty,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
