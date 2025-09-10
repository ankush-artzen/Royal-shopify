"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Page,
  Card,
  Filters,
  InlineStack,
  Text,
  Button,
  Tooltip,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useRouter } from "next/navigation";
import Pagination from "@/app/components/Pagination";

import { RefreshIcon, ExportIcon, SearchIcon } from "@shopify/polaris-icons";
import { exportRoyaltyCSV } from "@/app/components/analytics/CSVExporter";
import CustomDataTable from "@/app/components/CustomDataTable";

import type { ApiResponse, LineItemStat } from "@/app/components/analytics/RoyaltyTable";
import { ProductCell } from "@/app/components/analytics/RoyaltyTable";

const PAGE_SIZE = 10;
const FALLBACK_IMAGE =
  "https://cdn.shopify.com/s/files/1/0533/2089/files/emptystate-files.png";

export default function ProductRoyaltyFromOrdersPage() {
  const app = useAppBridge();
  const router = useRouter();

  const [shop, setShop] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<ApiResponse | null>(null);

  const [queryValue, setQueryValue] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<any[]>([]);
  const [sortKey, setSortKey] =
    useState<keyof ApiResponse["products"][0]>("totalRoyalty");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const formatCurrency = useCallback(
    (value: number, currency?: string | null) =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 2,
      }).format(value),
    []
  );

  const fetchData = useCallback(async () => {
    if (!shop) return;
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        shop,
        query: queryValue,
        sortKey,
        sortDir,
        page: page.toString(),
        pageSize: PAGE_SIZE.toString(),
      });

      const res = await fetch(`/api/royality/orders/sold?${params}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Request failed with ${res.status}`);
      }

      const data: ApiResponse = await res.json();
      setApiData(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [shop, queryValue, sortKey, sortDir, page]);

  useEffect(() => {
    if (!app) return;
    setShop(app?.config?.shop || null);
  }, [app]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClearAll = useCallback(() => {
    setQueryValue("");
    setAppliedFilters([]);
    setSortKey("totalRoyalty");
    setSortDir("desc");
    setPage(1);
  }, []);

  const totalPages = apiData?.totalPages || 1;

  const handlePrev = () => setPage((prev) => Math.max(1, prev - 1));
  const handleNext = () => setPage((prev) => Math.min(totalPages, prev + 1));

  // Prepare columns and rows for CustomDataTable
  const columns = [
    "Product / Variant",
    "Units Sold",
    "Total Sale",
    "Total Royalty",
    "Royalty %",
    "Royalty Last 30 Days",
  ];

  const rows =
    apiData?.products.map((product: LineItemStat) => [
      <ProductCell product={product} key={product.productId} />,
      product.unitSold.toLocaleString(),
      formatCurrency(product.totalSale, product.currency),
      formatCurrency(product.totalRoyalty, product.currency),
      (product.royaltyPercentage ?? 0).toFixed(2) + "%",
      formatCurrency(product.last30DaysRoyalty, product.currency),
    ]) || [];

  return (
    <Page
      title="Product Royalty Report"
      primaryAction={
        <InlineStack gap="200">
          <Tooltip content="Export filtered rows to CSV">
            <Button
              icon={ExportIcon}
              onClick={() => apiData && exportRoyaltyCSV(apiData.products)}
              disabled={!apiData || loading}
            >
              Export
            </Button>
          </Tooltip>

          <Tooltip content="Reload data">
            <Button icon={RefreshIcon} onClick={fetchData} disabled={loading} />
          </Tooltip>
        </InlineStack>
      }
      backAction={{ content: "Back", onAction: () => router.back() }}
    >
      <Card>
        <Filters
          queryValue={queryValue}
          filters={[]}
          onQueryChange={setQueryValue}
          onQueryClear={() => setQueryValue("")}
          onClearAll={handleClearAll}
          queryPlaceholder="Search by title, product ID, variant…"
          appliedFilters={appliedFilters}
        >
          <InlineStack gap="200" align="start">
            <SearchIcon />
            <Text as="span" variant="bodySm">
              {apiData?.totalProducts || 0} result
              {apiData?.totalProducts === 1 ? "" : "s"}
            </Text>
          </InlineStack>
        </Filters>
      </Card>

      {/* Use CustomDataTable */}
      <CustomDataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        emptyStateMessage="No matching products"
        emptyStateImage={FALLBACK_IMAGE}
      />

      {/* Pagination */}
      {!loading && !error && apiData?.products.length ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      ) : null}
    </Page>
  );
}
