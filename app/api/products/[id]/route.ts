// app/api/products/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import shopify from "@/lib/shopify/initialize-context";
import { findSessionsByShop } from "@/lib/db/session-storage";
import prisma from "@/lib/db/prisma-connect";

const DELETE_PRODUCT_MUTATION = `
mutation productDelete($input: ProductDeleteInput!) {
  productDelete(input: $input) {
    deletedProductId
    userErrors {
      field
      message
    }
  }
}
`;

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const shop = url.searchParams.get("shop");
    const productId = url.searchParams.get("productId"); 

    if (!shop || !productId) {
      return NextResponse.json(
        { error: "shop and productId are required" },
        { status: 400 }
      );
    }

    // 🔑 Validate session
    const sessions = await findSessionsByShop(shop);
    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: "No active session for this shop" },
        { status: 401 }
      );
    }

    const client = new shopify.clients.Graphql({ session: sessions[0] });

    // 1️⃣ Delete product from Shopify
    const shopifyResponse = await client.query<{ data: any }>({
      data: {
        query: DELETE_PRODUCT_MUTATION,
        variables: { input: { id: productId } },
      },
    });

    const productDelete = shopifyResponse.body?.data?.productDelete;
    if (!productDelete) {
      throw new Error("No response from Shopify");
    }

    if (productDelete.userErrors.length > 0) {
      return NextResponse.json(
        { error: productDelete.userErrors },
        { status: 400 }
      );
    }

    // 2️⃣ Delete product from Prisma DB
    await prisma.shopifyProduct.deleteMany({
      where: {
        shop,
        shopifyId: productDelete.deletedProductId,
      },
    });

    return NextResponse.json({
      success: true,
      deletedProductId: productDelete.deletedProductId,
    });
  } catch (err: any) {
    console.error("DELETE error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
