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
  // 1️⃣ Check DB for existing transaction first
  let existingTx = await prisma.royaltyTransaction.findFirst({
    where: { shop, orderId, productId, designerId },
  });

  if (existingTx) {
    // ✅ Already exists → just update local record, skip Shopify API
    const updatedTx = await prisma.royaltyTransaction.update({
      where: { id: existingTx.id },
      data: {
        description,
        price,
        currency,
        royaltypercentage,
        updatedAt: new Date(),
      },
    });

    console.log(
      `♻️ Updated existing RoyaltyTransaction [txId=${updatedTx.id}, orderId=${orderId}]`
    );
    return updatedTx;
  }

  // 2️⃣ No local record → double-check again right before creating charge
  existingTx = await prisma.royaltyTransaction.findFirst({
    where: { shop, orderId, productId, designerId },
  });

  if (existingTx) {
    console.log(
      `⚠️ Race condition avoided, transaction already created [orderId=${orderId}]`
    );
    return existingTx;
  }

  // 3️⃣ Safe: call Shopify API once
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

  // 4️⃣ Final double-check (avoid retry race conditions)
  existingTx = await prisma.royaltyTransaction.findFirst({
    where: { shop, orderId, productId, designerId },
  });

  if (existingTx) {
    console.log(
      `⚠️ Duplicate avoided: Transaction already exists after charge [orderId=${orderId}]`
    );
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

  // 5️⃣ Create local transaction record
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
