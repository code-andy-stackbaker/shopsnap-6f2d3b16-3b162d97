/**
 * Data-access seam: ALL catalog reads go through getRepository().
 * Today it is an in-memory seed; a real database (DATABASE_URL) can implement
 * the same ProductRepository interface later with no caller changes.
 */

export interface Product {
  id: string;
  name: string;
  /** integer, minor units (cents) */
  price: number;
  imageUrl: string;
  description: string;
}

export interface CartLine {
  productId: string;
  qty: number;
}

export interface ProductRepository {
  listProducts(): Promise<Product[]>;
  findProduct(id: string): Promise<Product | undefined>;
}

const SEED_PRODUCTS: ReadonlyArray<Product> = [
  {
    id: 'p1',
    name: 'Aurora Desk Lamp',
    price: 4200,
    imageUrl: 'https://picsum.photos/seed/p1/400/300',
    description: 'Warm dimmable LED lamp with a brushed aluminium arm and a weighted base.',
  },
  {
    id: 'p2',
    name: 'Nomad Canvas Backpack',
    price: 8900,
    imageUrl: 'https://picsum.photos/seed/p2/400/300',
    description: 'Water-resistant 22L canvas pack with a padded 15" laptop sleeve.',
  },
  {
    id: 'p3',
    name: 'Ceramic Pour-Over Set',
    price: 3450,
    imageUrl: 'https://picsum.photos/seed/p3/400/300',
    description: 'Hand-glazed dripper and carafe for a clean, balanced single-origin brew.',
  },
  {
    id: 'p4',
    name: 'Linen Throw Blanket',
    price: 5600,
    imageUrl: 'https://picsum.photos/seed/p4/400/300',
    description: 'Stonewashed European linen throw that softens with every wash.',
  },
  {
    id: 'p5',
    name: 'Walnut Phone Stand',
    price: 2400,
    imageUrl: 'https://picsum.photos/seed/p5/400/300',
    description: 'Solid walnut stand angled for video calls, with a cable pass-through.',
  },
  {
    id: 'p6',
    name: 'Braided USB-C Cable',
    price: 913,
    imageUrl: 'https://picsum.photos/seed/p6/400/300',
    description: 'Two-metre braided cable rated for 100W charging. Demo note: a total ending in .13 is declined by the mock payment provider.',
  },
];

class InMemoryProductRepository implements ProductRepository {
  private readonly products: Product[] = SEED_PRODUCTS.map((p) => ({ ...p }));

  async listProducts(): Promise<Product[]> {
    return this.products.map((p) => ({ ...p }));
  }

  async findProduct(id: string): Promise<Product | undefined> {
    const found = this.products.find((p) => p.id === id);
    return found ? { ...found } : undefined;
  }
}

let repository: ProductRepository | null = null;

export function getRepository(): ProductRepository {
  if (!repository) {
    repository = new InMemoryProductRepository();
  }
  return repository;
}

/** Sum of line quantities x unit price, in minor units. */
export function calculateTotal(products: Product[], items: CartLine[]): number {
  return items.reduce((sum, line) => {
    const product = products.find((p) => p.id === line.productId);
    return product ? sum + product.price * line.qty : sum;
  }, 0);
}

export function generateOrderRef(): string {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SS-${suffix}`;
}
