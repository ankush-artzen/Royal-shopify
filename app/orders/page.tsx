"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Page,
  IndexTable,
  Text,
  Spinner,
  Pagination,
  EmptyState,
  Avatar,
  Badge,
  TextField,
  SkeletonBodyText,
  SkeletonDisplayText,
} from "@shopify/polaris";

interface Order {
  id: string;
  name: string;
  createdAt: string;
  cursor: string;
  totalPriceSet?: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pageInfo, setPageInfo] = useState<any>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const shop = "karan-working.myshopify.com";

  const fetchOrders = async (after: string | null = null) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/orders?shop=${shop}${after ? `&cursor=${after}` : ""}`
      );
      const data = await res.json();

      if (res.ok) {
        setOrders(data.orders || []);
        setPageInfo(data.pageInfo || null);
      } else {
        console.error("❌ API error:", data.error);
      }
    } catch (err) {
      console.error("🔥 Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(cursor);
  }, [cursor]);

  // filter orders based on search
  const filteredOrders = orders.filter((o) =>
    `${o.customer?.firstName || ""} ${o.customer?.lastName || ""} ${
      o.customer?.email || ""
    } ${o.name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Page
      title="Orders"
      subtitle="View and manage customer orders"
      primaryAction={{
        content: "Export",
        onAction: () => console.log("Export clicked"),
      }}
    >
      <Card>
        {/* Search Bar */}
        {/* <div className="p-4">
          <TextField
            value={search}
            onChange={setSearch}
            placeholder="Search orders by name, email, or customer"
            clearButton
            onClearButtonClick={() => setSearch("")}
          />
        </div> */}

        {/* Loading state */}
        {loading ? (
          <div className="p-6">
            <SkeletonDisplayText size="small" />
            <SkeletonBodyText lines={6} />
          </div>
        ) : filteredOrders.length === 0 ? (
          // Empty state
          <EmptyState
            heading="No orders yet"
            action={{ content: "Refresh", onAction: () => fetchOrders(null) }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>New orders will appear here once customers check out.</p>
          </EmptyState>
        ) : (
          <IndexTable
            resourceName={{ singular: "order", plural: "orders" }}
            itemCount={filteredOrders.length}
            selectable={false}
            headings={[
              { title: "Order" },
              { title: "Customer" },
              { title: "Email" },
              { title: "Created At" },
              { title: "Total" },
            ]}
          >
            {filteredOrders.map((order, index) => {
              const initials = order.customer
                ? `${order.customer.firstName?.[0] || ""}${
                    order.customer.lastName?.[0] || ""
                  }`
                : "G";
              const currency = order.totalPriceSet?.shopMoney.currencyCode;
              const amount = order.totalPriceSet?.shopMoney.amount;

              return (
                <IndexTable.Row id={order.id} key={order.id} position={index}>
                  <IndexTable.Cell>
                    <Text as="span" fontWeight="bold" variant="bodyMd">
                      <a
                        href={`https://${shop}/admin/orders/${order.id.replace(
                          "gid://shopify/Order/",
                          ""
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {order.name}
                      </a>
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <div className="flex items-center gap-2">
                      <Avatar customer name={order.customer?.firstName || "Guest"} />
                      {order.customer
                        ? `${order.customer.firstName || ""} ${
                            order.customer.lastName || ""
                          }`
                        : "Guest"}
                    </div>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {order.customer?.email ? (
                      <Text as="p" variant="bodyMd">{order.customer.email}</Text>
                    ) : (
                      <Badge tone="attention">No Email</Badge>
                    )}
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {new Date(order.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                  <Text as="p"  fontWeight="bold">
                      {amount} {currency}
                    </Text>
                  </IndexTable.Cell>
                </IndexTable.Row>
              );
            })}
          </IndexTable>
        )}

        {/* Pagination */}
        {/* {pageInfo && !loading && (
          <div className="flex justify-center p-4">
            <Pagination
              hasPrevious={pageInfo.hasPreviousPage}
              onPrevious={() => setCursor(pageInfo.startCursor)}
              hasNext={pageInfo.hasNextPage}
              onNext={() => setCursor(pageInfo.endCursor)}
            />
          </div>
        )} */}
      </Card>
    </Page>
  );
}
