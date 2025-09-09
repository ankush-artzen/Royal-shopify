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
  BlockStack,
  InlineStack,
  List,
  Divider,
  Box,
  Button,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Icon } from "@shopify/polaris";
import { ChevronLeftIcon, ChevronRightIcon } from "@shopify/polaris-icons";
import { useRouter } from "next/navigation";
import OrderModal from "@/app/components/RoyaltyOrderModal";

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
  calculatedroyaltyamount: number;
  lineItem: LineItem[];
}

export default function RoyaltiesPage() {
  const [orders, setOrders] = useState<RoyaltyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shop, setShop] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<RoyaltyOrder | null>(null);
  const [totalRoyalty, setTotalRoyalty] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10); // Items per page
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [modalActive, setModalActive] = useState<boolean>(false);

  const app = useAppBridge();
  const router = useRouter();

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
        const res = await fetch(
          `/api/royality/orders?shop=${shop}&page=${page}&limit=${limit}`,
        );
        if (!res.ok) throw new Error("Failed to fetch royalties");
        const data = await res.json();

        setOrders(data.orders || []);
        setTotalRoyalty(data.totalCalculatedRoyalty || 0);
        setTotalOrders(data.totalOrders || 0);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchRoyalties();
  }, [shop, page, limit]);

  const totalPages = Math.ceil(totalOrders / limit);

  return (
    <Page
      title="Royalties Per Order"
      backAction={{ content: "Back", onAction: () => router.back() }}
      secondaryActions={[
        {
          content: "Order Data",
          onAction: () => router.push("/royalty/orders/sold"),
        },
      ]}
    >
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
          <>
            <div style={{ overflowX: "auto" }}>
              <IndexTable
                resourceName={{ singular: "royalty", plural: "royalties" }}
                itemCount={orders.length + 1}
                selectable={false}
                headings={[
                  { title: "Order ID" },
                  { title: "Order Name" },
                  { title: "Royalty Amount" },
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
                          href={`/orders/${item.orderId}`}
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedOrder(item);
                            setModalActive(true);
                          }}
                          style={{
                            color: "blue",
                            textDecoration: "underline",
                            cursor: "pointer",
                          }}
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

                    {/* Royalty Amount */}
                    <IndexTable.Cell>
                      <Text as="span" fontWeight="medium">
                        {item.calculatedroyaltyamount.toFixed(2)}{" "}
                        {item.currency}
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
                  <IndexTable.Cell colSpan={2}>
                    <Text as="h2" fontWeight="bold">
                      TOTAL
                    </Text>
                  </IndexTable.Cell>

                  <IndexTable.Cell>
                    <Text as="span" fontWeight="bold">
                      {totalRoyalty.toFixed(2)}
                    </Text>
                  </IndexTable.Cell>

                  <IndexTable.Cell colSpan={2}></IndexTable.Cell>
                </IndexTable.Row>
              </IndexTable>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-center gap-6 py-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 
                hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Icon source={ChevronLeftIcon} tone="base" />
              </button>

              <span className="text-sm font-medium">
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, totalPages))
                }
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 
                hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Icon source={ChevronRightIcon} tone="base" />
              </button>
            </div>
          </>
        )}

        {/* Modal for selected order */}
        {selectedOrder && (
          <OrderModal
            order={selectedOrder}
            storeName={storeName || ""}
            active={modalActive}
            onClose={() => setModalActive(false)}
          />
        )}
      </Card>
    </Page>
  );
}
