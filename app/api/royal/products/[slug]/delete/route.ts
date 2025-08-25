import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  try {
    // Check if product exists
    const product = await prisma.royalProduct.findUnique({ where: { slug } });
    if (!product) {
      return NextResponse.json({ error: `Product with slug "${slug}" not found` }, { status: 404 });
    }

    // Delete the product
    const deletedProduct = await prisma.royalProduct.delete({ where: { slug } });

    return NextResponse.json({ message: "Product deleted", deletedProduct });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
