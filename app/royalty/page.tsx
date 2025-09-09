"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Thumbnail,
  Spinner,
  EmptyState,
  Badge,
  Button,
  Tooltip,
  Frame,
  Toast,
} from "@shopify/polaris";
import { EditIcon, DeleteIcon, ViewIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useRouter } from "next/navigation";
import EditRoyaltyModal from "../components/editroyality";
import DeleteConfirmationModal from "../components/dialog";
import { Icon } from "@shopify/polaris";
import { ChevronLeftIcon, ChevronRightIcon } from "@shopify/polaris-icons";

interface Royalty {
  id: string;
  productId: string;
  shopifyId: string;
  title: string;
  image?: string | null;
  status?: string | null;
  price?: number | null;
  designerId: string;
  Royality: number;
  shop?: string | null;
}

interface ApiResponse {
  royalties: Royalty[];
  count: number;
  page: number;
  totalPages: number;
}

export default function RoyaltiesPage() {
  const app = useAppBridge();
  const router = useRouter();

  const [shop, setShop] = useState<string | null>(null);
  const [royalties, setRoyalties] = useState<Royalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const limit = 8;
  const [totalPages, setTotalPages] = useState(1);

  const [activeEdit, setActiveEdit] = useState<Royalty | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Royalty | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ✅ Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastError, setToastError] = useState(false);

  const showToast = (message: string, error: boolean = false) => {
    setToastMessage(message);
    setToastError(error);
  };

  // ✅ Get shop from AppBridge config
  useEffect(() => {
    const shopFromConfig = app?.config?.shop;
    if (shopFromConfig) setShop(shopFromConfig);
    else setError("Unable to retrieve shop info. Please reload the app.");
  }, [app]);

  // ✅ Fetch royalties
  const fetchRoyalties = useCallback(
    async (pageNumber: number = 1) => {
      if (!shop) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/royality?shop=${shop}&page=${pageNumber}&limit=${limit}`,
        );
        if (!res.ok) throw new Error("Failed to fetch royalties");

        const data: ApiResponse = await res.json();
        setRoyalties(data.royalties || []);
        setPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Something went wrong",
          true,
        );
      } finally {
        setLoading(false);
      }
    },
    [shop, limit],
  );

  // ✅ Fetch on shop/page change
  useEffect(() => {
    if (shop) fetchRoyalties(page);
  }, [shop, page, fetchRoyalties]);

  // ✅ Delete royalty
  const handleDelete = async () => {
    if (!shop || !deleteTarget) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(
        `/api/royality/product/${deleteTarget.shopifyId}/delete?shop=${shop}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete royalty");
      }
      await fetchRoyalties(page);
      showToast("Royalty deleted successfully");
      setDeleteTarget(null);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Something went wrong",
        true,
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // ✅ Update royalty
  const handleUpdate = async (shopifyId: string, newRoyality: number) => {
    if (!shop || !shopifyId) return;
    try {
      const res = await fetch(
        `/api/royality/product/${shopifyId}/edit?shop=${shop}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Royality: newRoyality }),
        },
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update royalty");
      }
      await fetchRoyalties(page);
      setActiveEdit(null);
      showToast("Royalty updated successfully");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Something went wrong",
        true,
      );
    }
  };

  // ✅ Pagination
  const handlePrev = () => page > 1 && setPage(page - 1);
  const handleNext = () => page < totalPages && setPage(page + 1);

  return (
    <Frame>
      <Page
        title="Product Royalties"
        backAction={{ content: "Back", onAction: () => router.back() }}
      >
        <Card>
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Spinner accessibilityLabel="Loading royalties" size="large" />
            </div>
          ) : error ? (
            <div className="p-8 text-red-600">{error}</div>
          ) : royalties.length === 0 ? (
            <EmptyState
              heading="No royalties assigned yet"
              action={{ content: "Assign Royalty", url: "/royalty/create" }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>
                You haven’t assigned any royalties yet. Start by linking a
                designer to a product.
              </p>
            </EmptyState>
          ) : (
            <>
              <IndexTable
                resourceName={{ singular: "royalty", plural: "royalties" }}
                itemCount={royalties.length}
                selectable={false}
                headings={[
                  { title: "Product" },
                  { title: "Royalty %", alignment: "center" },
                  { title: "Price", alignment: "center" },
                  { title: "Actions", alignment: "center" },
                ]}
              >
                {royalties.map((royalty, index) => (
                  <IndexTable.Row
                    id={royalty.id}
                    key={royalty.id}
                    position={index}
                  >
                    <IndexTable.Cell>
                      <div className="flex items-center gap-2 min-w-[220px] max-w-[240px] truncate">
                        <Thumbnail
                          source={
                            royalty.image ||
                            "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png"
                          }
                          alt={royalty.title}
                        />
                        <Text as="span" truncate>
                          {royalty.title}
                        </Text>
                      </div>
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <div className="flex justify-center min-w-[100px]">
                        <Badge tone="success">{`${royalty.Royality}%`}</Badge>
                      </div>
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <div className="flex justify-center min-w-[120px]">
                        {royalty.price !== null && royalty.price !== undefined
                          ? royalty.price.toFixed(2)
                          : "—"}
                      </div>
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <div className="flex justify-end w-full gap-5 pr-12">
                        <Tooltip content="Edit Royalty">
                          <Button
                            size="slim"
                            icon={EditIcon}
                            onClick={() => setActiveEdit(royalty)}
                          />
                        </Tooltip>
                        <Tooltip content="Delete Royalty">
                          <Button
                            size="slim"
                            tone="critical"
                            icon={DeleteIcon}
                            onClick={() => setDeleteTarget(royalty)}
                          />
                        </Tooltip>
                        <Tooltip content="View Product in Shopify Admin">
                          <Button
                            size="slim"
                            icon={ViewIcon}
                            onClick={() => {
                              if (!shop) return;
                              const storeHandle = shop.replace(
                                ".myshopify.com",
                                "",
                              );
                              const shopifyAdminUrl = `https://admin.shopify.com/store/${storeHandle}/products/${royalty.shopifyId}`;
                              window.open(shopifyAdminUrl, "_blank");
                            }}
                          />
                        </Tooltip>
                      </div>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>

              {/* Pagination */}
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

        {/* Edit Modal */}
        {activeEdit && (
          <EditRoyaltyModal
            open
            royalty={activeEdit}
            onClose={() => setActiveEdit(null)}
            onUpdate={handleUpdate}
          />
        )}

        {/* Delete Modal */}
        {deleteTarget && (
          <DeleteConfirmationModal
            open
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            loading={deleteLoading}
            title="Delete Royalty?"
            message={`Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
          />
        )}

        {/* Toast Notifications */}
        {toastMessage && (
          <Toast
            content={toastMessage}
            error={toastError}
            onDismiss={() => setToastMessage(null)}
          />
        )}
      </Page>
    </Frame>
  );
}
