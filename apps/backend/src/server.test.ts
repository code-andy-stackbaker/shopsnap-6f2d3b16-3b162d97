import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './server';
import { MockPayments } from './integrations/payments/mock';
import { StripePayments } from './integrations/payments/stripe';
import type { Payments } from './integrations/payments/port';

describe('ShopSnap API', () => {
  it('GET /api/products returns the seeded catalog', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        price: expect.any(Number),
        imageUrl: expect.any(String),
        description: expect.any(String),
      }),
    );
  });

  it('POST /api/checkout confirms a valid order', async () => {
    const products = (await request(app).get('/api/products')).body as Array<{ id: string; price: number }>;
    const line = products.find((p) => p.price % 100 !== 13)!;

    const res = await request(app)
      .post('/api/checkout')
      .send({
        customer: { name: 'Ada Lovelace', email: 'ada@example.com', address: '1 Analytical Way' },
        items: [{ productId: line.id, qty: 2 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('confirmed');
    expect(res.body.total).toBe(line.price * 2);
    expect(typeof res.body.orderRef).toBe('string');
  });

  it('POST /api/checkout returns 400 field errors for invalid input', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .send({ customer: { name: '', email: 'not-an-email', address: '' }, items: [] });

    expect(res.status).toBe(400);
    expect(res.body.fieldErrors).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        email: expect.any(String),
        address: expect.any(String),
        items: expect.any(String),
      }),
    );
  });

  it('POST /api/checkout returns 402 when the payment provider declines', async () => {
    const products = (await request(app).get('/api/products')).body as Array<{ id: string; price: number }>;
    const declining = products.find((p) => p.price % 100 === 13)!;

    const res = await request(app)
      .post('/api/checkout')
      .send({
        customer: { name: 'Ada Lovelace', email: 'ada@example.com', address: '1 Analytical Way' },
        items: [{ productId: declining.id, qty: 1 }],
      });

    expect(res.status).toBe(402);
    expect(res.body.status).toBe('declined');
    expect(typeof res.body.message).toBe('string');
  });

  it('mock and real payment providers satisfy the same port', () => {
    const providers: Payments[] = [new MockPayments(), new StripePayments()];
    for (const provider of providers) {
      expect(typeof provider.charge).toBe('function');
    }
  });
});
