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
        { status: 400 }
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
        { status: 400 }
      );
    }

    const lineItemsToAdd: any[] = [];
    console.log(`Processing ${body.line_items.length} line items...`);

    // Use transaction to ensure atomic operations
    const result = await prisma.$transaction(async (tx) => {
      for (const item of body.line_items) {
        const productIdNumeric = item.product_id?.toString();
        if (!productIdNumeric) continue;

        const productIdGid = `gid://shopify/Product/${productIdNumeric}`;

        const royalties = await tx.productRoyalty.findMany({
          where: {
            shop,
            OR: [{ shopifyId: productIdNumeric }, { shopifyId: productIdGid }],
          },
        });

        console.log(
          `Product ${item.title} (${productIdNumeric}) royalties found:`,
          royalties.length
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
            quantity
          );

          const currentTotalSold = royalty.totalSold ?? 0;
          const currentTotalRoyaltyEarned = royalty.totalRoyaltyEarned ?? 0;

          await tx.productRoyalty.update({
            where: { id: royalty.id },
            data: {
              totalSold: { set: currentTotalSold + quantity },
              totalRoyaltyEarned: {
                set:
                  currentTotalRoyaltyEarned + productRoyalityCalculatedAmount,
              },
            },
          });

          console.log(
            `→ Updated ProductRoyalty: ${item.title}, totalSold: ${
              currentTotalSold + quantity
            }, totalRoyaltyEarned: ${(
              currentTotalRoyaltyEarned + productRoyalityCalculatedAmount
            ).toFixed(2)}`
          );
        }
      }

      if (lineItemsToAdd.length === 0) {
        console.log("⚠️ No royalty products in this order");
        return null;
      }

      const calculatedRoyaltyAmount = lineItemsToAdd.reduce(
        (sum, li) => sum + li.productRoyalityCalculatedAmount,
        0
      );

      // ✅ Use upsert to avoid duplicates
      const royaltyOrder = await tx.royaltyOrder.upsert({
        where: {
          shop_orderId: { shop, orderId }, // composite unique key
        },
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

      console.log(
        royaltyOrder.createdAt.getTime() === createdAt.getTime()
          ? "✅ New RoyaltyOrder created"
          : "⚠️ Duplicate RoyaltyOrder found → updated"
      );

      return royaltyOrder;
    });

    if (!result) {
      return NextResponse.json({
        success: false,
        message: "No royalty products in this order",
      });
    }

    // 💡 Create royalty transactions - helper should also use upsert
    for (const li of lineItemsToAdd) {
      try {
        console.log(
          `Creating/Checking RoyaltyTransaction for ${li.title} - Amount: ${li.productRoyalityCalculatedAmount}`
        );
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
            `⚠️ Transaction already exists for ${li.title} → Skipping`
          );
          continue;
        }
        console.error(`❌ Error creating transaction for ${li.title}:`, error);
      }
    }

    console.log("✅ All royalty transactions processed successfully");

    return NextResponse.json({
      success: true,
      royaltyOrder: result,
    });
  } catch (error: any) {
    console.error("❌ Error processing order webhook:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
