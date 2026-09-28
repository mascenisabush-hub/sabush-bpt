// Product ids created in a loop (recordStockCount creates one per genuinely new product, all within
// the same millisecond) used to be 'prod-' + Date.now() + 4 random base-36 chars. With the timestamp
// identical, two ids collide with probability ~N^2 / (2 * 36^4): ~0.3% for 100 new products, ~3% for
// 300. A collision made the second batch.set() overwrite the first, silently losing a product.
//
// A per-process monotonic counter makes a collision within one session impossible; the random part
// keeps ids from different devices/sessions apart. Same 'prod-' prefix, still a valid Firestore id.
let sequence = 0;

export const newProductId = (): string => {
  sequence += 1;
  return `prod-${Date.now()}-${sequence.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
};
