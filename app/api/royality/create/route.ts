import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");

    const body = await req.json();
    let { designerId, productId, Royality } = body;

    // ✅ Validate basic inputs
    if (!shop || !productId || Royality === undefined || isNaN(Royality)) {
      return NextResponse.json(
        { error: "Missing or invalid shop, productId, or Royality" },
        { status: 400 }
      );
    }

    // ✅ Normalize Shopify product ID
    const normalizedId = productId.toString().includes("gid://shopify/Product/")
      ? productId
      : `gid://shopify/Product/${productId}`;

    // ✅ Find product in DB
    const product = await prisma.product.findFirst({
      where: {
        shopifyId: normalizedId,
        shop,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: `Product with Shopify ID "${productId}" not found in shop "${shop}"` },
        { status: 404 }
      );
    }

    // ✅ Check if royalty already exists
    const existingRoyalty = await prisma.productRoyalty.findFirst({
      where: { productId: product.id },
    });

    if (existingRoyalty) {
      return NextResponse.json(
        { error: `Royalty already assigned to this product. Reassignment is not allowed.` },
        { status: 400 }
      );
    }

    // ✅ Pick a random designer if none provided
    if (!designerId) {
      const allDesigners = await prisma.designer.findMany();
      if (!allDesigners.length) {
        return NextResponse.json(
          { error: "No designers found to assign royalty" },
          { status: 404 }
        );
      }
      const randomIndex = Math.floor(Math.random() * allDesigners.length);
      designerId = allDesigners[randomIndex].id;
    } else {
      // ✅ Validate provided designerId exists
      const designer = await prisma.designer.findUnique({
        where: { id: designerId },
      });
      if (!designer) {
        return NextResponse.json(
          { error: `Designer with ID "${designerId}" not found` },
          { status: 404 }
        );
      }
    }

    // ✅ Create royalty
    const royalty = await prisma.productRoyalty.create({
      data: {
        productId: product.id,
        designerId,
        Royality,
      },
      include: {
        product: true,
        designer: true,
      },
    });

    return NextResponse.json({
      message: "Royalty assigned successfully",
      royalty,
    });
  } catch (error: any) {
    console.error("Error assigning royalty:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
