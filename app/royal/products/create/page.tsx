"use client";

import { useState } from "react";
import {
  Page,
  Card,
  Form,
  FormLayout,
  TextField,
  Button,
  Banner,
  Spinner,
  Text,
} from "@shopify/polaris";
import { useRouter } from "next/navigation";

export default function CreateRoyalProduct() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [image, setImage] = useState("");
  const [royaltyCharges, setRoyaltyCharges] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    // Basic validation
    if (!title || !slug || royaltyCharges === "") {
      setError("Title, slug, and royalty charges are required");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/royal-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          image,
          royaltyCharges: parseFloat(royaltyCharges),
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setSuccess("Product created successfully!");
      setTitle("");
      setSlug("");
      setImage("");
      setRoyaltyCharges("");
      setStatus("active");
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
      {" "}
      <Card>
        <Form onSubmit={handleSubmit}>
          <FormLayout>
            {error && <Banner tone="critical">{error}</Banner>}
            {success && <Banner tone="success">{success}</Banner>}

            <TextField
              label="Title"
              value={title}
              onChange={setTitle}
              autoComplete="off"
            />
            <TextField
              label="Slug"
              value={slug}
              onChange={setSlug}
              autoComplete="off"
            />
            <TextField
              label="Image URL"
              value={image}
              onChange={setImage}
              autoComplete="off"
            />
            <TextField
              label="Royalty Charges"
              value={royaltyCharges}
              onChange={setRoyaltyCharges}
              type="number"
              autoComplete="off"
            />
            <TextField
              label="Status"
              value={status}
              onChange={setStatus}
              placeholder="active / inactive"
              autoComplete="off"
            />

            <Button variant="primary" submit loading={loading}>
              Create Product
            </Button>
          </FormLayout>
        </Form>
      </Card>
    </Page>
  );
}
