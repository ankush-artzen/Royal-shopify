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
  // 🔍 Check dedupe inside DB (ensures retries won’t double charge)
  const existingTx = await prisma.royaltyTransaction.findFirst({
    where: { shop, orderId, productId, designerId },
  });
  if (existingTx) {
    console.log(
      `⚠️ Skipping duplicate royalty transaction [txId=${existingTx.id}, orderId=${orderId}]`
    );
    return existingTx;
  }

  const subscriptionRecord = await getActiveRoyaltySubscriptionByShop(shop);
  const chargeId = subscriptionRecord?.chargeId;
  if (!chargeId) {
    throw new Error(`No active chargeId for shop ${shop}`);
  }

  // 🔑 Get access token for shop
  const sessions = (await findSessionsByShop(shop)) as
    | SessionType[]
    | SessionType
    | null;
  const token = Array.isArray(sessions)
    ? sessions[0]?.accessToken
    : sessions?.accessToken;
  if (!token) {
    throw new Error(`No access token found for shop: ${shop}`);
  }

  console.log(
    `→ Creating Shopify usage charge for shop=${shop}, orderId=${orderId}, productId=${productId}, price=${price}`
  );

  // 📡 Hit Shopify API
  const resp = await fetch(
    `https://${shop}/admin/api/${API_VERSION}/recurring_application_charges/${chargeId}/usage_charges.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        usage_charge: {
          description,
          price,
        },
      }),
    }
  );

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(
      `Failed to create usage charge for shop=${shop}, orderId=${orderId}, chargeId=${chargeId}: ${JSON.stringify(
        data
      )}`
    );
  }

  const usageChargeData = data?.usage_charge;
  if (!usageChargeData) {
    throw new Error(`Shopify did not return usage_charge for shop=${shop}`);
  }

  // ✅ Save in DB
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
