import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

type SubscriptionStatus = {
  active: boolean;
  subscription?: any;
};

async function getActiveRoyaltySubscriptionByShop(shop: string) {
  const normalizedShop = shop.toLowerCase();
  console.log("🔎 Checking active subscription for shop:", normalizedShop);

  const record = await prisma.royaltySubscription.findFirst({
    where: { shop: normalizedShop, status: "active" },
  });

  if (!record) {
    console.log("⚠ No active subscription found for shop:", normalizedShop);
    return null;
  }

  console.log("📦 Active subscription found:", record);
  return record;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const shopParam = searchParams.get("shop");

    if (!shopParam) {
      return NextResponse.json(
        { error: "shop query parameter is required" },
        { status: 400 }
      );
    }

    const shop = shopParam.toLowerCase();
    const subscription = await getActiveRoyaltySubscriptionByShop(shop);

    if (subscription) {
      const response: SubscriptionStatus = {
        active: true,
        subscription,
      };
      return NextResponse.json(response, { status: 200 });
    } else {
      return NextResponse.json({ active: false }, { status: 200 });
    }
  } catch (e: any) {
    console.error("❌ Error fetching billing status:", e);
    return NextResponse.json(
      { error: "Internal server error", message: e.message },
      { status: 500 }
    );
  }
}
