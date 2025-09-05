import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const shop = searchParams.get("shop")?.trim();
    const designerId = searchParams.get("designerId")?.trim();
    const productId = searchParams.get("productId")?.trim();
    const status = searchParams.get("status")?.trim();

    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "8");

    // 🛠 Build dynamic query
    const where: any = {};
    if (shop) {
      where.shop = shop; // ✅ Shop filter has highest priority
    } else if (designerId) {
      where.designerId = designerId; // ✅ If shop missing, fallback to designer filter
    }
    if (productId) where.productId = productId;
    if (status) where.status = status;

    // 🔍 Debug logs
    console.log("=== API Debug: Get Royalty Products ===");
    console.log("Query Params:", { shop, designerId, productId, status, page, limit });
    console.log("Prisma Where Filter:", where);

    // Count & fetch
    const totalCount = await prisma.productRoyalty.count({ where });
    const royalties = await prisma.productRoyalty.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
    //   orderBy: { createdAt: "desc" },
    });

    console.log("Total Count:", totalCount);
    console.log("Returned Items:", royalties.length);

    return NextResponse.json({
      royalties,
      count: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (err: any) {
    console.error("❌ Error fetching royalty products:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
