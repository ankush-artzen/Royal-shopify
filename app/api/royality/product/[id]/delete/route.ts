import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } } 
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { error: "Missing shop parameter" },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Missing product ID in URL" },
        { status: 400 }
      );
    }

    // Find existing royalty directly by raw Shopify ID
    const royalty = await prisma.productRoyalty.findFirst({
      where: { shopifyId: id, shop },
    });

    if (!royalty) {
      return NextResponse.json(
        { error: "No royalty found for this product" },
        { status: 404 }
      );
    }

    await prisma.productRoyalty.delete({
      where: { id: royalty.id },
    });

    return NextResponse.json({ message: "Royalty deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting royalty:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
