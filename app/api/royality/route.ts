import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");
    const productId = searchParams.get("productId");

    if (!shop) {
      return NextResponse.json(
        { error: "Missing shop parameter" },
        { status: 400 }
      );
    }

    // base filter: shop must match
    // const filter: any = { product: { shop } };

    // if (productId) {
    //   filter.product.OR = [
    //     { shopifyId: productId },
    //     { shopifyId: `gid://shopify/Product/${productId}` },
    //   ];
    // }

    const royalties = await prisma.productRoyalty.findMany({
      // where: filter,
      include: {
        product: true,
        designer: true,
      },
    });

    if (royalties.length === 0) {
      return NextResponse.json(
        { message: "No royalties found for given criteria" },
        { status: 404 }
      );
    }

    return NextResponse.json({ royalties });
  } catch (error: any) {
    console.error("Error fetching royalties:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
