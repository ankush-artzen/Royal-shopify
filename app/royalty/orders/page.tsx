"use client";

import { useEffect, useState } from "react";
import { Page } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useRouter } from "next/navigation";
import CustomDataTable from "@/app/components/CustomDataTable";
import OrderModal from "@/app/components/RoyaltyOrderModal";
import Pagination from "@/app/components/Pagination";

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

export default function RoyaltiesPage() {
  const [orders, setOrders] = useState<RoyaltyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shop, setShop] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<RoyaltyOrder | null>(null);
  const [totalRoyalty, setTotalRoyalty] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [modalActive, setModalActive] = useState<boolean>(false);

  const app = useAppBridge();
  const router = useRouter();

  useEffect(() => {
    const shopFromConfig = app?.config?.shop;
    if (shopFromConfig) setShop(shopFromConfig);
    else setError("Unable to retrieve shop info. Please reload the app.");
  }, [app]);

  const storeName = shop?.replace(".myshopify.com", "");

  useEffect(() => {
    if (!shop) return;

    const fetchRoyalties = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/royality/orders?shop=${shop}&page=${page}&limit=${limit}`,
        );
        if (!res.ok) throw new Error("Failed to fetch royalties");
        const data = await res.json();

        setOrders(data.orders || []);
        setTotalRoyalty(data.totalCalculatedRoyalty || 0);
        setTotalOrders(data.totalOrders || 0);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchRoyalties();
  }, [shop, page, limit]);

  const totalPages = Math.ceil(totalOrders / limit);

  // Prepare rows for CustomDataTable
  const rows = orders.map((order) => [
    <a
      key={order.orderId}
      href={`/orders/${order.orderId}`}
      onClick={(e) => {
        e.preventDefault();
        setSelectedOrder(order);
        setModalActive(true);
      }}
      style={{ color: "blue", textDecoration: "underline", cursor: "pointer" }}
    >
      {order.orderId}
    </a>,
    order.orderName,
    `${order.calculatedroyaltyamount.toFixed(2)} ${order.currency}`,
    order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-",
  ]);

  // Add total row
  rows.push(["TOTAL", "", totalRoyalty.toFixed(2), ""]);

  return (
    <Page
      title="Royalties Per Order"
      backAction={{ content: "Back", onAction: () => router.back() }}
    >
      <CustomDataTable
        columns={["Order ID", "Order Name", "Royalty Amount", "Created At"]}
        rows={rows}
        loading={loading}
        error={error}
        emptyStateMessage="No royalty orders found"
      />

      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          storeName={storeName || ""}
          active={modalActive}
          onClose={() => setModalActive(false)}
        />
      )}

      {!loading && !error && orders.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => {
            setLoading(true);
            setPage((prev) => Math.max(prev - 1, 1));
          }}
          onNext={() => {
            setLoading(true);
            setPage((prev) => Math.min(prev + 1, totalPages));
          }}
        />
      )}
    </Page>
  );
}
