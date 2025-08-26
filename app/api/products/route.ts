import { NextRequest, NextResponse } from "next/server";
import shopify from "@/lib/shopify/initialize-context";
import { findSessionsByShop } from "@/lib/db/session-storage";
import {
  GetProductsQuery,
  GetProductsQueryVariables,
} from "@/types/admin.generated";


const GET_PRODUCTS = `
  query getProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      nodes {
        id
        title
        handle
        status
        createdAt
        tags
        variants(first: 100) {
          edges {
            node {
              id
              title
              sku
              price
            }
          }
        }
        media(first: 1) {
          edges {
            node {
              ... on MediaImage {
                image {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { error: "Missing shop parameter" },
        { status: 400 }
      );
    }

    // ✅ Find session
    const sessions = await findSessionsByShop(shop);
    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: `No active session found for shop: ${shop}` },
        { status: 401 }
      );
    }

    const client = new shopify.clients.Graphql({ session: sessions[0] });

    // ✅ Include default query variable to match GraphQL schema
    const { data, errors } = await client.request<GetProductsQuery>(
      GET_PRODUCTS,
      {
        variables: { first: 100, query: "" } as GetProductsQueryVariables,
      }
    );

    if (errors) {
      return NextResponse.json({ error: errors }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { error: "No data returned from Shopify" },
        { status: 500 }
      );
    }

    /*
    const dbProducts = await Promise.all(
      data.products.nodes.map(async (p: any) => {
        return prisma.product.upsert({
          where: { shopifyId: p.id },
          update: {
            title: p.title,
            handle: p.handle,
            price: parseFloat(p.variants.edges[0]?.node?.price || 0),
            imageUrl: p.media?.edges[0]?.node?.image?.url || null,
            shop, 
          },
          create: {
            shopifyId: p.id,
            title: p.title,
            handle: p.handle,
            price: parseFloat(p.variants.edges[0]?.node?.price || 0),
            imageUrl: p.media?.edges[0]?.node?.image?.url || null,
            shop, 
          },
        });
      })
    );
    */

    // ✅ Just return products from Shopify directly
    return NextResponse.json({ products: data.products.nodes });
  } catch (error: any) {
    console.error("Error syncing products:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
