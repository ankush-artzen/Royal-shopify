import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";
import { createRoyaltyTransactionForOrder } from "@/lib/helper/createRoyaltyTransactionForOrder";

export async function POST(req: NextRequest) {
  try {
    console.log("✅ Orders webhook hit at", new Date().toISOString());

    const shop = req.headers.get("x-shopify-shop-domain");
    if (!shop) {
      console.warn("⚠️ Missing shop header in request");
      return NextResponse.json(
        { success: false, message: "Missing shop header" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const orderId = body.id?.toString();
    const orderName = body.name;
    const createdAt = new Date(body.created_at);
    const currency = body.currency || "USD";

    if (!orderId || !body.line_items) {
      console.warn("⚠️ Invalid order data:", body);
      return NextResponse.json(
        { success: false, message: "Invalid order data" },
        { status: 400 },
      );
    }

    // ✅ Check if this order is already processed
    const existingOrder = await prisma.royaltyOrder.findUnique({
      where: { shop_orderId: { shop, orderId } },
    });
    if (existingOrder) {
      console.log(
        `⚠️ Order ${orderId} for shop ${shop} has already been processed → Skipping webhook`,
      );
      return NextResponse.json({
        success: true,
        message: "Order already processed",
        royaltyOrder: existingOrder,
      });
    }

    const lineItemsToAdd: any[] = [];
    console.log(`Processing ${body.line_items.length} line items...`);

    // Extract all product IDs for batch query
    const productIds = body.line_items
      .map((item: any) => item.product_id?.toString())
      .filter(Boolean);

    if (productIds.length === 0) {
      console.log("⚠️ No valid product IDs found in line items");
      return NextResponse.json({
        success: false,
        message: "No royalty products in this order",
      });
    }

    // Create both numeric and GID versions for query
    const productIdGids = productIds.map(
      (id: string) => `gid://shopify/Product/${id}`,
    );

    // Use transaction with increased timeout
    const result = await prisma.$transaction(
      async (tx) => {
        // Pre-fetch all royalties in a single query
        const allRoyalties = await tx.productRoyalty.findMany({
          where: {
            shop,
            OR: [
              { shopifyId: { in: productIds } },
              { shopifyId: { in: productIdGids } },
            ],
          },
        });

        // Create a map for faster lookup
        const royaltiesMap = new Map();
        allRoyalties.forEach((royalty) => {
          // Extract numeric ID from both formats
          const numericId = royalty.shopifyId.includes("gid://")
            ? royalty.shopifyId.replace("gid://shopify/Product/", "")
            : royalty.shopifyId;

          if (!royaltiesMap.has(numericId)) {
            royaltiesMap.set(numericId, []);
          }
          royaltiesMap.get(numericId).push(royalty);
        });

        const royaltyUpdates: Array<{
          id: string;
          quantity: number;
          amount: number;
        }> = [];

        // Process line items using the pre-fetched data
        for (const item of body.line_items) {
          const productIdNumeric = item.product_id?.toString();
          if (!productIdNumeric) continue;

          const royalties = royaltiesMap.get(productIdNumeric) || [];
          if (!royalties.length) continue;

          const quantity = item.quantity;
          const unitPrice = parseFloat(item.price);
          const lineTotal = unitPrice * quantity;

          for (const royalty of royalties) {
            const productRoyalityCalculatedAmount =
              (lineTotal * royalty.Royality) / 100;

            lineItemsToAdd.push({
              productId: royalty.productId,
              title: item.title,
              variantId: item.variant_id?.toString() || "",
              variantTitle: item.variant_title || "",
              designerId: royalty.designerId,
              productRoyalityCalculatedAmount,
              quantity,
              unitPrice,
              royaltypercentage: royalty.Royality,
            });

            royaltyUpdates.push({
              id: royalty.id,
              quantity,
              amount: productRoyalityCalculatedAmount,
            });
          }
        }

        if (lineItemsToAdd.length === 0) {
          console.log("⚠️ No royalty products in this order");
          return null;
        }

        // Batch update product royalties
        const updatePromises = royaltyUpdates.map((update) =>
          tx.productRoyalty.update({
            where: { id: update.id },
            data: {
              totalSold: { increment: update.quantity },
              totalRoyaltyEarned: { increment: update.amount },
            },
          }),
        );
        await Promise.all(updatePromises);

        const calculatedRoyaltyAmount = lineItemsToAdd.reduce(
          (sum, li) => sum + li.productRoyalityCalculatedAmount,
          0,
        );

        // ✅ Create RoyaltyOrder
        const royaltyOrder = await tx.royaltyOrder.upsert({
          where: { shop_orderId: { shop, orderId } },
          update: {
            orderName,
            currency,
            lineItem: lineItemsToAdd,
            calculatedroyaltyamount: calculatedRoyaltyAmount,
            updatedAt: new Date(),
          },
          create: {
            shop,
            orderId,
            orderName,
            currency,
            lineItem: lineItemsToAdd,
            calculatedroyaltyamount: calculatedRoyaltyAmount,
            createdAt,
          },
        });

        return royaltyOrder;
      },
      {
        timeout: 15000, // 15 seconds timeout
        maxWait: 15000, // maximum wait time
      },
    );

    if (!result) {
      return NextResponse.json({
        success: false,
        message: "No royalty products in this order",
      });
    }

    // Process royalty transactions outside the main transaction
    // This ensures the main transaction completes quickly
    const transactionPromises = lineItemsToAdd.map(async (li) => {
      try {
        await createRoyaltyTransactionForOrder({
          shop,
          orderId,
          productId: li.productId,
          description: `Royalty payment for order ${orderName} - ${li.title}`,
          price: li.productRoyalityCalculatedAmount,
          currency,
          royaltypercentage: li.royaltypercentage,
          designerId: li.designerId,
        });
      } catch (error: any) {
        if (
          error.message.includes("already exists") ||
          error.message.includes("Transaction already exists")
        ) {
          console.log(
            `⚠️ Transaction already exists for ${li.title} → Skipping`,
          );
          return null;
        }
        console.error(`❌ Error creating transaction for ${li.title}:`, error);
        throw error; // Re-throw to catch in Promise.allSettled
      }
    });

    // Use allSettled to handle individual transaction failures gracefully
    const transactionResults = await Promise.allSettled(transactionPromises);

    // Check for any failures that weren't handled
    const failedTransactions = transactionResults.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    if (failedTransactions.length > 0) {
      console.warn(
        `⚠️ ${failedTransactions.length} royalty transactions failed, but order was processed successfully`,
      );
    }

    console.log("✅ Order processed successfully with royalty transactions");

    return NextResponse.json({
      success: true,
      royaltyOrder: result,
      warning:
        failedTransactions.length > 0
          ? `${failedTransactions.length} royalty transactions failed`
          : undefined,
    });
  } catch (error: any) {
    console.error("❌ Error processing order webhook:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal Server Error",
        message: "Failed to process order webhook",
      },
      { status: 500 },
    );
  }
}
