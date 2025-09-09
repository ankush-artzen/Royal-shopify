"use client";
import { LineItemStat } from "./RoyaltyTable";

function escapeCSV(s: string) {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportRoyaltyCSV(data: LineItemStat[]) {
  if (!data?.length) return;

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

  const lines = data.map((r) =>
    [
      r.productId,
      escapeCSV(r.title ?? ""),
      escapeCSV(r.variantTitle ?? ""),
      r.unitSold,
      r.totalSale,
      r.totalRoyalty,
      r.royaltyPercentage,
      r.last30DaysRoyalty,
    ].join(",")
  );

  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `product-royalty-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
