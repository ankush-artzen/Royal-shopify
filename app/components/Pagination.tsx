"use client";

import { FC } from "react";
import { Icon } from "@shopify/polaris";
import { ChevronLeftIcon, ChevronRightIcon } from "@shopify/polaris-icons";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

const Pagination: FC<PaginationProps> = ({ page, totalPages, onPrev, onNext }) => {
  return (
    <div className="flex items-center justify-center gap-6 py-4">
      <button
        disabled={page <= 1}
        onClick={onPrev}
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
        onClick={onNext}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 
          hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        <Icon source={ChevronRightIcon} tone="base" />
      </button>
    </div>
  );
};

export default Pagination;
