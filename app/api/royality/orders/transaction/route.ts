import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const shop = searchParams.get("shop");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Date filtering
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : new Date();

    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(new Date().setDate(endDate.getDate() - 30)); // default last 30 days

    // Build where filter
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (shop) where.shop = shop;

    console.log("📌 Prisma query filter:", where);

    // Count total transactions (for pagination)
    const count = await prisma.royaltyTransaction.count({ where });

    // Fetch paginated transactions
    const transactions = await prisma.royaltyTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    console.log(`✅ Fetched ${transactions.length} transactions (page ${page})`);

    // Sanitize null values safely, including productId
    const safeTransactions = transactions.map((tx) => ({
      ...tx,
      productId: tx.productId ?? "N/A",
      royaltypercentage: tx.royaltypercentage ?? 0,
      designerId: tx.designerId ?? "N/A",
    }));

    return NextResponse.json({
      transactions: safeTransactions,
      count,
      page,
      totalPages: Math.ceil(count / limit) || 1,
    });
  } catch (error: any) {
    console.error("❌ Error fetching RoyaltyTransactions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch RoyaltyTransactions",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
