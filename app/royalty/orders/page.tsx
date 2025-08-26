"use client";

import { useEffect, useState } from "react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Spinner,
  EmptyState,
  Badge,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";

interface RoyaltyTransaction {
  orderId: string;
  orderName: string;
  currency: string;
  _sum: {
    amount: number | null;
    Royality: number | null;
  };
}

export default function RoyaltiesPage() {
  const [royalties, setRoyalties] = useState<RoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shop, setShop] = useState<string | null>(null);
  const app = useAppBridge();

  useEffect(() => {
    const shopFromConfig = app?.config?.shop;
    if (shopFromConfig) setShop(shopFromConfig);
    else setError("Unable to retrieve shop info. Please reload the app.");
  }, [app]);

  useEffect(() => {
    if (!shop) return;

    const fetchRoyalties = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/royality/orders?shop=${shop}`);
        if (!res.ok) throw new Error("Failed to fetch royalties");

        const data = await res.json();
        setRoyalties(data.data || []);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchRoyalties();
  }, [shop]);

  const renderCurrencyBadge = (currency: string) => (
    <Badge size="medium" tone="info">
      {currency}
    </Badge>
  );

  const formatNumber = (num: number) =>
    num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Totals
  const totalAmount = royalties.reduce(
    (sum, r) => sum + (r._sum.amount ?? 0),
    0
  );
  const totalRoyalty = royalties.reduce(
    (sum, r) => sum + (r._sum.Royality ?? 0),
    0
  );

  // Determine currency for totals row
  const totalCurrency =
    royalties.length === 0
      ? "-"
      : royalties.every((r) => r.currency === royalties[0].currency)
      ? royalties[0].currency
      : "Multiple";

  return (
    <Page title="Royalties Per Order">
      <Card>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}>
            <Spinner accessibilityLabel="Loading royalties" size="large" />
          </div>
        ) : error ? (
          <div style={{ padding: "32px", color: "red" }}>{error}</div>
        ) : royalties.length === 0 ? (
          <EmptyState
            heading="No royalty transactions found"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>No royalty transactions were recorded yet.</p>
          </EmptyState>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <IndexTable
              resourceName={{ singular: "royalty", plural: "royalties" }}
              itemCount={royalties.length}
              selectable={false}
              headings={[
                { title: "Order Name" },
                { title: "Royalty-Amount" },
                { title: "Royalty" },
                { title: "Currency" },
              ]}
            >
              {royalties.map((royalty, index) => (
                <IndexTable.Row id={royalty.orderId} key={royalty.orderId} position={index}>
                  <IndexTable.Cell>
                    <div style={{ backgroundColor: index % 2 === 0 ? "#f9fafb" : "transparent", padding: "4px" }}>
                      <Text as="h2" fontWeight="medium">{royalty.orderName}</Text>
                    </div>
                  </IndexTable.Cell>

                  <IndexTable.Cell>
                    <div style={{ backgroundColor: index % 2 === 0 ? "#f9fafb" : "transparent", padding: "4px" }}>
                      <Text as="h2">${formatNumber(royalty._sum.amount ?? 0)}</Text>
                    </div>
                  </IndexTable.Cell>

                  <IndexTable.Cell>
                    <div style={{ backgroundColor: index % 2 === 0 ? "#f9fafb" : "transparent", padding: "4px" }}>
                      <Text as="h2">${formatNumber(royalty._sum.Royality ?? 0)}</Text>
                    </div>
                  </IndexTable.Cell>

                  <IndexTable.Cell>
                    <div style={{ backgroundColor: index % 2 === 0 ? "#f9fafb" : "transparent", padding: "4px" }}>
                      {renderCurrencyBadge(royalty.currency)}
                    </div>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}

              {/* Totals row */}
              <IndexTable.Row id="totals" position={royalties.length}>
                <IndexTable.Cell>
                  <div style={{ backgroundColor: "#f3f4f6", padding: "8px" }}>
                    <Text as="h2" fontWeight="bold">Total</Text>
                  </div>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <div style={{ backgroundColor: "#f3f4f6", padding: "8px" }}>
                    <Text as="h2" fontWeight="bold">${formatNumber(totalAmount)}</Text>
                  </div>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <div style={{ backgroundColor: "#f3f4f6", padding: "8px" }}>
                    <Text as="h2" fontWeight="bold">${formatNumber(totalRoyalty)}</Text>
                  </div>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <div style={{ backgroundColor: "#f3f4f6", padding: "8px" }}>
                    {totalCurrency !== "-" ? renderCurrencyBadge(totalCurrency) : "-"}
                  </div>
                </IndexTable.Cell>
              </IndexTable.Row>
            </IndexTable>
          </div>
        )}
      </Card>
    </Page>
  );
}
