import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/constants/constants";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const shop = searchParams.get("shop");
    const designerId = searchParams.get("designerId");
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");

    let page = Number(searchParams.get("page") || DEFAULT_PAGE);
    const limit = Number(searchParams.get("limit") || DEFAULT_LIMIT);

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

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // Clamp the page number to a valid range
    page = Math.min(Math.max(page, 1), totalPages);

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
      totalPages,
    });
  } catch (err: any) {
    console.error("Error fetching royalty products:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
