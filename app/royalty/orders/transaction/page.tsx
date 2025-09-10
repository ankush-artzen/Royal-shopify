"use client";

import { useState, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Page, Text, Tooltip, Box } from "@shopify/polaris";
import { useRouter } from "next/navigation";
import CustomDataTable from "@/app/components/CustomDataTable";
import Pagination from "@/app/components/Pagination";

interface RoyaltyTransaction {
  id: string;
  shop: string;
  shopifyTransactionChargeId: string;
  orderId: string;
  productId?: string;
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
  const router = useRouter();

  const [shop, setShop] = useState("");
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState<RoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);

  // Detect shop
  useEffect(() => {
    try {
      const shopFromConfig = (app as any)?.config?.shop;
      if (shopFromConfig) setShop(shopFromConfig);
      else setError("Unable to retrieve shop info. Please reload the app.");
    } catch {
      setError("Unable to retrieve shop info. Please reload the app.");
    }
  }, [app]);

  // Fetch transactions
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
      setError(err.message || "Failed to fetch transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shop) fetchTransactions(page);
  }, [shop, page]);

  // Prepare rows for CustomDataTable
  const rows = transactions.map((tx) => [
    <Text as="span" fontWeight="bold" key={`${tx.id}-charge`}>
      {tx.shopifyTransactionChargeId}
    </Text>,
    tx.orderId,
    tx.productId || "-",
    `${tx.price.toFixed(2)} ${tx.currency}`,
    `${tx.royaltypercentage?.toFixed(2) ?? "-"}%`,
    tx.designerId || "-",
    <Tooltip content={tx.description || "No description"} key={`${tx.id}-desc`}>
      <Box maxWidth="120px">
        <Text as="span" truncate>
          {tx.description ? tx.description.slice(0, 12) : "-"}
        </Text>
      </Box>
    </Tooltip>,
    tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "-",
  ]);

  return (
    <Page
      title="Royalty Transactions"
      backAction={{ content: "Back", onAction: () => router.back() }}
    >
      <CustomDataTable
        columns={[
          "Transaction Charge ID",
          "Order ID",
          "Product ID",
          "Royalty Price",
          "Royalty %",
          "Designer ID",
          "Description",
          "Created At",
        ]}
        rows={rows}
        loading={loading}
        error={error}
        emptyStateMessage="No transactions found"
      />

      {/* Pagination */}
      {!loading && !error && transactions.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => page > 1 && setPage((prev) => prev - 1)}
          onNext={() => page < totalPages && setPage((prev) => prev + 1)}
        />
      )}
    </Page>
  );
}
