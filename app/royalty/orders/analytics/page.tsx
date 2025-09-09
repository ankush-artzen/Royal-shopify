"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Page,
  Card,
  Filters,
  InlineStack,
  Text,
  Spinner,
  EmptyState,
  Button,
  Tooltip,
  Icon,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useRouter } from "next/navigation";

import {
  RefreshIcon,
  ExportIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@shopify/polaris-icons";

import {
  RoyaltyTable,
  ApiResponse,
} from "@/app/components/analytics/RoyaltyTable";
import { exportRoyaltyCSV } from "@/app/components/analytics/CSVExporter";

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
    [],
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

      <Card>
        {loading ? (
          <div style={{ padding: 40, display: "grid", placeItems: "center" }}>
            <Spinner size="large" />
          </div>
        ) : error ? (
          <EmptyState
            heading="Couldn't load product royalty stats"
            action={{ content: "Retry", onAction: fetchData }}
            secondaryAction={{
              content: "Reset filters",
              onAction: handleClearAll,
            }}
            image={FALLBACK_IMAGE}
          >
            <p>{error}</p>
          </EmptyState>
        ) : !apiData?.products.length ? (
          <EmptyState
            heading="No matching products"
            action={{ content: "Clear search", onAction: handleClearAll }}
            image={FALLBACK_IMAGE}
          >
            <p>Try changing your search or refresh the data.</p>
          </EmptyState>
        ) : (
          <>
            <RoyaltyTable data={apiData} formatCurrency={formatCurrency} />

            {/* Custom Pagination */}
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
