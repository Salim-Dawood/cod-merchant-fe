import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) {
    return '$0.00';
  }
  return `$${amount.toFixed(2)}`;
}

export default function PublicStorefront() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({ items: [], total_amount: 0, total_quantity: 0 });
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const [productsResult, cartResult] = await Promise.allSettled([
        api.publicList('products'),
        api.publicList('cart')
      ]);

      if (productsResult.status === 'fulfilled') {
        setProducts(Array.isArray(productsResult.value) ? productsResult.value : []);
      } else {
        setProducts([]);
        setLoadError(productsResult.reason?.message || 'Failed to load products.');
      }

      if (cartResult.status === 'fulfilled') {
        const cartData = cartResult.value;
        setCart(cartData && typeof cartData === 'object' ? cartData : { items: [], total_amount: 0, total_quantity: 0 });
      } else {
        setCart({ items: [], total_amount: 0, total_quantity: 0 });
      }
    } catch (err) {
      setLoadError(err?.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = useMemo(() => {
    if (!query) {
      return products;
    }
    const search = query.toLowerCase();
    return products.filter((item) =>
      [item.name, item.description, item.merchant_name, item.branch_name, item.provider_name]
        .some((value) => String(value || '').toLowerCase().includes(search))
    );
  }, [products, query]);

  const addToCart = async (productId) => {
    try {
      const next = await api.publicCreate('cart/items', { product_id: productId, quantity: 1 });
      setCart(next && typeof next === 'object' ? next : { items: [], total_amount: 0, total_quantity: 0 });
    } catch (err) {
      window.alert(err.message || 'Failed to add product to cart.');
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5fbf8_0%,#ffffff_30%,#f7f8fa_100%)] text-[var(--ink)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6">
        <div className="glass-panel rounded-[28px] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--muted-ink)]">Storefront</p>
              <h1 className="font-display mt-2 text-3xl">Shop Our Products</h1>
              <p className="mt-2 text-sm text-[var(--muted-ink)]">
                Browse products and add what you need, then continue to cart to complete checkout.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/cart')}>
                Cart ({cart.total_quantity || 0})
              </Button>
              <Button onClick={() => navigate('/register')}>Sign Up</Button>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="surface-panel rounded-2xl p-4">
            <Input
              type="text"
              placeholder="Search products, merchant, branch..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {loadError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {loadError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted-ink)]">
                Loading products...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted-ink)]">
                No products found.
              </div>
            ) : (
              filteredProducts.map((product) => (
                <article key={product.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                  <div className="h-40 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-soft)]">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name || `Product #${product.id}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[var(--muted-ink)]">No image</div>
                    )}
                  </div>
                  <div className="mt-3">
                    <h3 className="text-base font-semibold text-[var(--ink)]">{product.name || `Product #${product.id}`}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-ink)]">{product.description || 'No description.'}</p>
                    <p className="mt-2 text-xs text-[var(--muted-ink)]">{product.merchant_name} - {product.branch_name}</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{formatCurrency(product.base_price)}</p>
                  </div>
                  <div className="mt-3">
                    <Button className="w-full" onClick={() => addToCart(product.id)}>Add To Cart</Button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
