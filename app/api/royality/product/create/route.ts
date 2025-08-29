import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");

    const body = await req.json();
    const {
      designerId,
      productId,
      Royality,
      title,
      image,
      status,
      price,
      shopifyId,
    } = body;

    // 🔹 Basic validation
    if (
      !shop ||
      !productId ||
      !Royality ||
      isNaN(Royality) ||
      !title ||
      !designerId
    ) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid shop, productId, title, Royality, or designerId",
        },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(designerId)) {
      return NextResponse.json(
        { error: `Invalid Designer ID format: ${designerId}` },
        { status: 400 }
      );
    }

    // 🔹 Check if designer exists
    const designerExists = await prisma.designer.findUnique({
      where: { id: designerId },
    });

    if (!designerExists) {
      return NextResponse.json(
        {
          error: `Designer with ID ${designerId} not found.`,
        },
        { status: 404 }
      );
    }

    // 🔹 Check if royalty already exists
    const existingRoyalty = await prisma.productRoyalty.findFirst({
      where: { productId, designerId },
    });

    if (existingRoyalty) {
      return NextResponse.json(
        {
          error: "Royalty already assigned for this product & designer",
        },
        { status: 400 }
      );
    }

    // 🔹 Create royalty
    const royalty = await prisma.productRoyalty.create({
      data: {
        productId,
        shopifyId: shopifyId || productId,
        title,
        image: image || null,
        status: status || "active",
        price: price ? parseFloat(price) : null,
        designerId,
        Royality: parseFloat(Royality),
        shop,
      },
    });

    return NextResponse.json({
      message: "Royalty assigned successfully",
      royalty,
    });
  } catch (err: any) {
    console.error("Error creating royalty:", err);
    return NextResponse.json(
      { error: "Something went wrong while assigning royalty." },
      { status: 500 }
    );
  }
}
