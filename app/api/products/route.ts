import { NextResponse } from "next/server";
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { error: "Missing shop parameter" },
        { status: 400 },
      );
    }

    // Get session for shop
    const sessions = await findSessionsByShop(shop);
    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: `No active session found for shop: ${shop}` },
        { status: 401 },
      );
    }

    const client = new shopify.clients.Graphql({ session: sessions[0] });

    const { data, errors } = await client.request<GetProductsQuery>(
      GET_PRODUCTS,
      {
        variables: {
          first: 10,
          query: 'tag:"rp-*"',
        } as GetProductsQueryVariables,
      },
    );
    

    if (errors) {
      return NextResponse.json({ error: errors }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { error: "No data returned from Shopify" },
        { status: 500 },
      );
    }

    const products = data.products.nodes.map((product: any) => ({
      ...product,
      variants: product.variants.edges.map((edge: any) => edge.node),
      imageUrl:
        product.media?.edges?.[0]?.node?.image?.url ||
        "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png",
    }));

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("Error in /api/products:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
} 