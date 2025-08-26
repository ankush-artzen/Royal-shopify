"use client";

import { useEffect, useState } from "react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Thumbnail,
  Spinner,
  EmptyState,
  Badge,
  Button,
  Tooltip,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";

interface Product {
  id: string;
  title: string;
  handle: string;
  price?: number;
  imageUrl?: string;
}

interface Royalty {
  id: string;
  Royality: number;
  product: Product;
}

interface ApiResponse {
  royalties: Royalty[];
}

export default function RoyaltiesPage() {
  const app = useAppBridge();
  const [shop, setShop] = useState<string | null>(null);
  const [royalties, setRoyalties] = useState<Royalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get shop info from app bridge
  useEffect(() => {
    const shopFromConfig = app?.config?.shop;
    if (shopFromConfig) setShop(shopFromConfig);
    else setError("Unable to retrieve shop info. Please reload the app.");
  }, [app]);

  // Fetch royalties
  useEffect(() => {
    if (!shop) return;

    const fetchRoyalties = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/royality?shop=${shop}`);
        if (!res.ok) throw new Error("Failed to fetch royalties");

        const data: ApiResponse = await res.json();
        setRoyalties(data.royalties || []);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchRoyalties();
  }, [shop]);

  return (
    <Page title="Product Royalties">
      <Card>
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Spinner accessibilityLabel="Loading royalties" size="large" />
          </div>
        ) : error ? (
          <div className="p-8 text-red-600">{error}</div>
        ) : royalties.length === 0 ? (
          <EmptyState
            heading="No royalties assigned yet"
            action={{ content: "Assign Royalty", url: "/royalties/new" }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>You haven’t assigned any royalties yet. Start by linking a designer to a product.</p>
          </EmptyState>
        ) : (
          <IndexTable
            resourceName={{ singular: "royalty", plural: "royalties" }}
            itemCount={royalties.length}
            selectable={false}
            headings={[
              { title: "Product" },
              { title: "Royalty %" },
              { title: "Price" },
              { title: "Actions" },
            ]}
          >
            {royalties.map((royalty, index) => {
              const product = royalty.product;
              const productId = product.id.includes("gid://")
                ? product.id.split("/").pop()
                : product.id;

              return (
                <IndexTable.Row id={royalty.id} key={royalty.id} position={index}>
                  {/* Product Thumbnail + Name */}
                  <IndexTable.Cell>
                    <div className="flex items-center gap-3">
                      <Thumbnail
                        source={
                          product.imageUrl ||
                          "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png"
                        }
                        alt={product.title}
                      />
                      <Text as="p" fontWeight="bold">
                        {product.title}
                      </Text>
                    </div>
                  </IndexTable.Cell>

                  {/* Royalty % */}
                  <IndexTable.Cell>
                    <Badge tone="success">{`${royalty.Royality}%`}</Badge>
                  </IndexTable.Cell>

                  {/* Price */}
                  <IndexTable.Cell>
                    ${product.price?.toFixed(2) || "—"}
                  </IndexTable.Cell>

                  {/* Actions */}
                  <IndexTable.Cell>
                    <Tooltip content="View Product in Shopify Admin">
                      <Button
                        size="slim"
                        onClick={() => {
                          if (!shop || !productId) return;
                          const storeHandle = shop.replace(".myshopify.com", "");
                          const shopifyAdminUrl = `https://admin.shopify.com/store/${storeHandle}/products/${productId}`;
                          window.open(shopifyAdminUrl, "_blank");
                        }}
                      >
                        View
                      </Button>
                    </Tooltip>
                  </IndexTable.Cell>
                </IndexTable.Row>
              );
            })}
          </IndexTable>
        )}
      </Card>
    </Page>
  );
}
