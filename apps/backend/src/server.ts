import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { calculateTotal, generateOrderRef, getRepository, type CartLine } from './store';
import { getPayments } from './integrations/payments';

export const app = express();

app.use(express.json());

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    // Zero-config default: permissive so local dev and a fresh deploy both work.
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  }),
);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/products', async (_req: Request, res: Response) => {
  const products = await getRepository().listProducts();
  res.json(products);
});

interface CheckoutBody {
  customer?: { name?: string; email?: string; address?: string };
  items?: CartLine[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post('/api/checkout', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as CheckoutBody;
  const customer = body.customer ?? {};
  const items = Array.isArray(body.items) ? body.items : [];

  const fieldErrors: Record<string, string> = {};
  if (!String(customer.name ?? '').trim()) fieldErrors.name = 'Please enter your name.';
  if (!EMAIL_RE.test(String(customer.email ?? '').trim())) fieldErrors.email = 'Please enter a valid email address.';
  if (!String(customer.address ?? '').trim()) fieldErrors.address = 'Please enter a delivery address.';

  const catalog = await getRepository().listProducts();
  const validItems = items.filter(
    (line) => line && typeof line.qty === 'number' && line.qty > 0 && catalog.some((p) => p.id === line.productId),
  );
  if (validItems.length === 0) fieldErrors.items = 'Your cart is empty.';

  if (Object.keys(fieldErrors).length > 0) {
    res.status(400).json({ fieldErrors });
    return;
  }

  const total = calculateTotal(catalog, validItems);
  const orderRef = generateOrderRef();

  const result = await getPayments().charge({
    amount: total,
    currency: 'usd',
    orderRef,
    customerEmail: String(customer.email).trim(),
  });

  if (!result.approved) {
    res.status(402).json({
      status: 'declined',
      message: result.declineReason ?? 'Payment was declined. Your cart has been kept.',
    });
    return;
  }

  res.status(201).json({ orderRef, total, status: 'confirmed' });
});

const port = Number(process.env.PORT ?? 8000);

// Start the server only when run directly (the test suite imports `app` instead).
const isDirectRun =
  !process.env.VITEST && typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module;

if (isDirectRun) {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`ShopSnap API listening on port ${port}`);
  });
}
