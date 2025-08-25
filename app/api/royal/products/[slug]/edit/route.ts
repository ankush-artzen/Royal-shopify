import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  try {
    const body = await req.json();
    const { title, royaltyCharges, status, image } = body;

    // Update only provided fields
    const updatedProduct = await prisma.royalProduct.update({
      where: { slug },
      data: {
        ...(title !== undefined && { title }),
        ...(royaltyCharges !== undefined && { royaltyCharges }),
        ...(status !== undefined && { status }),
        ...(image !== undefined && { image }),
      },
    });

    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
