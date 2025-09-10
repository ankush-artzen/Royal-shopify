export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;

export const ROYALTY_STATUSES = ["pending", "approved", "rejected"];

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

export const DATE_RANGE = {
  DEFAULT_DAYS: 30,
};

export const MAX_LIMIT = 100;

// Messages
export const ERROR_MESSAGES = {
  MISSING_SHOP: "Missing shop parameter",
  INTERNAL_SERVER_ERROR: "Internal server error",
};

// Royalty numeric limits
export const ROYALTY = {
  MIN: 0,
  MAX: 100,
};

// Messages
export const ERROR_MESSAGES_edit = {
  MISSING_SHOP: "Missing shop parameter",
  MISSING_PRODUCT_ID: "Missing product ID in URL",
  INVALID_ROYALTY: `Royalty must be a number between ${ROYALTY.MIN} and ${ROYALTY.MAX}`,
  ROYALTY_NOT_FOUND: "No royalty found for this product",
  INTERNAL_SERVER_ERROR: "Internal Server Error",
};

export const SUCCESS_MESSAGES = {
  ROYALTY_UPDATED: "Royalty updated successfully",
};
