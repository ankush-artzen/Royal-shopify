"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Form,
  FormLayout,
  TextField,
  Banner,
  Box,
  Button,
  InlineStack,
} from "@shopify/polaris";
import { useRouter } from "next/navigation";

interface FormData {
  title: string;
  royaltyCharges: string;
  image: string;
}

interface ProductFormProps {
  slug: string;
  onClose: () => void;
  onSave?: () => Promise<void>;
}

export default function ProductForm({ slug, onClose }: ProductFormProps) {
  const [formData, setFormData] = useState<FormData>({
    title: "",
    royaltyCharges: "",
    image: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch product by slug
  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/royal/products/${slug}`);
        if (!res.ok) throw new Error("Failed to fetch product");
        const data = await res.json();
        setFormData({
          title: data.title || "",
          royaltyCharges: data.royaltyCharges?.toString() || "",
          image: data.image || "",
        });
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  if (loading) return <p>Loading...</p>;

  return (
    <Card>
      <Form onSubmit={() => {}}>
        <FormLayout>
          {error && <Banner tone="critical">{error}</Banner>}

          <TextField
            label="Title"
            value={formData.title}
            readOnly
            autoComplete="off"
          />

          <TextField
            label="Royalty Charges"
            value={formData.royaltyCharges}
            readOnly
            autoComplete="off"
          />

          {formData.image && (
            <Box paddingBlock="400">
              <div
                style={{
                  width: "100%",
                  height: "300px",
                  backgroundImage: `url(${formData.image})`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  borderRadius: "8px",
                }}
              />
            </Box>
          )}

          <InlineStack gap="400" align="start">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                router.push(`/products/create?slug=${slug}`);
              }}
            >
              Proceed
            </Button>
          </InlineStack>
        </FormLayout>
      </Form>
    </Card>
  );
}
