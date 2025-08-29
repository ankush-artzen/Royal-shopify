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
  Modal,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";

interface LineItem {
  productId: string;
  title: string;
  variantId: string;
  variantTitle?: string;
  designerId: string;
  royality: number;
  amount: number;
  quantity: number;
  unitPrice: number;
  royaltyCharges: number;
}

interface RoyaltyOrder {
  id: string;
  orderName: string;
  orderId: string;
  currency: string;
  createdAt?: string;
  calculatedroyaltyamount: Number;

  lineItem: LineItem[];
}

export default function RoyaltiesPage() {
  const [orders, setOrders] = useState<RoyaltyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shop, setShop] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<RoyaltyOrder | null>(null);
  const [totalRoyalty, setTotalRoyalty] = useState<number>(0);

  const app = useAppBridge();

  useEffect(() => {
    const shopFromConfig = app?.config?.shop;
    if (shopFromConfig) setShop(shopFromConfig);
    else setError("Unable to retrieve shop info. Please reload the app.");
  }, [app]);

  const storeName = shop?.replace(".myshopify.com", "");

  useEffect(() => {
    if (!shop) return;

    const fetchRoyalties = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/royality/orders?shop=${shop}`);
        if (!res.ok) throw new Error("Failed to fetch royalties");
        const data = await res.json();
        let uniqueOrdersMap = new Map<string, RoyaltyOrder>();
        (data.orders || []).forEach((order: RoyaltyOrder) => {
          if (!uniqueOrdersMap.has(order.orderId)) {
            uniqueOrdersMap.set(order.orderId, order);
          }
        });
        setOrders(Array.from(uniqueOrdersMap.values()));
        setTotalRoyalty(data.totalCalculatedRoyalty || 0);
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

  return (
    <Page title="Royalties Per Order">
      <Card>
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "32px",
            }}
          >
            <Spinner accessibilityLabel="Loading royalties" size="large" />
          </div>
        ) : error ? (
          <div style={{ padding: "32px", color: "red" }}>{error}</div>
        ) : orders.length === 0 ? (
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
              itemCount={orders.length + 1}
              selectable={false}
              headings={[
                { title: "Order ID" },
                { title: "Order Name" },
                { title: "Currency" },
                { title: "Royality Amount" },
                { title: "Created At" },
              ]}
            >
              {orders.map((item, index) => (
                <IndexTable.Row
                  id={item.orderId}
                  key={item.orderId}
                  position={index}
                >
                  {/* Order ID */}
                  <IndexTable.Cell>
                    <Text as="h2" fontWeight="medium">
                      <a
                        href={`https://admin.shopify.com/store/${storeName}/orders/${item.orderId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {item.orderId}
                      </a>
                    </Text>
                  </IndexTable.Cell>

                  {/* Order Name */}
                  <IndexTable.Cell>
                    <Text as="h2" fontWeight="medium">
                      {item.orderName}
                    </Text>
                  </IndexTable.Cell>

                  {/* Currency */}
                  <IndexTable.Cell>
                    {renderCurrencyBadge(item.currency)}
                  </IndexTable.Cell>

                  {/* Royality Amount */}
                  <IndexTable.Cell>
                    <Text as="span" fontWeight="medium">
                      {item.calculatedroyaltyamount.toFixed(2)}
                    </Text>
                  </IndexTable.Cell>

                  {/* Created At */}
                  <IndexTable.Cell>
                    <Text as="h2" fontWeight="medium">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : "-"}
                    </Text>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}

              {/* TOTAL ROW */}
              <IndexTable.Row
                id="total-row"
                key="total-row"
                position={orders.length}
              >
                {/* Merge first 3 cells */}
                <IndexTable.Cell colSpan={3}>
                  <Text as="h2" fontWeight="bold">
                    TOTAL
                  </Text>
                </IndexTable.Cell>

                {/* Total Royality */}
                <IndexTable.Cell>
                  <Text as="span" fontWeight="bold">
                    {totalRoyalty.toFixed(2)}
                  </Text>
                </IndexTable.Cell>

                {/* Empty last cell */}
                <IndexTable.Cell></IndexTable.Cell>
              </IndexTable.Row>
            </IndexTable>
          </div>
        )}

        {/* Modal for selected order */}
        {selectedOrder && (
          <Modal
            open={!!selectedOrder}
            onClose={() => setSelectedOrder(null)}
            title={`Order ${selectedOrder.orderName}`}
            primaryAction={{
              content: "Close",
              onAction: () => setSelectedOrder(null),
            }}
          >
            <Modal.Section>
              {selectedOrder.lineItem.map((li, idx) => (
                <div key={idx}>
                  <Text as="p">Product: {li.title}</Text>
                  <Text as="p">
                    Amount: {li.amount.toFixed(2)} {selectedOrder.currency}
                  </Text>
                  <Text as="p">Royalty %: {li.royality.toFixed(2)}</Text>
                  <hr className="my-2" />
                </div>
              ))}
            </Modal.Section>
          </Modal>
        )}
      </Card>
    </Page>
  );
}
