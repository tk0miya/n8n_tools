interface ShoppingItem {
  id: number;
  rowNumber: number;
  items: string;
  disabled: boolean;
}

interface UpdateRequest {
  rowNumber: number;
  checked: boolean;
}

interface ApiResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}
