"use client";

import { useState, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Page,
  Card,
  Spinner,
  IndexTable,
  EmptyState,
  Badge,
  Icon,
  InlineStack,
  Text,
  Box,
} from "@shopify/polaris";
import { useRouter } from "next/navigation";
import { Tooltip } from "@shopify/polaris";

import { ChevronLeftIcon, ChevronRightIcon } from "@shopify/polaris-icons";

interface RoyaltyTransaction {
  id: string;
  shop: string;
  shopifyTransactionChargeId: string;
  orderId: string;
  productId?: string; // ✅ Add productId
  description: string;
  price: number;
  currency: string;
  balanceUsed: number;
  balanceRemaining: number;
  royaltypercentage: number;
  designerId: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  transactions: RoyaltyTransaction[];
  count: number;
  page: number;
  totalPages: number;
}

export default function RoyaltyTransactionsPage() {
  const app = useAppBridge();

  const [shop, setShop] = useState("");
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState<RoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();

  // ✅ Detect shop from app config
  useEffect(() => {
    try {
      const shopFromConfig = (app as any)?.config?.shop;
      if (shopFromConfig) {
        setShop(shopFromConfig);
      } else {
        setError("Unable to retrieve shop info. Please reload the app.");
      }
    } catch {
      setError("Unable to retrieve shop info. Please reload the app.");
    }
  }, [app]);

  // ✅ Fetch transactions with pagination
  const fetchTransactions = async (pageNumber: number = 1) => {
    if (!shop) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/royality/orders/transaction?shop=${shop}&page=${pageNumber}&limit=${limit}`,
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data: ApiResponse = await res.json();

      setTransactions(data.transactions || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.error("❌ Error fetching transactions:", err);
      setError(err.message || "Failed to fetch transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Initial + paginated fetch
  useEffect(() => {
    if (shop) fetchTransactions(page);
  }, [shop, page]);

  // ✅ Pagination handlers
  const handlePrev = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNext = () => {
    if (page < totalPages) setPage(page + 1);
  };

  return (
    // <Page
    //   title="Royalty Transactions"
    //   backAction={{ content: "Back", onAction: () => router.back() }}
    //   // primaryAction={{
    //   //   content: "Orders Data",
    //   //   onAction: () => router.push("/royalty/orders/sold"),
    //   // }}
    // >
    <Page
      title="Royalty Transactions"
      backAction={{ content: "Back", onAction: () => router.back() }}
    >
      {" "}
      <Card>
        {error && <p style={{ color: "red", padding: "10px" }}>{error}</p>}

        {loading ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <Spinner accessibilityLabel="Loading transactions" size="large" />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            heading="No transactions found"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          ></EmptyState>
        ) : (
          <>
            <IndexTable
              resourceName={{
                singular: "transaction",
                plural: "transactions",
              }}
              itemCount={transactions.length}
              selectable={false}
              headings={[
                { title: "Transaction Charge ID" },
                { title: "Order ID" },
                { title: "Product ID" },
                { title: "Royality Price" },
                { title: "Royalty %" },
                { title: "Designer ID" },
                { title: "Description" },
                { title: "Created At" },
              ]}
            >
              {transactions.map((tx, index) => (
                <IndexTable.Row id={tx.id} key={tx.id} position={index}>
                  <InlineStack>
                    <IndexTable.Cell>
                      <span style={{ fontWeight: "bold" }}>
                        {tx.shopifyTransactionChargeId}
                      </span>
                    </IndexTable.Cell>
                  </InlineStack>
                  <IndexTable.Cell>{tx.orderId}</IndexTable.Cell>
                  <IndexTable.Cell>{tx.productId || "-"}</IndexTable.Cell>{" "}
                  {/* ✅ Render productId */}
                  <IndexTable.Cell>
                    {tx.price?.toFixed(2)} {tx.currency}
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {tx.royaltypercentage?.toFixed(2) ?? "-"}%
                  </IndexTable.Cell>
                  <IndexTable.Cell>{tx.designerId || "-"}</IndexTable.Cell>
                  <IndexTable.Cell>
                    <Tooltip content={tx.description || "No description"}>
                      <Box width="200px">
                        <Text as="span" truncate>
                          {tx.description || "-"}
                        </Text>
                      </Box>
                    </Tooltip>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {tx.createdAt
                      ? new Date(tx.createdAt).toLocaleString()
                      : "-"}
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-6 py-4">
              <button
                disabled={page <= 1}
                onClick={handlePrev}
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
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 
                 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Icon source={ChevronRightIcon} tone="base" />
              </button>
            </div>
          </>
        )}
      </Card>
    </Page>
  );
}
