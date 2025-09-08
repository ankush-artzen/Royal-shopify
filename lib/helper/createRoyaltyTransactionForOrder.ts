import prisma from "@/lib/db/prisma-connect";
import { findSessionsByShop } from "@/lib/db/session-storage";

const API_VERSION = "2025-07";

type CreateRoyaltyTxParams = {
  shop: string;
  orderId: string;
  productId: string;
  description: string;
  price: number;
  currency: string;
  royaltypercentage: number;
  designerId: string;
};

type SessionType = {
  accessToken: string;
  shop: string;
  id: string;
  scope?: string;
  state?: string;
  isOnline?: boolean;
  expires?: string | undefined;
};

// ✅ Get active subscription for shop
async function getActiveRoyaltySubscriptionByShop(shop: string) {
  const normalizedShop = shop.toLowerCase();

  const record = await prisma.royaltySubscription.findFirst({
    where: { shop: normalizedShop, status: "active" },
  });

  if (!record) {
    throw new Error(`No active royalty subscription found for shop: ${shop}`);
  }
  return record;
}

export async function createRoyaltyTransactionForOrder({
  shop,
  orderId,
  productId,
  description,
  price,
  currency,
  royaltypercentage,
  designerId,
}: CreateRoyaltyTxParams) {
  // 1️⃣ Pre-check for existing transaction
  let existingTx = await prisma.royaltyTransaction.findFirst({
    where: { shop, orderId, productId, designerId },
  });

  if (existingTx) {
    // Update existing instead of duplicate
    return prisma.royaltyTransaction.update({
      where: { id: existingTx.id },
      data: {
        description,
        price,
        currency,
        royaltypercentage,
        updatedAt: new Date(),
      },
    });
  }

  // 2️⃣ Fetch Shopify usage charge
  const subscriptionRecord = await getActiveRoyaltySubscriptionByShop(shop);
  const chargeId = subscriptionRecord.chargeId!;
  const sessions = (await findSessionsByShop(shop)) as SessionType[] | SessionType | null;
  const token = Array.isArray(sessions) ? sessions[0]?.accessToken : sessions?.accessToken;

  if (!token) throw new Error(`No access token found for shop: ${shop}`);

  const resp = await fetch(
    `https://${shop}/admin/api/${API_VERSION}/recurring_application_charges/${chargeId}/usage_charges.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ usage_charge: { description, price } }),
    }
  );

  const data = await resp.json();
  if (!resp.ok || !data.usage_charge) {
    throw new Error(`Shopify usage charge failed: ${JSON.stringify(data)}`);
  }

  const usageChargeData = data.usage_charge;

  // 3️⃣ Post-check again (handles race condition)
  existingTx = await prisma.royaltyTransaction.findFirst({
    where: { shop, orderId, productId, designerId },
  });

  if (existingTx) {
    return prisma.royaltyTransaction.update({
      where: { id: existingTx.id },
      data: {
        shopifyTransactionChargeId: usageChargeData.id.toString(),
        description: usageChargeData.description,
        price: parseFloat(usageChargeData.price),
        currency,
        balanceUsed: parseFloat(usageChargeData.balance_used ?? "0"),
        balanceRemaining: parseFloat(usageChargeData.balance_remaining ?? "0"),
        royaltypercentage,
        updatedAt: new Date(),
      },
    });
  }

  // 4️⃣ Safe insert (DB constraint ensures no dupes)
  try {
    return await prisma.royaltyTransaction.create({
      data: {
        shop,
        shopifyTransactionChargeId: usageChargeData.id.toString(),
        orderId,
        productId,
        description: usageChargeData.description,
        price: parseFloat(usageChargeData.price),
        currency,
        balanceUsed: parseFloat(usageChargeData.balance_used ?? "0"),
        balanceRemaining: parseFloat(usageChargeData.balance_remaining ?? "0"),
        royaltypercentage,
        designerId,
        createdAt: new Date(usageChargeData.created_at),
      },
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      return prisma.royaltyTransaction.findFirst({
        where: { shop, orderId, productId, designerId },
      });
    }
    throw err;
  }
}

