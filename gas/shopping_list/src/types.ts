interface ShoppingItem {
  id: string;
  items: string;
  disabled: boolean;
}

interface UpdateRequest {
  id: string;
  checked: boolean;
}

interface ApiResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}
