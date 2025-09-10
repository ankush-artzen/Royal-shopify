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
  Box,
  Divider,
  Badge,
  List,
} from "@shopify/polaris";
import { useRouter } from "next/navigation";
import { useAppBridge } from "@shopify/app-bridge-react";

import { ROYALTY_PLAN } from "@/lib/config/royaltyConfig";

export default function HomePage() {
  const router = useRouter();
  const app = useAppBridge();

  const [shop, setShop] = useState<string | null>(null);

  // Billing
  const [billingApproved, setBillingApproved] = useState(false);
  const [billingLoading, setBillingLoading] = useState(true);

  // Plan creation
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);

  // Error + Toast
  const [error, setError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [toastActive, setToastActive] = useState(false);

  // Get shop from App Bridge
  useEffect(() => {
    const shopFromConfig = (app as any)?.config?.shop;
    if (shopFromConfig) setShop(shopFromConfig);
    else setError("Unable to retrieve shop info from App Bridge config");
  }, [app]);

  // Check billing status
  useEffect(() => {
    if (!shop) return;
    async function checkBilling() {
      setBillingLoading(true);
      try {
        const res = await fetch(`/api/charges/status?shop=${shop}`);
        const data = await res.json();
        if (res.ok && data.active) setBillingApproved(true);
      } catch (err) {
        console.error("Error checking billing:", err);
      } finally {
        setBillingLoading(false);
      }
    }
    checkBilling();
  }, [shop]);

  // Start plan
  const startRoyaltyPlan = async () => {
    if (!shop) return setPlanError("Shop info missing");
    setCreatingPlan(true);
    setPlanError(null);
    try {
      const res = await fetch("/api/charges/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ROYALTY_PLAN, shop }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create plan");
      const url = data.confirmationUrl || data.confirmation_url;
      if (!url) throw new Error("No confirmation URL returned");
      window.open(url, "_blank");
      setConfirmationUrl(url);
    } catch (err: any) {
      setPlanError(err.message || "Unexpected error");
    } finally {
      setCreatingPlan(false);
    }
  };

  return (
    <Frame>
      <Page
        title="Royalty Billing"
        subtitle="Track and distribute royalties to your designers"
        backAction={{ content: "Back", onAction: () => router.back() }}
      >
        <Layout>
          {/* Welcome Banner */}
          <Layout.Section>
            {billingLoading ? (
              <Banner title="Royalty Payments" tone="info">
                <BlockStack gap="300" align="center">
                  <Spinner
                    accessibilityLabel="Checking billing status"
                    size="small"
                  />
                  <Text as="p">Checking billing status...</Text>
                </BlockStack>
              </Banner>
            ) : (
              <Banner
                title="Royalty Payments"
                tone={billingApproved ? "info" : "critical"}
              >
                <BlockStack gap="300">
                  <Text as="p">
                    Royalty billing allows you to automatically calculate and
                    charge usage-based royalties.
                  </Text>

                  <List>
                    <List.Item>
                      Keep royalty payments up to date without manual tracking
                    </List.Item>
                    <List.Item>
                      View transaction data after orders are placed
                    </List.Item>
                    <List.Item>
                      Automatically distribute payments to designers
                    </List.Item>
                  </List>

                  <InlineStack align="start">
                    <Button
                      variant="primary"
                      disabled={
                        creatingPlan || billingLoading || billingApproved
                      }
                      loading={creatingPlan}
                      onClick={startRoyaltyPlan}
                    >
                      {billingApproved
                        ? "Billing Enabled"
                        : "Enable Royalty Billing"}
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Banner>
            )}
          </Layout.Section>

          {/* Billing Status Card */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Royalty Billing Status
                  </Text>
                  {billingLoading ? (
                    <Spinner
                      accessibilityLabel="Checking billing"
                      size="small"
                    />
                  ) : (
                    <Badge
                      tone={billingApproved ? "success" : "attention"}
                      size="large"
                    >
                      {billingApproved ? "Active" : "Inactive"}
                    </Badge>
                  )}
                </InlineStack>
                <Text as="p">
                  Automatically track and distribute royalties to your
                  designers.
                </Text>
                <Text as="p" tone="subdued">
                  In Royalty billing you can pay total royalty amounts with
                  order, Also check the transaction data .
                </Text>

                <Divider />
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Quick Actions */}

          {/* Error Display */}
          {(error || planError) && (
            <Layout.Section>
              <Banner title="Error" tone="critical">
                <p>{error || planError}</p>
              </Banner>
            </Layout.Section>
          )}
        </Layout>

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
