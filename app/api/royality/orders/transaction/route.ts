import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const shop = searchParams.get("shop");
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 100); 

    // Date filtering
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : new Date();
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(new Date().setDate(endDate.getDate() - 30)); // default last 30 days

    // Build Prisma where filter
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (shop) where.shop = shop;

    console.log("📌 Prisma query filter:", where);

    // Count total transactions for pagination
    const totalCount = await prisma.royaltyTransaction.count({ where });

    // Fetch paginated transactions, latest first
    const transactions = await prisma.royaltyTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    console.log(`✅ Fetched ${transactions.length} transactions (page ${page})`);

    // Sanitize null values safely
    const sanitizedTransactions = transactions.map((tx) => ({
      id: tx.id,
      shop: tx.shop,
      shopifyTransactionChargeId: tx.shopifyTransactionChargeId || "N/A", // ✅ Include this
      orderId: tx.orderId,
      productId: tx.productId || "N/A",
      description: tx.description || "",
      price: tx.price || 0,
      currency: tx.currency || "USD",
      royaltypercentage: tx.royaltypercentage || 0,
      designerId: tx.designerId || "N/A",
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
    }));
    

    return NextResponse.json({
      success: true,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      transactions: sanitizedTransactions,
    });
  } catch (error: any) {
    console.error("❌ Error fetching RoyaltyTransactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch RoyaltyTransactions",
      },
      { status: 500 }
    );
  }
}
