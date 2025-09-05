import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10); // default 10 per page

    if (!shop) {
      return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
    }

    const skip = (page - 1) * limit;

    const orders = await prisma.royaltyOrder.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        orderId: true,
        orderName: true,
        currency: true,
        createdAt: true,
        calculatedroyaltyamount: true,
        lineItem: true,
      },
    });

    const totalOrders = await prisma.royaltyOrder.count({ where: { shop } });

    // Calculate total royalty for **all orders** if needed
    const totalCalculatedRoyalty = await prisma.royaltyOrder.aggregate({
      _sum: { calculatedroyaltyamount: true },
      where: { shop },
    });

    return NextResponse.json({
      orders,
      totalCalculatedRoyalty: totalCalculatedRoyalty._sum.calculatedroyaltyamount || 0,
      totalOrders,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
