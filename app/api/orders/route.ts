import { NextRequest, NextResponse } from "next/server";
import { findSessionsByShop } from "@/lib/db/session-storage";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");
    const cursor = searchParams.get("cursor") || null;

    if (!shop) {
      return NextResponse.json(
        { error: "Missing shop parameter" },
        { status: 400 }
      );
    }

    // 🔑 Get session(s) for shop
    const sessions = await findSessionsByShop(shop);
    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: `No active session found for shop: ${shop}` },
        { status: 401 }
      );
    }

    // 👉 Use the most recent session
    const session = sessions.at(-1); // same as sessions[sessions.length - 1]

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Session is missing access token" },
        { status: 401 }
      );
    }

    // ✅ GraphQL query with pagination + fields
    const ORDER_QUERY = `
      query GetOrders($first: Int!, $after: String) {
        orders(first: $first, after: $after, reverse: true, sortKey: CREATED_AT) {
          edges {
            cursor
            node {
              id
              name
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              customer {
                firstName
                lastName
                email
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;

    // 🔎 Fetch from Shopify GraphQL
    const response = await fetch(
      `https://${shop}/admin/api/2024-04/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": session.accessToken,
        },
        body: JSON.stringify({
          query: ORDER_QUERY,
          variables: { first: 10, after: cursor },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || result.errors) {
      console.error("[❌ Shopify Error]", result.errors || response.statusText);
      return NextResponse.json(
        { error: "Failed to fetch orders from Shopify" },
        { status: 500 }
      );
    }

    // ✅ Flatten results
    const edges = result?.data?.orders?.edges || [];
    const orders = edges.map((edge: any) => ({
      cursor: edge.cursor,
      ...edge.node,
    }));

    console.log("📦 Raw Shopify response:", JSON.stringify(result, null, 2));
    console.log("✅ Flattened Orders:", orders);

    return NextResponse.json({
      orders,
      pageInfo: result?.data?.orders?.pageInfo,
    });
  } catch (error: any) {
    console.error("[🔥 API Error]", error.message || error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
