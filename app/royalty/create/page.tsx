"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Autocomplete,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useRouter } from "next/navigation"; 


interface Product {
  id: string; // full GID
  title: string;
}

export default function AssignRoyalty() {
  const app = useAppBridge();
  const [shop, setShop] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedDesigner, setSelectedDesigner] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>(""); // numeric ID
  const [productQuery, setProductQuery] = useState<string>("");
  const [royalty, setRoyalty] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter(); 

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Get shop domain from App Bridge
  useEffect(() => {
    const shopFromConfig = (app as any)?.config?.shop;
    console.log("App Bridge shop:", shopFromConfig);
    if (shopFromConfig) setShop(shopFromConfig);
    else setMessage({ type: "error", text: "Unable to retrieve shop info" });
  }, [app]);

  // Fetch products
  useEffect(() => {
    if (!shop) return;

    async function fetchProducts() {
      try {
        const res = await fetch(`/api/products?shop=${shop}`);
        const data = await res.json();
        console.log("Products fetched:", data.products);
        setProducts(data.products || []);
      } catch (err) {
        console.error("Error fetching products:", err);
        setMessage({ type: "error", text: "Failed to fetch products" });
      }
    }

    fetchProducts();
  }, [shop]);

  // Filter products for Autocomplete
  const filteredProducts = useMemo(() => {
    if (!productQuery) return products;
    return products.filter((p) =>
      p.title.toLowerCase().includes(productQuery.toLowerCase())
    );
  }, [productQuery, products]);

  const productOptions = filteredProducts.map((p) => ({
    value: p.id,
    label: p.title,
  }));

  const handleSubmit = async () => {
    console.log("Submitting royalty:", {
      designer: selectedDesigner,
      product: selectedProduct,
      royalty,
    });

    if (!selectedDesigner || !selectedProduct || !royalty) {
      setMessage({ type: "error", text: "All fields are required" });
      return;
    }

    const numericRoyalty = parseFloat(royalty);
    if (isNaN(numericRoyalty) || numericRoyalty < 0 || numericRoyalty > 100) {
      setMessage({ type: "error", text: "Royalty must be 0-100" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/royality/create?shop=${shop}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designerId: selectedDesigner,
          productId: selectedProduct,
          Royality: numericRoyalty,
        }),
      });
      const data = await res.json();
      console.log("Royalty API response:", data);

    
      if (res.ok) {
        setMessage({ type: "success", text: "Royalty assigned successfully!" });
        setSelectedProduct("");
        setProductQuery("");
        setRoyalty("");
        
        router.push("/royalty");
      } else {
        setMessage({ type: "error", text: data.error || "Failed to assign royalty" });
      }
    } catch (err) {
      console.error("Network error:", err);
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Assign Royalty">
      <Card >
        {message && (
          <div
            style={{
              color: message.type === "success" ? "green" : "red",
              marginBottom: "1rem",
              fontWeight: 500,
            }}
          >
            {message.text}
          </div>
        )}
        <FormLayout>
          <TextField
            label="Designer ID"
            value={selectedDesigner}
            onChange={(value) => {
              console.log("Designer ID entered:", value);
              setSelectedDesigner(value);
            }}
            placeholder="Enter designer ID"
            autoComplete="off"
          />

          <Autocomplete
            options={productOptions}
            selected={selectedProduct ? [selectedProduct] : []}
            onSelect={(selected: string[]) => {
              const product = products.find((p) => p.id === selected[0]);
              if (product) {
                const numericId = product.id.split("/").pop() || "";
                console.log("Product selected:", product.title, "Numeric ID:", numericId);
                setSelectedProduct(numericId);
                setProductQuery(product.title);
              }
            }}
            textField={
              <Autocomplete.TextField
                label="Select Product"
                value={productQuery}
                onChange={(value) => {
                  console.log("Typing product query:", value);
                  setProductQuery(value);
                  setSelectedProduct(""); 
                }}
                placeholder="Search product by name"
                autoComplete="off"
              />
            }
          />

          <TextField
            type="number"
            label="Royalty Percentage"
            value={royalty}
            onChange={(value) => {
              console.log("Royalty entered:", value);
              setRoyalty(value);
            }}
            min={0}
            max={100}
            suffix="%"
            autoComplete="off"
          />

          <Button
            variant = "primary"
            onClick={handleSubmit}
            disabled={loading}
            loading={loading}
          >
            Assign Royalty
          </Button>
        </FormLayout>
      </Card>
    </Page>
  );
}
