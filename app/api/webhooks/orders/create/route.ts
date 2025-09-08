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

    console.log("Shop:", shop);

    const body = await req.json();
    console.log("Order payload received:", JSON.stringify(body, null, 2));

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

    const lineItemsToAdd: any[] = [];
    console.log(`Processing ${body.line_items.length} line items...`);

    for (const item of body.line_items) {
      const productIdNumeric = item.product_id?.toString();
      if (!productIdNumeric) continue;

      const productIdGid = `gid://shopify/Product/${productIdNumeric}`;

      const royalties = await prisma.productRoyalty.findMany({
        where: {
          shop,
          OR: [{ shopifyId: productIdNumeric }, { shopifyId: productIdGid }],
        },
      });

      console.log(
        `Product ${item.title} (${productIdNumeric}) royalties found:`,
        royalties.length,
      );

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

        console.log(
          "productRoyalityCalculatedAmount:",
          productRoyalityCalculatedAmount,
          "quantity:",
          quantity,
        );

        const currentTotalSold = royalty.totalSold ?? 0;
        const currentTotalRoyaltyEarned = royalty.totalRoyaltyEarned ?? 0;

        const updatedRoyalty = await prisma.productRoyalty.update({
          where: { id: royalty.id },
          data: {
            totalSold: { set: currentTotalSold + quantity },
            totalRoyaltyEarned: {
              set: currentTotalRoyaltyEarned + productRoyalityCalculatedAmount,
            },
          },
        });

        console.log(
          `→ Updated ProductRoyalty: ${item.title}, totalSold: ${updatedRoyalty.totalSold}, totalRoyaltyEarned: ${updatedRoyalty.totalRoyaltyEarned.toFixed(
            2,
          )}`,
        );
      }
    }

    if (lineItemsToAdd.length === 0) {
      console.log("⚠️ No royalty products in this order");
      return NextResponse.json({
        success: false,
        message: "No royalty products in this order",
      });
    }

    // 🔄 Check for existing RoyaltyOrder
    let royaltyOrder = await prisma.royaltyOrder.findFirst({
      where: { shop, orderId },
    });

    if (royaltyOrder) {
      console.log(
        `⚠️ Duplicate order found → Updating order (orderId: ${orderId})`,
      );

      royaltyOrder = await prisma.royaltyOrder.update({
        where: { id: royaltyOrder.id },
        data: {
          orderName,
          currency,
          lineItem: lineItemsToAdd,
          updatedAt: new Date(),
          calculatedroyaltyamount: lineItemsToAdd.reduce(
            (sum, li) => sum + li.productRoyalityCalculatedAmount,
            0,
          ),
        },
      });
    } else {
      royaltyOrder = await prisma.royaltyOrder.create({
        data: {
          shop,
          orderId,
          orderName,
          currency,
          lineItem: lineItemsToAdd,
          createdAt,
          calculatedroyaltyamount: lineItemsToAdd.reduce(
            (sum, li) => sum + li.productRoyalityCalculatedAmount,
            0,
          ),
        },
      });
      console.log("✅ New RoyaltyOrder created:", royaltyOrder.id);
    }

    // 💡 Upsert royalty transactions
    // 🔄 Deduplicate line items by productId + designerId
    const uniqueLineItemsMap = new Map<string, any>();
    for (const li of lineItemsToAdd) {
      const key = `${li.productId}|${li.designerId}`;
      if (uniqueLineItemsMap.has(key)) {
        const existing = uniqueLineItemsMap.get(key);
        existing.quantity += li.quantity;
        existing.productRoyalityCalculatedAmount +=
          li.productRoyalityCalculatedAmount;
      } else {
        uniqueLineItemsMap.set(key, li);
      }
    }
    const uniqueLineItems = Array.from(uniqueLineItemsMap.values());

    // 💡 Upsert RoyaltyTransactions
    for (const li of uniqueLineItems) {
      const existingTx = await prisma.royaltyTransaction.findFirst({
        where: {
          shop,
          orderId,
          productId: li.productId,
          designerId: li.designerId,
        },
      });

      if (existingTx) {
        console.log(
          `⚠️ Duplicate transaction found for ${li.title} → Updating`,
        );

        await prisma.royaltyTransaction.update({
          where: { id: existingTx.id },
          data: {
            price: li.productRoyalityCalculatedAmount,
            royaltypercentage: li.royaltypercentage,
            description: `created royalty payment for order ${orderName} - ${li.title}`,
            updatedAt: new Date(),
          },
        });
      } else {
        console.log(
          `Creating new RoyaltyTransaction for ${li.title} - Amount: ${li.productRoyalityCalculatedAmount}`,
        );

        await prisma.royaltyTransaction.create({
          data: {
            shop,
            orderId,
            productId: li.productId,
            designerId: li.designerId,
            price: li.productRoyalityCalculatedAmount,
            currency,
            royaltypercentage: li.royaltypercentage,
            description: `Royalty payment for order ${orderName} - ${li.title}`,
            balanceUsed: 0,
            balanceRemaining: 0,
            shopifyTransactionChargeId: "",
            createdAt: new Date(),
          },
        });

        // Call Shopify API for new transactions
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
      }
    }

    console.log("✅ All royalty transactions processed successfully");


    return NextResponse.json({
      success: true,
      royaltyOrder,
    });
  } catch (error: any) {
    console.error("❌ Error processing order webhook:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
