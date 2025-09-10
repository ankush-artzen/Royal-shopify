"use client";

import { FC, ReactNode } from "react";
import { Card, DataTable, Spinner, EmptyState, Text } from "@shopify/polaris";

interface CustomDataTableProps {
  columns: string[];
  rows: ReactNode[][];
  loading?: boolean;
  error?: string | null;
  emptyStateMessage?: string;
  emptyStateImage?: string;
}

const CustomDataTable: FC<CustomDataTableProps> = ({
  columns,
  rows,
  loading = false,
  error = null,
  emptyStateMessage = "No records found",
  emptyStateImage = "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
}) => {
  return (
    <Card>
      {loading ? (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "32px" }}
        >
          <Spinner accessibilityLabel="Loading data" size="large" />
        </div>
      ) : error ? (
        <div style={{ padding: "32px", color: "red" }}>{error}</div>
      ) : rows.length === 0 ? (
        <EmptyState heading={emptyStateMessage} image={emptyStateImage}>
          <p>{emptyStateMessage}</p>
        </EmptyState>
      ) : (
        <div className="custom-table-wrapper" style={{ overflowX: "auto" }}>
          <style jsx global>{`
            /* Hide Polaris DataTable navigation dots */
            .custom-table-wrapper .Polaris-DataTable__Navigation {
              display: none !important;
            }
          `}</style>

          <DataTable
            columnContentTypes={columns.map(() => "text")}
            headings={columns.map((column, index) => (
              <Text key={index} as="h1" variant="headingMd">
                {column}
              </Text>
            ))}
            rows={rows}
            hasZebraStripingOnData
          />
        </div>
      )}
    </Card>
  );
};

export default CustomDataTable;
