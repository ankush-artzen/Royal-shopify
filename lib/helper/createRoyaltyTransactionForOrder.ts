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
  // 1️⃣ Check if transaction already exists
  const existingTx = await prisma.royaltyTransaction.findFirst({
    where: { shop, orderId, productId, designerId },
  });

  if (existingTx) {
    // ♻️ Already exists → skip creating/updating
    console.log(`⚠️ Transaction already exists for order ${orderId}, skipping.`);
    return existingTx; // just return the existing record
  }

  // 2️⃣ Not found → create Shopify usage charge
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

  // 3️⃣ Safe to insert new transaction
  const royaltyTransaction = await prisma.royaltyTransaction.create({
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

  console.log(
    `✅ RoyaltyTransaction created [txId=${royaltyTransaction.id}, orderId=${orderId}, price=${royaltyTransaction.price}]`
  );

  return royaltyTransaction;
}
