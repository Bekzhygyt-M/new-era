/**
 * Deterministic number and price formatting.
 *
 * Avoids Intl.NumberFormat SSR/Client hydration mismatch between Node.js
 * (narrow NBSP or space) and browser (comma or NBSP).
 */
export function formatUzPrice(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '0';
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatMoney(amount: number, currency: string = 'so‘m'): string {
  return `${formatUzPrice(amount)} ${currency}`;
}
