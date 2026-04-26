export interface ShoppingItem {
  id: number;
  items: string;
  disabled: boolean;
}

export interface UpdateRequest {
  id: number;
  checked: boolean;
}

interface GasResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GasClientApi {
  list(): Promise<ShoppingItem[]>;
  add(items: string[]): Promise<void>;
  update(updates: UpdateRequest[]): Promise<void>;
  purge(): Promise<number>;
}

async function parseResponse<T>(res: Response): Promise<T | undefined> {
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as GasResponse<T>;
  if (!json.success) {
    throw new Error(json.error ?? "GAS request failed");
  }
  return json.data;
}

export class GasClient implements GasClientApi {
  constructor(
    private readonly url: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async list(): Promise<ShoppingItem[]> {
    return (await this.get<ShoppingItem[]>("list")) ?? [];
  }

  async add(items: string[]): Promise<void> {
    await this.post({ action: "add", items });
  }

  async update(updates: UpdateRequest[]): Promise<void> {
    // GAS still expects the legacy `rowNumber` key on the wire; map at the boundary.
    const wireUpdates = updates.map((u) => ({ rowNumber: u.id, checked: u.checked }));
    await this.post({ action: "update", updates: wireUpdates });
  }

  async purge(): Promise<number> {
    const data = await this.post<{ deleted: number }>({ action: "purge" });
    return data?.deleted ?? 0;
  }

  private async get<T>(action: string): Promise<T | undefined> {
    const res = await this.fetchImpl(`${this.url}?action=${encodeURIComponent(action)}`, {
      method: "GET",
      redirect: "follow",
    });
    return parseResponse<T>(res);
  }

  private async post<T>(body: unknown): Promise<T | undefined> {
    const res = await this.fetchImpl(this.url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow",
    });
    return parseResponse<T>(res);
  }
}
