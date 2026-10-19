export interface SeedProductInput {
  name?: string;
  categorySlug?: string;
  brandSlug?: string;
  priceEgp?: number;
  oldPriceEgp?: number;
  stock?: number;
  availabilityMode?: 'auto' | 'on_request' | 'out';
  leadTimeText?: string;
  visible?: boolean;
}

export interface SeedProductResult {
  id: string;
  slug: string;
  modelCode: string;
  price: number;
}

export interface SeedOrderItemInput {
  productId: string;
  qty: number;
}

export interface SeedOrderInput {
  items: SeedOrderItemInput[];
  paymentMethod: 'cod' | 'instapay' | 'vodafone_cash' | 'fawry';
  status?:
    | 'new'
    | 'awaiting_payment'
    | 'awaiting_deposit'
    | 'payment_rejected'
    | 'confirmed'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled';
  governorate?: string;
  city?: string;
}

export interface SeedOrderResult {
  id: string;
  no: string;
  publicToken: string;
  confirmToken: string;
  total: number;
  status: string;
}

export interface SeedAdminSessionResult {
  cookieName: string;
  cookieValue: string;
  csrfToken: string;
  email: string;
}

export interface SeedCleanupResult {
  runId: string;
  products: number;
  orders: number;
  users: number;
  sessions: number;
}

export interface SeedProductDetailResult {
  id: string;
  slug: string;
  modelCode: string;
  price: number;
  availability: {
    state: string;
    label: string;
    orderable: boolean;
    maxQty: number | null;
  };
}

export interface SeedFlashSaleItemInput {
  productId: string;
  salePriceEgp: number;
}

export interface SeedFlashSaleInput {
  name?: string;
  startsAt?: string;
  endsAt?: string;
  items: SeedFlashSaleItemInput[];
}

export interface SeedFlashSaleResult {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

export interface SeedHelper {
  readonly runId: string;
  product(input?: SeedProductInput): Promise<SeedProductResult>;
  order(input: SeedOrderInput): Promise<SeedOrderResult>;
  adminSession(): Promise<SeedAdminSessionResult>;
  cleanup(): Promise<SeedCleanupResult>;
  getProduct(slug: string): Promise<SeedProductDetailResult>;
  flashSale(input: SeedFlashSaleInput): Promise<SeedFlashSaleResult>;
}

export function createSeed(): SeedHelper {
  const random = Math.random().toString(36).slice(2, 8);
  const runId = `r${Date.now().toString(36)}${random}`;

  // Note: We read process.env.TEST_SEED_SECRET directly here because e2e's secrets.get('test-seed')
  // returns an opaque Secret handle that cannot be stringified into HTTP headers.
  // This is intentional and safe: TEST_SEED_SECRET is strictly a test-environment value, never a production secret.
  const secret = process.env.TEST_SEED_SECRET ?? 'dev-test-seed-secret-32-chars-long!';
  const apiBase = process.env.API_URL ?? 'http://localhost:4000';

  const url = (path: string) => new URL(path, apiBase).toString();

  return {
    runId,
    async product(input?: SeedProductInput): Promise<SeedProductResult> {
      const res = await fetch(url('/api/test/seed/product'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-seed-secret': secret,
        },
        body: JSON.stringify({ runId, ...input }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to seed product (${res.status}): ${errorText}`);
      }
      return res.json() as Promise<SeedProductResult>;
    },
    async order(input: SeedOrderInput): Promise<SeedOrderResult> {
      const res = await fetch(url('/api/test/seed/order'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-seed-secret': secret,
        },
        body: JSON.stringify({ runId, ...input }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to seed order (${res.status}): ${errorText}`);
      }
      return res.json() as Promise<SeedOrderResult>;
    },
    async adminSession(): Promise<SeedAdminSessionResult> {
      const res = await fetch(url('/api/test/seed/admin-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-seed-secret': secret,
        },
        body: JSON.stringify({ runId }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to seed admin session (${res.status}): ${errorText}`);
      }
      return res.json() as Promise<SeedAdminSessionResult>;
    },
    async cleanup(): Promise<SeedCleanupResult> {
      const res = await fetch(url(`/api/test/run/${runId}`), {
        method: 'DELETE',
        headers: {
          'x-test-seed-secret': secret,
        },
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to cleanup run ${runId} (${res.status}): ${errorText}`);
      }
      return res.json() as Promise<SeedCleanupResult>;
    },
    async getProduct(slug: string): Promise<SeedProductDetailResult> {
      const res = await fetch(url(`/api/products/${slug}`));
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to get product ${slug} (${res.status}): ${errorText}`);
      }
      return res.json() as Promise<SeedProductDetailResult>;
    },
    async flashSale(input: SeedFlashSaleInput): Promise<SeedFlashSaleResult> {
      const res = await fetch(url('/api/test/seed/flash-sale'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-seed-secret': secret,
        },
        body: JSON.stringify({ runId, ...input }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to seed flash sale (${res.status}): ${errorText}`);
      }
      return res.json() as Promise<SeedFlashSaleResult>;
    },
  };
}

export async function resetAllE2E(): Promise<Omit<SeedCleanupResult, 'runId'>> {
  const secret = process.env.TEST_SEED_SECRET ?? 'dev-test-seed-secret-32-chars-long!';
  const apiBase = process.env.API_URL ?? 'http://localhost:4000';
  const res = await fetch(new URL('/api/test/reset', apiBase).toString(), {
    method: 'POST',
    headers: {
      'x-test-seed-secret': secret,
    },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to reset E2E data (${res.status}): ${errorText}`);
  }
  return res.json() as Promise<Omit<SeedCleanupResult, 'runId'>>;
}
