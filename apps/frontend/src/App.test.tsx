import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App, { type Product } from './App';

const SEED: Product[] = [
  { id: 'p1', name: 'Aurora Desk Lamp', price: 4200, imageUrl: 'https://example.test/1.jpg', description: 'A lamp.' },
  { id: 'p2', name: 'Walnut Phone Stand', price: 2400, imageUrl: 'https://example.test/2.jpg', description: 'A stand.' },
];

/** Hermetic fetch stub — no network, no running backend. */
function stubApi(products: Product[]) {
  const fetchMock = vi.fn(async (input: unknown) => {
    const url = String(input);
    if (url.includes('/api/products')) {
      return { ok: true, status: 200, json: async () => products } as unknown as Response;
    }
    return { ok: true, status: 201, json: async () => ({ orderRef: 'SS-TEST01', total: 4200 }) } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ShopSnap storefront', () => {
  it('renders the catalog returned by the API', async () => {
    stubApi(SEED);
    render(<App />);

    expect(await screen.findByText('Aurora Desk Lamp')).toBeTruthy();
    expect(screen.getByText('Walnut Phone Stand')).toBeTruthy();
  });

  it('shows an empty state when the catalog is empty', async () => {
    stubApi([]);
    render(<App />);

    expect(await screen.findByText(/no products are available/i)).toBeTruthy();
  });

  it('adds a product to the cart and shows a running total', async () => {
    stubApi(SEED);
    render(<App />);
    await screen.findByText('Aurora Desk Lamp');

    fireEvent.click(screen.getAllByRole('button', { name: /add to cart/i })[0]);

    expect(screen.getByText(/total:/i).textContent).toContain('$42.00');
    expect((screen.getByRole('button', { name: /place order/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables checkout while the cart is empty', async () => {
    stubApi(SEED);
    render(<App />);
    await screen.findByText('Aurora Desk Lamp');

    expect((screen.getByRole('button', { name: /place order/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows inline validation messages when the checkout form is incomplete', async () => {
    stubApi(SEED);
    render(<App />);
    await screen.findByText('Aurora Desk Lamp');

    fireEvent.click(screen.getAllByRole('button', { name: /add to cart/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /place order/i }));

    expect(await screen.findByText(/please enter your name/i)).toBeTruthy();
    expect(screen.getByText(/valid email address/i)).toBeTruthy();
  });
});
