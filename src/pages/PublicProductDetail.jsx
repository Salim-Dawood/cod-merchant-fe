import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import ProductImageCarousel from '../components/ProductImageCarousel';

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) {
    return '$0.00';
  }
  return `$${amount.toFixed(2)}`;
}

export default function PublicProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [productResult, cartResult] = await Promise.allSettled([
          api.publicGet('products', id),
          api.publicList('cart')
        ]);
        if (productResult.status !== 'fulfilled') {
          throw productResult.reason || new Error('Failed to load product.');
        }
        const nextProduct = productResult.value;
        setProduct(nextProduct);
        if (cartResult.status === 'fulfilled') {
          setCartCount(Number(cartResult.value?.total_quantity || 0));
        } else {
          setCartCount(0);
        }
      } catch (err) {
        setError(err?.message || 'Failed to load product.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const images = useMemo(() => {
    const all = Array.isArray(product?.image_urls) ? product.image_urls : [];
    if (all.length) {
      return all;
    }
    return product?.image_url ? [product.image_url] : [];
  }, [product]);

  const addToCart = async () => {
    if (!product?.id) {
      return;
    }
    try {
      const nextCart = await api.publicCreate('cart/items', { product_id: product.id, quantity: 1 });
      setCartCount(Number(nextCart?.total_quantity || 0));
    } catch (err) {
      window.alert(err.message || 'Failed to add product to cart.');
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5fbf8_0%,#ffffff_30%,#f7f8fa_100%)] text-[var(--ink)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <div className="glass-panel rounded-[28px] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--muted-ink)]">Product Details</p>
              <h1 className="font-display mt-2 text-3xl">Product #{id}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/')}>Back To Products</Button>
              <Button variant="outline" onClick={() => navigate('/cart')}>Cart ({cartCount})</Button>
              <Button onClick={() => navigate('/login')}>Login</Button>
            </div>
          </div>
        </div>

        <div className="mt-5 surface-panel rounded-2xl p-4 sm:p-6">
          {loading ? (
            <div className="text-sm text-[var(--muted-ink)]">Loading product...</div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : !product ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-ink)]">
              Product not found.
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1.1fr,1fr]">
              <div className="space-y-3">
                <ProductImageCarousel
                  images={images}
                  alt={product.name || `Product #${product.id}`}
                  heightClassName="h-72 sm:h-[420px]"
                  showDots={images.length > 1}
                  showCounter={images.length > 1}
                />
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <h2 className="text-2xl font-semibold">{product.name || `Product #${product.id}`}</h2>
                <p className="mt-2 text-sm text-[var(--muted-ink)]">{product.description || 'No description available.'}</p>
                <p className="mt-3 text-xs text-[var(--muted-ink)]">{product.merchant_name} - {product.branch_name}</p>
                <p className="mt-3 text-3xl font-semibold">{formatCurrency(product.base_price)}</p>
                <dl className="mt-4 grid gap-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
                    <dt className="text-[var(--muted-ink)]">Product ID</dt>
                    <dd className="font-medium">{product.id}</dd>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
                    <dt className="text-[var(--muted-ink)]">SKU</dt>
                    <dd className="font-medium">{product.sku || 'N/A'}</dd>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
                    <dt className="text-[var(--muted-ink)]">Provider</dt>
                    <dd className="font-medium">{product.provider_name || 'N/A'}</dd>
                  </div>
                </dl>
                <div className="mt-5 grid gap-2">
                  <Button onClick={addToCart}>Add To Cart</Button>
                  <Button variant="outline" onClick={() => navigate('/cart')}>Go To Cart</Button>
                </div>
                <p className="mt-4 text-xs text-[var(--muted-ink)]">
                  Need an account? <Link to="/register" className="underline">Sign up</Link>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
