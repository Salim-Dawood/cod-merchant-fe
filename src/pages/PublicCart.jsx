import { useEffect, useState } from 'react';
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

function normalizeDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidLuhn(cardNumber) {
  const digits = normalizeDigits(cardNumber);
  if (digits.length < 12 || digits.length > 19) {
    return false;
  }
  let sum = 0;
  let shouldDouble = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function parseExpiry(value) {
  const cleaned = String(value || '').trim();
  const match = cleaned.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!match) {
    return null;
  }
  const month = Number(match[1]);
  const year = Number(`20${match[2]}`);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }
  const expiry = new Date(year, month, 0, 23, 59, 59, 999);
  if (expiry.getTime() < Date.now()) {
    return null;
  }
  return { month, year };
}

export default function PublicCartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total_amount: 0, total_quantity: 0 });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState('cash_on_delivery');
  const [guest, setGuest] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [card, setCard] = useState({ cardholder_name: '', card_number: '', expiry: '', cvv: '' });
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const isCardPayment = selectedPayment === 'credit_card';

  const load = async () => {
    try {
      setLoading(true);
      const [cartResult, methodsResult] = await Promise.allSettled([
        api.publicList('cart'),
        api.publicList('payment-methods')
      ]);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    let paymentDetails;
    if (isCardPayment) {
      const cardholderName = String(card.cardholder_name || '').trim();
      const cardNumberDigits = normalizeDigits(card.card_number);
      const expiryParts = parseExpiry(card.expiry);
      const cvvDigits = normalizeDigits(card.cvv);
      if (!cardholderName) {
        window.alert('Cardholder name is required.');
        return;
      }
      if (!isValidLuhn(cardNumberDigits)) {
        window.alert('Enter a valid card number.');
        return;
      }
      if (!expiryParts) {
        window.alert('Enter a valid expiry in MM/YY format.');
        return;
      }
      if (!/^\d{3,4}$/.test(cvvDigits)) {
        window.alert('Enter a valid CVV (3 or 4 digits).');
        return;
      }
      paymentDetails = {
        cardholder_name: cardholderName,
        card_number: cardNumberDigits,
        expiry_month: expiryParts.month,
        expiry_year: expiryParts.year,
        cvv: cvvDigits
      };
    }
    try {
      setPlacingOrder(true);
      const order = await api.publicCreate('checkout', {
        payment_method: selectedPayment,
        ...guest,
        payment_details: paymentDetails
      });
      await load();
      window.alert(`Order placed successfully: ${order?.order_number || order?.id || ''}`);
      setCard({ cardholder_name: '', card_number: '', expiry: '', cvv: '' });
    } catch (err) {
      window.alert(err.message || 'Failed to place order.');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5fbf8_0%,#ffffff_30%,#f7f8fa_100%)] text-[var(--ink)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
        <div className="glass-panel rounded-[28px] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--muted-ink)]">Cart</p>
              <h1 className="font-display mt-2 text-3xl">Review And Checkout</h1>
              <p className="mt-2 text-sm text-[var(--muted-ink)]">
                Update quantities, choose payment method, and place your order.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/')}>Back To Products</Button>
              <Button onClick={() => navigate('/register')}>Sign Up</Button>
            </div>
          </div>
        </div>

        <div className="mt-5 surface-panel rounded-2xl p-4 sm:p-6">
          {loading ? (
            <div className="text-sm text-[var(--muted-ink)]">Loading cart...</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">Items</h2>
                <span className="text-sm text-[var(--muted-ink)]">{cart.total_quantity || 0} items</span>
              </div>

              <div className="mt-3 grid gap-2">
                {(cart.items || []).length === 0 ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-ink)]">
                    Your cart is empty.
                  </div>
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

              <div className="mt-5 border-t border-[var(--border)] pt-4">
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
                  {isCardPayment ? (
                    <>
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--muted-ink)]">
                        Demo test card: `4242 4242 4242 4242` with any future MM/YY and CVV `123`.
                      </div>
                      <Input
                        type="text"
                        placeholder="Cardholder name"
                        value={card.cardholder_name}
                        onChange={(event) => setCard((prev) => ({ ...prev, cardholder_name: event.target.value }))}
                      />
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Card number"
                        value={card.card_number}
                        onChange={(event) => setCard((prev) => ({ ...prev, card_number: event.target.value }))}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="Expiry (MM/YY)"
                          value={card.expiry}
                          onChange={(event) => setCard((prev) => ({ ...prev, expiry: event.target.value }))}
                        />
                        <Input
                          type="password"
                          inputMode="numeric"
                          placeholder="CVV"
                          value={card.cvv}
                          onChange={(event) => setCard((prev) => ({ ...prev, cvv: event.target.value }))}
                        />
                      </div>
                    </>
                  ) : null}
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
                  Want full account access? <Link to="/register" className="underline">Sign up here</Link>.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
