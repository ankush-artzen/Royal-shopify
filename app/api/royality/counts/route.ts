import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { error: "Missing shop parameter" },
        { status: 400 }
      );
    }

    const royalties = await prisma.productRoyalty.findMany({
      where: { shop },
    });

    return NextResponse.json({
      royalties,
      totalProducts: royalties.length, 
    });
  } catch (error: any) {
    console.error("Error fetching royalties:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
