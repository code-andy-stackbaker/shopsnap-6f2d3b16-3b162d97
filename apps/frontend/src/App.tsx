import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';

/* ---------------------------------------------- types + api client ------- */

export interface Product {
  id: string;
  name: string;
  price: number; // minor units
  imageUrl: string;
  description: string;
}

interface CartLine {
  productId: string;
  qty: number;
}

interface Confirmation {
  orderRef: string;
  total: number;
}

const API_BASE = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/api/products`);
  if (!res.ok) throw new Error('Could not load the catalog.');
  return (await res.json()) as Product[];
}

type CheckoutOutcome =
  | { kind: 'confirmed'; orderRef: string; total: number }
  | { kind: 'invalid'; fieldErrors: Record<string, string> }
  | { kind: 'declined'; message: string };

async function postCheckout(
  customer: { name: string; email: string; address: string },
  items: CartLine[],
): Promise<CheckoutOutcome> {
  const res = await fetch(`${API_BASE}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer, items }),
  });
  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (res.status === 201) {
    return { kind: 'confirmed', orderRef: String(payload.orderRef), total: Number(payload.total) };
  }
  if (res.status === 400) {
    return { kind: 'invalid', fieldErrors: (payload.fieldErrors as Record<string, string>) ?? {} };
  }
  return { kind: 'declined', message: String(payload.message ?? 'Payment was declined. Your cart is unchanged.') };
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/* ---------------------------------------------------------- styles ------- */

