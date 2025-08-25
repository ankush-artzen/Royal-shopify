import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect"; // adjust your prisma path

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, slug, image, royaltyCharges, status } = body;

    // Basic validation
    if (!title || !slug || royaltyCharges === undefined) {
      return NextResponse.json(
        { error: "title, slug, and royaltyCharges are required" },
        { status: 400 }
      );
    }

    const product = await prisma.royalProduct.create({
      data: {
        title,
        slug,
        image,
        royaltyCharges,
        status, // optional, defaults to DRAFT
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
