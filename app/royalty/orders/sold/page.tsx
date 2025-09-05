"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Thumbnail,
  Badge,
  Button,
  Icon,
  TextField,
  Filters,
  InlineStack,
  BlockStack,
  Spinner,
  EmptyState,
  Pagination,
  Tooltip,
} from "@shopify/polaris";
import { RefreshIcon } from "@shopify/polaris-icons";
type LineItemStat = {
  productId: string;
  title: string;
  variantId?: string | null;
  variantTitle?: string | null;
  unitSold: number;
  totalSale: number;
  totalRoyalty: number;
  royaltyPercentage: number;
  last30DaysRoyalty: number;
};

type ApiResponse = {
  shop: string;
  products: LineItemStat[];
  totalProducts: number;
};

const PAGE_SIZE = 10;

export default function ProductRoyaltyFromOrdersPage() {
  // ----- read shop from URL (?shop=xxx) -----
  const [shop, setShop] = useState<string | null>(null);
  // ----- data state -----
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<LineItemStat[]>([]);
  // ----- UI state -----
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof LineItemStat>("totalRoyalty");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  // currency/number formatters
  const nf = useMemo(() => new Intl.NumberFormat(), []);
  const cf = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD", // change if you need dynamic currency
        maximumFractionDigits: 2,
      }),
    [],
  );

  // derive shop from URL on mount
  useEffect(() => {
    const url = new URL(window.location.href);
    const s = url.searchParams.get("shop");
    setShop(s);
  }, []);

  // fetch data
  async function fetchData(currentShop: string | null) {
    if (!currentShop) {
      setError("Missing shop parameter in URL (?shop=...)");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/royality/orders/sold?shop=${encodeURIComponent(currentShop)}`,
        {
          method: "GET",
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Request failed with ${res.status}`);
      }
      const data: ApiResponse = await res.json();
      setRows(data.products || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(shop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  // search + sort + paginate
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let r = rows;
    if (q) {
      r = rows.filter(
        (x) =>
          x.title?.toLowerCase().includes(q) ||
          x.productId?.toLowerCase().includes(q) ||
          x.variantTitle?.toLowerCase().includes(q),
      );
    }
    r = [...r].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
    return r;
  }, [rows, query, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageSafe]);

  // handlers
  const handleSort = (key: keyof LineItemStat) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const resetFilters = () => {
    setQuery("");
    setSortKey("totalRoyalty");
    setSortDir("desc");
    setPage(1);
  };

  const exportCSV = () => {
    const headers = [
      "Product ID",
      "Title",
      "Variant Title",
      "Units Sold",
      "Total Sale",
      "Total Royalty",
      "Royalty %",
      "Last 30 Days Royalty",
    ];
    const lines = filtered.map((r) =>
      [
        r.productId,
        escapeCSV(r.title ?? ""),
        escapeCSV(r.variantTitle ?? ""),
        r.unitSold,
        r.totalSale,
        r.totalRoyalty,
        r.royaltyPercentage,
        r.last30DaysRoyalty,
      ].join(","),
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `product-royalty-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // UI bits
  const sortArrow = (key: keyof LineItemStat) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <Page
      title="Orders History "
      primaryAction={
        <InlineStack gap="200">
          <Tooltip content="Export filtered rows to CSV">
            {/* <Button icon={ExportMinor} onClick={exportCSV}>
              Export
            </Button> */}
          </Tooltip>
          <Tooltip content="Reload data">
            <Button icon={RefreshIcon} onClick={() => fetchData(shop)} />
          </Tooltip>
        </InlineStack>
      }
    >
      <BlockStack gap="400">
        <Card>
          <Filters
            queryValue={query}
            filters={[]}
            onQueryChange={setQuery}
            onQueryClear={() => setQuery("")}
            onClearAll={resetFilters}
            queryPlaceholder="Search by title, product ID, variant…"
          >
            <InlineStack gap="200" align="start">
              {/* <Icon source={SearchMinor} /> */}
              <Text as="span" variant="bodySm">
                {filtered.length} result{filtered.length === 1 ? "" : "s"}
              </Text>
            </InlineStack>
          </Filters>
        </Card>

        <Card>
          {loading ? (
            <div style={{ display: "grid", placeItems: "center", padding: 40 }}>
              <Spinner
                accessibilityLabel="Loading product royalties"
                size="large"
              />
            </div>
          ) : error ? (
            <div style={{ padding: 24 }}>
              <EmptyState
                heading="Couldn’t load product royalty stats"
                action={{ content: "Retry", onAction: () => fetchData(shop) }}
                secondaryAction={{
                  content: "Reset filters",
                  onAction: resetFilters,
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>{error}</p>
              </EmptyState>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24 }}>
              <EmptyState
                heading="No matching products"
                action={{ content: "Clear search", onAction: resetFilters }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Try changing your search or refresh the data.</p>
              </EmptyState>
            </div>
          ) : (
            <>
              <IndexTable
                resourceName={{ singular: "product", plural: "products" }}
                itemCount={filtered.length}
                selectable={false}
                headings={[
                  { title: "Product / Variant" },
                  {
                    title: (
                      <button
                        onClick={() => handleSort("unitSold")}
                        className="font-medium"
                      >
                        Units Sold{sortArrow("unitSold")}
                      </button>
                    ) as any,
                  },
                  {
                    title: (
                      <button
                        onClick={() => handleSort("totalSale")}
                        className="font-medium"
                      >
                        Total Sale{sortArrow("totalSale")}
                      </button>
                    ) as any,
                  },
                  {
                    title: (
                      <button
                        onClick={() => handleSort("totalRoyalty")}
                        className="font-medium"
                      >
                        Total Royalty{sortArrow("totalRoyalty")}
                      </button>
                    ) as any,
                  },
                  {
                    title: (
                      <button
                        onClick={() => handleSort("royaltyPercentage")}
                        className="font-medium"
                      >
                        Royalty %{sortArrow("royaltyPercentage")}
                      </button>
                    ) as any,
                  },
                  {
                    title: (
                      <button
                        onClick={() => handleSort("last30DaysRoyalty")}
                        className="font-medium"
                      >
                        Last 30 Days{sortArrow("last30DaysRoyalty")}
                      </button>
                    ) as any,
                  },
                ]}
              >
                {pageSlice.map((r, index) => (
                  <IndexTable.Row
                    id={r.productId}
                    key={`${r.productId}-${index}`}
                    position={index}
                  >
                    <IndexTable.Cell>
                      <BlockStack gap="100">
                        <Text as="span" variant="bodyMd" fontWeight="semibold">
                          {r.title || "(Untitled product)"}
                        </Text>
                        <InlineStack gap="200" align="start">
                          <Badge tone="new">ID</Badge>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {r.productId}
                          </Text>
                        </InlineStack>
                        {r.variantTitle ? (
                          <InlineStack gap="200" align="start">
                            <Badge>Variant</Badge>
                            <Text as="span" variant="bodySm" tone="subdued">
                              {r.variantTitle}
                            </Text>
                          </InlineStack>
                        ) : null}
                      </BlockStack>
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <Text as="span" variant="bodyMd">
                        {nf.format(r.unitSold || 0)}
                      </Text>
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <Text as="span" variant="bodyMd">
                        {cf.format(r.totalSale || 0)}
                      </Text>
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <Text as="span" variant="bodyMd">
                        {cf.format(r.totalRoyalty || 0)}
                      </Text>
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <Text as="span" variant="bodyMd">
                        {(r.royaltyPercentage ?? 0).toFixed(2)}%
                      </Text>
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <Text as="span" variant="bodyMd">
                        {cf.format(r.last30DaysRoyalty || 0)}
                      </Text>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>

              <div style={{ padding: "16px 20px" }}>
                <Pagination
                  hasPrevious={pageSafe > 1}
                  onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                  hasNext={pageSafe < totalPages}
                  onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                />
                <InlineStack gap="200" align="center">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Page {pageSafe} of {totalPages} • {filtered.length} total
                  </Text>
                </InlineStack>
              </div>
            </>
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}

// util to escape CSV cells
function escapeCSV(s: string) {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
