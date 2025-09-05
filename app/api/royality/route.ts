import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const shop = searchParams.get("shop");
    const designerId = searchParams.get("designerId");
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");

    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "8");

    if (!shop) {
      return NextResponse.json(
        { error: "Missing shop parameter" },
        { status: 400 }
      );
    }

    // Build dynamic query
    const where: any = { shop };
    if (designerId) where.designerId = designerId;
    if (productId) where.productId = productId;
    if (status) where.status = status;

    // Count total items matching the filter
    const totalCount = await prisma.productRoyalty.count({ where });

    // Fetch paginated data
    const royalties = await prisma.productRoyalty.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      // orderBy: { createdAt: "desc" }, // newest first
    });

    return NextResponse.json({
      royalties,
      count: totalCount,   
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (err: any) {
    console.error("Error fetching royalty products:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
