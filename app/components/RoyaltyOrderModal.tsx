"use client";

import React from "react";
import { Modal, Card, BlockStack, InlineStack, Text, Badge, Divider, List, Box } from "@shopify/polaris";

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

interface OrderModalProps {
  order: RoyaltyOrder;
  storeName: string;
  active: boolean;
  onClose: () => void;
}

const OrderModal: React.FC<OrderModalProps> = ({ order, storeName, active, onClose }) => {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  const renderCurrencyBadge = (currency: string) => (
    <Badge tone={currency === "USD" ? "success" : "warning"}>{currency}</Badge>
  );

  const renderProductRow = (product: LineItem, currency: string) => (
    <Box paddingBlock="200">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h3" variant="headingMd">{product.title || "Unknown Product"}</Text>
      </InlineStack>

      <Box paddingBlockStart="100">
        <InlineStack gap="400">
          <Text as="span" tone="subdued">Qty: {product.quantity}</Text>
          {product.variantTitle && <Text as="span" tone="subdued">Variant: {product.variantTitle}</Text>}
          <Text as="span" tone="subdued">Unit Price: {product.unitPrice.toFixed(2)}</Text>
        </InlineStack>
      </Box>
    </Box>
  );

  return (
    <Modal
      open={active}
      onClose={onClose}
      title={`Order ${order.orderName}`}
      primaryAction={{ content: "Close", onAction: onClose }}
      secondaryActions={[
        {
          content: "View in Shopify",
          onAction: () => {
            window.open(`https://admin.shopify.com/store/${storeName}/orders/${order.orderId}`, "_blank");
          },
        },
      ]}
      size="large"
    >
      {/* ✅ Just use BlockStack directly, no ModalSection */}
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingLg">Order Summary</Text>
              {renderCurrencyBadge(order.currency)}
            </InlineStack>

            <Divider />

            <InlineStack align="space-between">
              <Text as="span" tone="subdued">Order Date</Text>
              <Text as="span" fontWeight="medium">{order.createdAt ? formatDate(order.createdAt) : "-"}</Text>
            </InlineStack>

            <InlineStack align="space-between">
              <Text as="span" tone="subdued">Order ID</Text>
              <Text as="span" fontWeight="medium">{order.orderId}</Text>
            </InlineStack>

            <InlineStack align="space-between">
              <Text as="span" tone="subdued">Total Royalty Amount</Text>
              <Text as="span" fontWeight="bold" variant="headingMd">{order.calculatedroyaltyamount.toFixed(2)} {order.currency}</Text>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingLg">Products ({order.lineItem?.length || 0})</Text>
            <Divider />

            {order.lineItem?.length > 0 ? (
              <List>
                {order.lineItem.map((product, index) => (
                  <List.Item key={index}>
                    {renderProductRow(product, order.currency)}
                    {index < order.lineItem.length - 1 && <Divider />}
                  </List.Item>
                ))}
              </List>
            ) : (
              <Text as="p" tone="subdued">No products found</Text>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Modal>
  );
};

export default OrderModal;
