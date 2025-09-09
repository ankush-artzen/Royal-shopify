"use client";
import { IndexTable, InlineStack, Text } from "@shopify/polaris";

export type LineItemStat = {
  productId: string;
  title: string;
  variantId?: string | null;
  variantTitle?: string | null;
  unitSold: number;
  totalSale: number;
  totalRoyalty: number;
  royaltyPercentage: number;
  last30DaysRoyalty: number;
  currency?: string | null;
};

export type ApiResponse = {
  shop: string;
  products: LineItemStat[];
  totalProducts: number;
  totalUnitSold: number;
  totalSales: number;
  totalRoyalties: number;
  last30DaysTotalRoyalty: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export function ProductCell({ product }: { product: LineItemStat }) {
  return (
    <InlineStack gap="200" align="start">
      <div>
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          {product.title || "(Untitled product)"}
        </Text>
        <div>ID: {product.productId}</div>
        {product.variantTitle && <div>Variant: {product.variantTitle}</div>}
      </div>
    </InlineStack>
  );
}

export function RoyaltyTable({
  data,
  formatCurrency,
}: {
  data: ApiResponse;
  formatCurrency: (value: number, currency?: string | null) => string;
}) {
  return (
    <IndexTable
    resourceName={{ singular: "product", plural: "products" }}
    itemCount={data.products.length}
    selectable={false} 
    headings={[
      { title: "Product / Variant", id: "product" },
      { title: "Units Sold", id: "unitSold" },
      { title: "Total Sale", id: "totalSale" },
      { title: "Total Royalty", id: "totalRoyalty" },
      { title: "Royalty %", id: "royaltyPercentage" },
      { title: "Royalty Last 30 Days", id: "last30DaysRoyalty" },
    ]}
  >
    {data.products.map((product, index) => (
      <IndexTable.Row
        id={product.productId}
        key={`${product.productId}-${index}`}
        position={index}
      >
        <IndexTable.Cell>
          <ProductCell product={product} />
        </IndexTable.Cell>
        <IndexTable.Cell>{product.unitSold.toLocaleString()}</IndexTable.Cell>
        <IndexTable.Cell>
          {formatCurrency(product.totalSale, product.currency)}
        </IndexTable.Cell>
        <IndexTable.Cell>
          {formatCurrency(product.totalRoyalty, product.currency)}
        </IndexTable.Cell>
        <IndexTable.Cell>
          {(product.royaltyPercentage ?? 0).toFixed(2)}%
        </IndexTable.Cell>
        <IndexTable.Cell>
          {formatCurrency(product.last30DaysRoyalty, product.currency)}
        </IndexTable.Cell>
      </IndexTable.Row>
    ))}
  </IndexTable>
  
  );
}
