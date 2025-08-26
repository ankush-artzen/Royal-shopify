import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function POST(req: NextRequest) {
  try {
    console.log("✅ Orders webhook hit at", new Date().toISOString());

    const shop = req.headers.get("x-shopify-shop-domain") || "";
    console.log("Shop:", shop);

    const body = await req.json();
    console.log("Webhook body:", JSON.stringify(body, null, 2));

    const orderId = body.id?.toString();
    const orderName = body.name;
    const createdAt = new Date(body.created_at);
    const currency = body.currency || "USD";

    if (!orderId || !body.line_items) {
      console.warn("Missing order ID or line items");
      return NextResponse.json(
        { success: false, message: "Invalid order data" },
        { status: 400 }
      );
    }

    const savedLineItems: any[] = [];
    const savedTransactions: any[] = [];

    // Process each line item
    for (const item of body.line_items) {
      const shopifyProductId = `gid://shopify/Product/${item.product_id}`;
      console.log("Processing line item:", item.title, "Product ID:", shopifyProductId);

      // Find product in DB
      const product = await prisma.product.findFirst({
        where: { shopifyId: shopifyProductId, shop },
      });

      if (!product) {
        console.log("Product not found in DB:", shopifyProductId);
        continue;
      }

      // Save line item
      const lineItem = await prisma.royaltyLineItem.create({
        data: {
          orderId,
          productId: product.id,
          quantity: item.quantity,
          unitPrice: parseFloat(item.price),
          currency,
        },
      });
      savedLineItems.push(lineItem);

      // Find royalties for this product
      const royalties = await prisma.productRoyalty.findMany({
        where: { productId: product.id },
        include: { designer: true },
      });

      if (royalties.length === 0) {
        console.log("No royalties assigned for product:", product.id);
        continue;
      }

      const lineTotal = parseFloat(item.price) * item.quantity;

      // Create royalty transactions linked to this line item
      for (const royalty of royalties) {
        const amount = (lineTotal * royalty.Royality) / 100;

        const transaction = await prisma.royaltyTransaction.create({
          data: {
            shop,
            orderId,
            orderName,
            productId: product.id,
            designerId: royalty.designerId,
            Royality: royalty.Royality,
            amount,
            quantity: item.quantity,
            unitPrice: parseFloat(item.price),
            currency,
            createdAt,
          },
        });

        savedTransactions.push(transaction);
        console.log(`Royalty transaction: designer ${royalty.designerId}, amount ${amount}`);
      }
    }

    console.log("✅ Line items saved:", savedLineItems.length);
    console.log("✅ Transactions saved:", savedTransactions.length);

    return NextResponse.json({ success: true, lineItems: savedLineItems, transactions: savedTransactions });
  } catch (error: any) {
    console.error("Error processing order webhook:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
