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
  Button,
  Tooltip,
  Modal,
} from "@shopify/polaris";
import { useRouter } from "next/navigation";

import ProductForm from "../../components/model";

interface Product {
  id: string;
  title: string;
  slug: string;
  image?: string;
  royaltyCharges: number;
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const router = useRouter();

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/royal/products`);
      if (!res.ok) throw new Error("Failed to fetch products");

      const data: Product[] = await res.json();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <Page
      title="Royal Products"
    >
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
            action={{ content: "Add product", url: "/products/create" }}
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
              { title: "Image" },
              { title: "Title" },
              { title: "Slug" },
              { title: "Royalty" },
              { title: "Actions" },
            ]}
          >
            {products.map((product, index) => (
              <IndexTable.Row
                id={product.slug}
                key={product.slug}
                position={index}
              >
                <IndexTable.Cell>
                  <Thumbnail
                    source={
                      product.image ||
                      "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png"
                    }
                    alt={product.title}
                  />
                </IndexTable.Cell>

                <IndexTable.Cell>
                  <Text as="span" fontWeight="bold">
                    {product.title}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>{product.slug}</IndexTable.Cell>
                <IndexTable.Cell>{product.royaltyCharges}%</IndexTable.Cell>

                <IndexTable.Cell>
                  <div className="flex gap-4">
                    <Tooltip content="Edit">
                      <Button
                        size="slim"
                        onClick={() => setEditingSlug(product.slug)}
                      >
                        Add Product
                      </Button>
                    </Tooltip>
                  </div>
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal
        open={!!editingSlug}
        onClose={() => setEditingSlug(null)}
        title="Add Product"
      >
        <Modal.Section>
          {editingSlug && (
            <ProductForm
              slug={editingSlug}
              onClose={() => setEditingSlug(null)}
              onSave={fetchProducts}
            />
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}
