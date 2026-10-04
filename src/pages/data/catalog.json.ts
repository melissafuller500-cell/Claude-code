// Prices and stock for the cart, quick order, and header total. Generated from
// the product file at build time; the server recalculates every order.
import type { APIRoute } from 'astro';
import { items } from '../../lib/catalog';
import shipping from '../../../data/shipping-rates.json';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({ items, shipping: { free_shipping_threshold: shipping.free_shipping_threshold, rates: shipping.rates } }),
    { headers: { 'Content-Type': 'application/json' } },
  );