const s: Record<string, CSSProperties> = {
  page: { fontFamily: 'system-ui, sans-serif', color: '#1c1c1e', maxWidth: 1000, margin: '0 auto', padding: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #eee', paddingBottom: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginTop: 16 },
  card: { border: '1px solid #e3e3e6', borderRadius: 10, padding: 12, cursor: 'pointer', background: '#fff' },
  img: { width: '100%', height: 130, objectFit: 'cover', borderRadius: 6, background: '#f2f2f4' },
  btn: { padding: '8px 12px', borderRadius: 6, border: 'none', background: '#2f5bea', color: '#fff', cursor: 'pointer' },
  panel: { marginTop: 28, border: '1px solid #e3e3e6', borderRadius: 10, padding: 16 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' },
  input: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #c9c9cf', boxSizing: 'border-box' },
  error: { color: '#b00020', fontSize: 13, margin: '2px 0 0' },
  banner: { background: '#fdecef', border: '1px solid #f3b6c0', borderRadius: 8, padding: 12, marginBottom: 12 },
  ok: { background: '#eaf7ee', border: '1px solid #a9dfbb', borderRadius: 8, padding: 16 },
};

/* ------------------------------------------------------------- app ------- */

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [form, setForm] = useState({ name: '', email: '', address: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [declineMessage, setDeclineMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetchProducts()
      .then((list) => active && setProducts(list))
      .catch(() => active && setLoadError('Could not load the catalog. Please try again.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const lines = useMemo(
    () =>
      cart
        .map((line) => ({ line, product: products.find((p) => p.id === line.productId) }))
        .filter((entry): entry is { line: CartLine; product: Product } => !!entry.product),
    [cart, products],
  );
  const total = lines.reduce((sum, { line, product }) => sum + line.qty * product.price, 0);
  const itemCount = cart.reduce((n, line) => n + line.qty, 0);

  function addToCart(productId: string) {
    setDeclineMessage(null);
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      return existing
        ? prev.map((l) => (l.productId === productId ? { ...l, qty: l.qty + 1 } : l))
        : [...prev, { productId, qty: 1 }];
    });
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Please enter a valid email address.';
    if (!form.address.trim()) errors.address = 'Please enter a delivery address.';
    return errors;
  }

  async function handleCheckout(event: FormEvent) {
    event.preventDefault();
    setDeclineMessage(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || cart.length === 0) return;

    setSubmitting(true);
    try {
      const outcome = await postCheckout(form, cart);
      if (outcome.kind === 'confirmed') {
        setConfirmation({ orderRef: outcome.orderRef, total: outcome.total });
        setCart([]);
      } else if (outcome.kind === 'invalid') {
        setFieldErrors(outcome.fieldErrors);
      } else {
        setDeclineMessage(outcome.message); // cart + form stay intact for retry
      }
    } catch {
      setDeclineMessage('We could not reach the payment service. Your cart is unchanged.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <h1 style={{ margin: 0 }}>ShopSnap</h1>
        <span>Cart: {itemCount} item{itemCount === 1 ? '' : 's'}</span>
      </header>

      <section aria-label="Catalog">
        <h2>Catalog</h2>
        {loading && <p>Loading products…</p>}
        {!loading && loadError && <p style={s.error}>{loadError}</p>}
        {!loading && !loadError && products.length === 0 && <p>No products are available right now.</p>}

        <div style={s.grid}>
          {products.map((product) => (
            <article
              key={product.id}
              style={s.card}
              onClick={() => setExpandedId((current) => (current === product.id ? null : product.id))}
            >
              <img src={product.imageUrl} alt={product.name} style={s.img} loading="lazy" />
              <h3 style={{ fontSize: 16, margin: '10px 0 4px' }}>{product.name}</h3>
              <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{money(product.price)}</p>
              {expandedId === product.id && <p style={{ fontSize: 13, color: '#55555c' }}>{product.description}</p>}
              <button
                type="button"
                style={s.btn}
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product.id);
                }}
              >
                Add to cart
              </button>
            </article>
          ))}
        </div>
      </section>

      <section style={s.panel} aria-label="Cart">
        <h2 style={{ marginTop: 0 }}>Your cart</h2>
        {lines.length === 0 ? (
          <p>Your cart is empty. Add a product to get started.</p>
        ) : (
          <div>
            {lines.map(({ line, product }) => (
              <div key={line.productId} style={s.row}>
                <span>
                  {product.name} — {money(product.price)}
                </span>
                <span>
                  <button type="button" onClick={() => changeQty(line.productId, -1)} aria-label={`Decrease ${product.name}`}>
                    −
                  </button>
                  <span style={{ padding: '0 10px' }}>{line.qty}</span>
                  <button type="button" onClick={() => changeQty(line.productId, 1)} aria-label={`Increase ${product.name}`}>
                    +
                  </button>
                  <button type="button" style={{ marginLeft: 12 }} onClick={() => removeLine(line.productId)}>
                    Remove
                  </button>
                </span>
              </div>
            ))}
            <p style={{ fontWeight: 700, marginTop: 12 }}>Total: {money(total)}</p>
          </div>
        )}
      </section>

      <section style={s.panel} aria-label="Checkout">
        <h2 style={{ marginTop: 0 }}>Checkout</h2>

        {confirmation ? (
          <div style={s.ok}>
            <h3 style={{ marginTop: 0 }}>Order confirmed</h3>
            <p>
              Reference <strong>{confirmation.orderRef}</strong> — {money(confirmation.total)} paid.
            </p>
            <button type="button" style={s.btn} onClick={() => setConfirmation(null)}>
              Continue shopping
            </button>
          </div>
        ) : (
          <form onSubmit={handleCheckout} noValidate>
            {declineMessage && <div style={s.banner}>{declineMessage}</div>}

            <label htmlFor="name">Full name</label>
            <input id="name" style={s.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {fieldErrors.name && <p style={s.error}>{fieldErrors.name}</p>}

            <label htmlFor="email">Email</label>
            <input id="email" style={s.input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {fieldErrors.email && <p style={s.error}>{fieldErrors.email}</p>}

            <label htmlFor="address">Delivery address</label>
            <input
              id="address"
              style={s.input}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            {fieldErrors.address && <p style={s.error}>{fieldErrors.address}</p>}

            <button type="submit" style={{ ...s.btn, marginTop: 14 }} disabled={cart.length === 0 || submitting}>
              {submitting ? 'Placing order…' : `Place order — ${money(total)}`}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
