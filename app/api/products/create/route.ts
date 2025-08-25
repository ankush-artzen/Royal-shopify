import { NextRequest, NextResponse } from "next/server";
import shopify from "@/lib/shopify/initialize-context";
import { findSessionsByShop } from "@/lib/db/session-storage";
import prisma from "@/lib/db/prisma-connect";

const CREATE_PRODUCT_MUTATION = `
mutation productCreate($input: ProductInput!) {
  productCreate(input: $input) {
    product {
      id
      title
      handle
      tags
    }
    userErrors {
      field
      message
    }
  }
}
`;

const CREATE_MEDIA_MUTATION = `
mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $productId, media: $media) {
    media {
      ... on MediaImage {
        image {
          id
          url
          altText
        }
      }
    }
    mediaUserErrors {
      field
      message
    }
  }
}
`;

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const shop = url.searchParams.get("shop");
    const body = await req.json();
    const { title, tags, media } = body;

    if (!shop || !title || !tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json({ error: "shop, title, and tags are required" }, { status: 400 });
    }

    if (!media || !Array.isArray(media) || media.length === 0) {
      return NextResponse.json({ error: "media (image) is required and must be an array" }, { status: 400 });
    }

    const sessions = await findSessionsByShop(shop);
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: "No active session for this shop" }, { status: 401 });
    }

    const client = new shopify.clients.Graphql({ session: sessions[0] });

    const processedTags = tags.map((t: string) => (t.startsWith("rp-") ? t : `rp-${t}`));

    // 1️⃣ Create Product on Shopify
    const productResponse = await client.query<{ data: any }>({
      data: {
        query: CREATE_PRODUCT_MUTATION,
        variables: { input: { title, tags: processedTags } },
      },
    });

    const productData = productResponse.body?.data?.productCreate;
    if (!productData) throw new Error("No product data returned from Shopify");
    if (productData.userErrors.length > 0) {
      return NextResponse.json({ error: productData.userErrors }, { status: 400 });
    }

    const productId = productData.product.id;

    // 2️⃣ Create Media on Shopify
    let mediaResults: any[] = [];
    if (Array.isArray(media) && media.length > 0) {
      const mediaResp = await client.query<{ data: any }>({
        data: {
          query: CREATE_MEDIA_MUTATION,
          variables: { productId, media },
        },
      });

      const mediaData = mediaResp.body?.data?.productCreateMedia;
      if (mediaData?.mediaUserErrors.length > 0) {
        console.warn("Media creation errors:", mediaData.mediaUserErrors);
      }

      mediaResults = mediaData.media
        .map((m: any) => m.image)
        .filter((img: any) => img && img.url);
    }

    // 3️⃣ Save Product to Prisma including shop
    const savedProduct = await prisma.shopifyProduct.create({
      data: {
        shop,                     
        shopifyId: productData.product.id,
        title: productData.product.title,
        handle: productData.product.handle,
        tags: processedTags,     
        media: mediaResults,    
      },
    });

    return NextResponse.json({ product: savedProduct });

  } catch (err: any) {
    console.error("POST error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
