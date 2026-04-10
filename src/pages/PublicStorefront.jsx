import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState('cash_on_delivery');
  const [guest, setGuest] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [loadError, setLoadError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const [productsResult, cartResult, methodsResult] = await Promise.allSettled([
        api.publicList('products'),
        api.publicList('cart'),
        api.publicList('payment-methods')
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

      if (methodsResult.status === 'fulfilled') {
        const methodItems = Array.isArray(methodsResult.value) ? methodsResult.value : [];
        setPaymentMethods(methodItems);
        if (methodItems.length && !methodItems.some((method) => method.id === selectedPayment)) {
          setSelectedPayment(methodItems[0].id);
        }
      } else {
        setPaymentMethods([]);
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
      setCart(next || { items: [], total_amount: 0, total_quantity: 0 });
    } catch (err) {
      window.alert(err.message || 'Failed to add product to cart.');
    }
  };

  const updateQty = async (itemId, quantity) => {
    if (!Number.isInteger(quantity) || quantity < 1) {
      return;
    }
    try {
      const next = await api.publicUpdate('cart/items', itemId, { quantity });
      setCart(next || { items: [], total_amount: 0, total_quantity: 0 });
    } catch (err) {
      window.alert(err.message || 'Failed to update cart quantity.');
    }
  };

  const removeItem = async (itemId) => {
    try {
      const next = await api.publicRemove('cart/items', itemId);
      setCart(next || { items: [], total_amount: 0, total_quantity: 0 });
    } catch (err) {
      window.alert(err.message || 'Failed to remove item from cart.');
    }
  };

  const checkout = async () => {
    if (!cart.items?.length) {
      window.alert('Your cart is empty.');
      return;
    }
    if (!selectedPayment) {
      window.alert('Select a payment method.');
      return;
    }
    try {
      setPlacingOrder(true);
      const order = await api.publicCreate('checkout', {
        payment_method: selectedPayment,
        ...guest
      });
      await load();
      window.alert(`Order placed successfully: ${order?.order_number || order?.id || ''}`);
    } catch (err) {
      window.alert(err.message || 'Failed to place order.');
    } finally {
      setPlacingOrder(false);
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
                Browse and buy directly as a visitor. Create an account any time to manage your orders.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/login')}>Sign In</Button>
              <Button onClick={() => navigate('/login')}>Sign Up</Button>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
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
                      <p className="mt-2 text-xs text-[var(--muted-ink)]">{product.merchant_name} • {product.branch_name}</p>
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

          <aside className="surface-panel h-fit rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">Cart</h2>
              <span className="text-sm text-[var(--muted-ink)]">{cart.total_quantity || 0} items</span>
            </div>
            <div className="mt-3 grid gap-2">
              {(cart.items || []).length === 0 ? (
                <div className="text-sm text-[var(--muted-ink)]">Your cart is empty.</div>
              ) : (
                cart.items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="text-sm font-semibold text-[var(--ink)]">{item.name}</div>
                    <div className="mt-1 text-xs text-[var(--muted-ink)]">{formatCurrency(item.unit_price)} each</div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => updateQty(item.id, Math.max(1, Number(item.quantity || 1) - 1))}>-</Button>
                      <span className="min-w-[28px] text-center text-sm">{item.quantity}</span>
                      <Button size="sm" variant="outline" onClick={() => updateQty(item.id, Number(item.quantity || 1) + 1)}>+</Button>
                      <Button size="sm" variant="destructive" onClick={() => removeItem(item.id)}>Remove</Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted-ink)]">Total</span>
                <span className="text-xl font-semibold">{formatCurrency(cart.total_amount)}</span>
              </div>
              <div className="mt-3 grid gap-2">
                <label className="text-sm text-[var(--muted-ink)]">Payment Method</label>
                <select
                  className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]"
                  value={selectedPayment}
                  onChange={(event) => setSelectedPayment(event.target.value)}
                >
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>{method.label || method.type}</option>
                  ))}
                </select>
                <Input
                  type="text"
                  placeholder="First name (optional)"
                  value={guest.first_name}
                  onChange={(event) => setGuest((prev) => ({ ...prev, first_name: event.target.value }))}
                />
                <Input
                  type="text"
                  placeholder="Last name (optional)"
                  value={guest.last_name}
                  onChange={(event) => setGuest((prev) => ({ ...prev, last_name: event.target.value }))}
                />
                <Input
                  type="email"
                  placeholder="Email (optional)"
                  value={guest.email}
                  onChange={(event) => setGuest((prev) => ({ ...prev, email: event.target.value }))}
                />
                <Input
                  type="text"
                  placeholder="Phone (optional)"
                  value={guest.phone}
                  onChange={(event) => setGuest((prev) => ({ ...prev, phone: event.target.value }))}
                />
                <Button onClick={checkout} disabled={placingOrder || !(cart.items || []).length}>
                  {placingOrder ? 'Placing Order...' : 'Checkout'}
                </Button>
              </div>
              <p className="mt-3 text-xs text-[var(--muted-ink)]">
                Want full account access? <Link to="/login" className="underline">Sign up here</Link>.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
