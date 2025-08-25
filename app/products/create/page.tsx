"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Card,
  Form,
  FormLayout,
  Page,
  TextField,
  Banner,
  Spinner,
  Box,
  Text,
} from "@shopify/polaris";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppBridge } from "@shopify/app-bridge-react";

interface FormData {
  title: string;
  tags: string;
  mediaAlt: string;
  mediaUrl: string;
}

export default function ProductCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");

  const app = useAppBridge();

  const [formData, setFormData] = useState<FormData>({
    title: "",
    tags: "",
    mediaAlt: "",
    mediaUrl: "",
  });

  const [shop, setShop] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefillLoading, setPrefillLoading] = useState(!!slug);

  // Get shop domain
  useEffect(() => {
    const shopFromConfig = app?.config?.shop;
    if (shopFromConfig) setShop(shopFromConfig);
    else setError("Unable to retrieve shop info. Please reload the app.");
  }, [app]);

  // Prefill data if slug exists
  useEffect(() => {
    if (!slug) return;

    const fetchPrefill = async () => {
      try {
        setPrefillLoading(true);
        const res = await fetch(`/api/royal/products/${slug}`);
        if (!res.ok) throw new Error("Failed to fetch product");

        const data = await res.json();

        setFormData({
          title: data.title || "",
          tags: data.slug || "",
          mediaAlt: data.mediaAlt || "",
          mediaUrl: data.image || "",
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setPrefillLoading(false);
      }
    };

    fetchPrefill();
  }, [slug]);

  // Handle input change
  const handleChange = (field: keyof FormData) => (value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  // Submit
  const handleSubmit = async () => {
    if (!shop) {
      setError("Shop info is missing, cannot create product.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const body = {
        title: formData.title,
        tags: formData.tags.split(",").map((t) => t.trim()),
        media: formData.mediaUrl
          ? [
              {
                mediaContentType: "IMAGE",
                originalSource: formData.mediaUrl,
                alt: formData.mediaAlt || null,
              },
            ]
          : [],
      };

      const res = await fetch(`/api/products/create?shop=${shop}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create product");

      router.push("/products");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page
    fullWidth
    title="Back"
    backAction={{
      content: "Back",
      onAction: () => router.back(),
    }}
  >
      <Card>
        {prefillLoading ? (
          <Spinner accessibilityLabel="Loading product data" size="large" />
        ) : (
          <Form onSubmit={handleSubmit}>
            <FormLayout>
              {error && (
                <Banner tone="critical" title="Error">
                  {error}
                </Banner>
              )}

              {/* Only visible field */}
              <TextField
                label="Title"
                value={formData.title}
                onChange={handleChange("title")}
                autoComplete="off"
              />

              {/* Product Design Preview */}
              <Text variant="headingMd" as="h3">
                Product Design
              </Text>
              {formData.mediaUrl && (
                <Box paddingBlock="400">
                  <div
                    style={{
                      width: "100%",
                      height: "300px",
                      backgroundImage: `url(${formData.mediaUrl})`,
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                      borderRadius: "8px",
                    }}
                  />
                </Box>
              )}

              <Button variant="primary" submit loading={loading}>
                Create Product
              </Button>
            </FormLayout>
          </Form>
        )}
      </Card>
    </Page>
  );
}
