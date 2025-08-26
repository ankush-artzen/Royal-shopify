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
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  productName: string;
  slug: string;
  picture?: string;
  shop: string;
  createdAt: string;
  price?: string;
  variantId?: string;
  status?: "Active" | "Draft" | "Archived";
}

interface ApiResponse {
  products: any[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const app = useAppBridge();
  const [shop, setShop] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const shopFromConfig = app?.config?.shop;
    if (shopFromConfig) setShop(shopFromConfig);
    else setError("Unable to retrieve shop info. Please reload the app.");
  }, [app]);

  useEffect(() => {
    if (!shop) return;

    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/products?shop=${shop}`);
        if (!res.ok) throw new Error("Failed to fetch products");

        const data: ApiResponse = await res.json();

        const transformedProducts: Product[] = data.products.map((p: any) => {
          const firstVariant = p.variants?.[0];
          let status: Product["status"] = "Draft";
          if (p.status === "ACTIVE") status = "Active";
          else if (p.status === "ARCHIVED") status = "Archived";

          const picture = p.media?.edges?.[0]?.node?.image?.url;
          return {
            id: p.id,
            productName: p.title,
            slug: p.handle || "",
            picture,
            shop: shop,
            createdAt: p.createdAt || new Date().toISOString(),
            price: firstVariant?.price?.toString() || "",
            variantId: firstVariant?.id || "",
            status,
          };
        });

        setProducts(transformedProducts);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [shop]);

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case "Active":
        return <Badge tone="success">Active</Badge>;
      case "Archived":
        return <Badge tone="attention">Archived</Badge>;
      default:
        return <Badge tone="info">Draft</Badge>;
    }
  };

  return (
    <Page title="Shopify Products">
      <Card>
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Spinner accessibilityLabel="Loading products" size="large" />
          </div>
        ) : error ? (
          <div className="p-8 text-red-600">{error}</div>
        ) : products.length === 0 ? (
          <EmptyState
            heading="No products found"
            action={{ content: "Add product", url: "/products/new" }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>You haven’t added any products yet. Start by creating one.</p>
          </EmptyState>
        ) : (
          <IndexTable
            resourceName={{ singular: "product", plural: "products" }}
            itemCount={products.length}
            selectable={false}
            headings={[
              { title: "Product" },
              { title: "Title" },
              { title: "Price" },
              { title: "Status" },
              { title: "Actions" },
            ]}
          >
            {products.map((product, index) => (
              <IndexTable.Row id={product.id} key={product.id} position={index}>
                <IndexTable.Cell>
                  <Thumbnail
                    source={
                      product.picture ||
                      "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png"
                    }
                    alt={product.productName}
                  />
                </IndexTable.Cell>

                <IndexTable.Cell>
                  <Text as="p" fontWeight="bold">
                    {product.productName}
                  </Text>
                </IndexTable.Cell>

                <IndexTable.Cell>
                  {product.price ? `$${product.price}` : "-"}
                </IndexTable.Cell>

                <IndexTable.Cell>
                  {renderStatusBadge(product.status)}
                </IndexTable.Cell>

                <IndexTable.Cell>
                  <div className="flex gap-4">
                    <Tooltip content="Add Royalty">
                      <Tooltip content="Add Royalty">
                        <Button
                          size="slim"
                          variant="primary"
                          onClick={() => {
                            router.push(
                              `/royalty/create`,
                            );
                          }}
                        >
                          Add Royalty
                        </Button>
                      </Tooltip>
                    </Tooltip>
                  </div>
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        )}
      </Card>
    </Page>
  );
}
