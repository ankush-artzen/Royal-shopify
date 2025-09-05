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

// In-memory lock map to prevent concurrent updates
const locks = new Map<string, Promise<any>>();

async function getActiveRoyaltySubscriptionByShop(shop: string) {
  const normalizedShop = shop.toLowerCase();
  const record = await prisma.royaltySubscription.findFirst({
    where: { shop: normalizedShop, status: "active" },
  });
  if (!record) throw new Error(`No active royalty subscription found for shop: ${shop}`);
  return record;
}

export async function createRoyaltyTransactionForOrder(params: CreateRoyaltyTxParams) {
  const { shop, orderId, productId, description, price, currency, royaltypercentage, designerId } = params;
  const lockKey = `${shop}-${orderId}-${productId}-${designerId}`;

  // If another request is processing, wait for it to finish
  if (locks.has(lockKey)) {
    console.log(`⏳ Waiting for existing transaction lock for ${lockKey}`);
    return locks.get(lockKey)!;
  }

  // Create a promise in the lock map
  const promise = (async () => {
    try {
      // 1️⃣ Check if transaction already exists
      let existingTx = await prisma.royaltyTransaction.findFirst({
        where: { shop, orderId, productId, designerId },
      });

      if (existingTx) {
        // Already exists → update only once
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
        console.log(`♻️ Updated existing RoyaltyTransaction [txId=${updatedTx.id}]`);
        return updatedTx;
      }

      // 2️⃣ Create Shopify usage charge
      const subscriptionRecord = await getActiveRoyaltySubscriptionByShop(shop);
      const chargeId = subscriptionRecord.chargeId!;
      const sessions = (await findSessionsByShop(shop)) as SessionType[] | SessionType | null;
      const token = Array.isArray(sessions) ? sessions[0]?.accessToken : sessions?.accessToken;
      if (!token) throw new Error(`No access token found for shop: ${shop}`);

      const resp = await fetch(
        `https://${shop}/admin/api/${API_VERSION}/recurring_application_charges/${chargeId}/usage_charges.json`,
        {
          method: "POST",
          headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
          body: JSON.stringify({ usage_charge: { description, price } }),
        }
      );

      const data = await resp.json();
      if (!resp.ok || !data.usage_charge) {
        throw new Error(`Shopify usage charge failed: ${JSON.stringify(data)}`);
      }

      const usageChargeData = data.usage_charge;

      // 3️⃣ Double-check DB (race condition)
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

      // 4️⃣ Insert new transaction safely
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
    } finally {
      // Release lock after completion
      locks.delete(lockKey);
    }
  })();

  locks.set(lockKey, promise);
  return promise;
}
