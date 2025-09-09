"use client";

import { useState, useEffect } from "react";
import {
  Page,
  Card,
  Banner,
  Text,
  Button,
  Toast,
  BlockStack,
  InlineStack,
  Layout,
  Spinner,
  Frame,
} from "@shopify/polaris";
import { useRouter } from "next/navigation";
import { useAppBridge } from "@shopify/app-bridge-react";

import { ROYALTY_PLAN } from "@/lib/config/royaltyConfig";

export default function HomePage() {
  const router = useRouter();
  const app = useAppBridge();

  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<string | null>(null);
  const [productCount, setProductCount] = useState<number>(0);
  const [totalRoyaltyAmount, setTotalRoyaltyAmount] = useState<number>(0);
  const [totalOrders, setTotalOrders] = useState<number>(0);

  const [error, setError] = useState<string | null>(null);
  const [toastActive, setToastActive] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);
  const [billingApproved, setBillingApproved] = useState(false);
  const [checkingBilling, setCheckingBilling] = useState(true);

  // Get shop from App Bridge
  useEffect(() => {
    const shopFromConfig = (app as any)?.config?.shop;
    if (shopFromConfig) setShop(shopFromConfig);
    else {
      setError("Unable to retrieve shop info from App Bridge config");
      setLoading(false);
    }
  }, [app]);

  // Fetch product/royalty stats
  useEffect(() => {
    if (!shop) return;

    async function fetchData() {
      try {
        const resCounts = await fetch(`/api/royality/counts?shop=${shop}`);
        const dataCounts = await resCounts.json();
        if (resCounts.ok) setProductCount(dataCounts.totalProducts || 0);
        else setError(dataCounts.error || "Failed fetching counts");

        const resTotals = await fetch(
          `/api/royality/orders/counts?shop=${shop}`,
        );
        const dataTotals = await resTotals.json();
        if (resTotals.ok) {
          setTotalRoyaltyAmount(dataTotals.totalRoyaltyAmount || 0);
          setTotalOrders(dataTotals.totalOrders || 0);
        } else setError(dataTotals.error || "Failed fetching totals");
      } catch (err) {
        setError("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [shop]);

  // Using config here
  const startRoyaltyPlan = async () => {
    if (!shop) return setPlanError("Shop info missing");

    setCreatingPlan(true);
    setPlanError(null);

    try {
      const res = await fetch("/api/charges/billing/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ROYALTY_PLAN,
          shop,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to create plan");

      const url = data.confirmationUrl || data.confirmation_url;
      if (!url) throw new Error("No confirmation URL returned from Shopify");

      window.open(url, "_blank");
      setConfirmationUrl(url);
    } catch (err: any) {
      setPlanError(err.message || "Unexpected error occurred");
    } finally {
      setCreatingPlan(false);
    }
  };
  useEffect(() => {
    if (!shop) return;

    async function checkBilling() {
      setCheckingBilling(true);
      try {
        const res = await fetch(`/api/charges/status?shop=${shop}`);
        const data = await res.json();
        console.log("Billing status:", data);

        if (res.ok && data.active) {
          setBillingApproved(true);
        }
      } catch (err) {
        console.error("Error checking billing status:", err);
      } finally {
        setCheckingBilling(false);
      }
    }

    checkBilling();
  }, [shop]);

  console.log("HomePage render:", {
    shop,
    productCount,
    totalRoyaltyAmount,
    totalOrders,
    loading,
    creatingPlan,
    error,
    planError,
    confirmationUrl,
  });

  return (
    <Frame>
      <Page
        title="Royalty Billing"
        backAction={{ content: "Back", onAction: () => router.back() }}
      >
        <Layout.Section>
          <Card>
            <Banner title="Royalty payments" tone="info">
              <Text as="p">
                Track and distribute royalties to your designers automatically.
              </Text>
              <Text as="p" tone="subdued">
                First You have to Enable Royalty Billing , to pay total royality
                amount, Then you can pay usage charges for royalties.
              </Text>
            </Banner>
            <br />
            <Button
              variant="primary"
              disabled={
                loading || creatingPlan || checkingBilling || billingApproved
              }
              loading={creatingPlan || checkingBilling}
              onClick={startRoyaltyPlan}
            >
              {billingApproved
                ? "Billing Enabled"
                : checkingBilling
                  ? "Checking Billing..."
                  : "Enable Royalty Billing"}
            </Button>
          </Card>
        </Layout.Section>

        {/* Quick Stats */}
        <Layout.Section>
          <Card >
            <InlineStack align="center">
              <BlockStack>
                {loading ? (
                  <Spinner size="small" />
                ) : (
                  <Text as="h2" fontWeight="bold" tone="success" variant="bodySm">
                    Automatically calculate and charge usage-based royalties
                    Keep your royalty payments up to date without manual
                    tracking.you can also check transaction data also after order
                  </Text>
                )}
              </BlockStack>
            </InlineStack>
          </Card>
        </Layout.Section>

        {(error || planError) && (
          <Layout.Section>
            <Banner title="Error" tone="critical">
              <p>{error || planError}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Royalty Overview
              </Text>
              <InlineStack align="space-between" blockAlign="center">
                <Text as="p" variant="bodyLg">
                  Total Amount: <b>{totalRoyaltyAmount.toFixed(2)}</b>
                </Text>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Toast */}
        {toastActive && (
          <Toast
            content="Royalty marked as paid!"
            onDismiss={() => setToastActive(false)}
          />
        )}
      </Page>
    </Frame>
  );
}
