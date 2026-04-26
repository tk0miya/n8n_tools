interface ShoppingItem {
  id: string;
  items: string;
  disabled: boolean;
}

interface UpdateRequest {
  id: string;
  checked: boolean;
}

interface UpdateResult {
  matched: number;
  skipped: string[];
}

interface ApiResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}
