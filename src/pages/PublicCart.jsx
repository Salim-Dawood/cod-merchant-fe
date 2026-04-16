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

const emptyAddress = {
  label: '',
  contact_name: '',
  contact_phone: '',
  street_address: '',
  city: '',
  state: '',
  postal_code: '',
  country: ''
};

export default function PublicCartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total_amount: 0, total_quantity: 0 });
  const [selectedPayment, setSelectedPayment] = useState('credit_card');
  const [customer, setCustomer] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [shippingAddress, setShippingAddress] = useState({ ...emptyAddress, label: 'Shipping' });
  const [billingAddress, setBillingAddress] = useState({ ...emptyAddress, label: 'Billing' });
  const [useShippingAsBilling, setUseShippingAsBilling] = useState(true);
  const [card, setCard] = useState({ cardholder_name: '', card_number: '', expiry: '', cvv: '' });
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [message, setMessage] = useState(null);
  const [step, setStep] = useState(1);

  const load = async () => {
    try {
      setLoading(true);
      const cartData = await api.publicList('cart');
      setCart(cartData && typeof cartData === 'object' ? cartData : { items: [], total_amount: 0, total_quantity: 0 });
    } catch {
      setCart({ items: [], total_amount: 0, total_quantity: 0 });
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
      setMessage(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update cart quantity.' });
    }
  };

  const removeItem = async (itemId) => {
    try {
      const next = await api.publicRemove('cart/items', itemId);
      setCart(next || { items: [], total_amount: 0, total_quantity: 0 });
      setMessage(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to remove item from cart.' });
    }
  };

  const goToInfoStep = () => {
    if (!(cart.items || []).length) {
      setMessage({ type: 'error', text: 'Your cart is empty.' });
      return;
    }
    setMessage(null);
    setStep(2);
  };

  const goToPaymentStep = () => {
    if (!customer.first_name.trim() || !customer.last_name.trim()) {
      setMessage({ type: 'error', text: 'First name and last name are required.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) {
      setMessage({ type: 'error', text: 'Valid email is required to receive order confirmation.' });
      return;
    }
    if (!shippingAddress.street_address.trim()) {
      setMessage({ type: 'error', text: 'Shipping street address is required.' });
      return;
    }
    if (!useShippingAsBilling && !billingAddress.street_address.trim()) {
      setMessage({ type: 'error', text: 'Billing street address is required.' });
      return;
    }
    setMessage(null);
    setStep(3);
  };

  const checkout = async () => {
    if (!cart.items?.length) {
      setMessage({ type: 'error', text: 'Your cart is empty.' });
      return;
    }
    if (selectedPayment !== 'credit_card') {
      setMessage({ type: 'error', text: 'Credit card payment is required for checkout.' });
      return;
    }

    const cardholderName = String(card.cardholder_name || '').trim();
    const cardNumberDigits = normalizeDigits(card.card_number);
    const expiryParts = parseExpiry(card.expiry);
    const cvvDigits = normalizeDigits(card.cvv);
    if (!cardholderName) {
      setMessage({ type: 'error', text: 'Cardholder name is required.' });
      return;
    }
    if (!isValidLuhn(cardNumberDigits)) {
      setMessage({ type: 'error', text: 'Enter a valid card number.' });
      return;
    }
    if (!expiryParts) {
      setMessage({ type: 'error', text: 'Enter a valid expiry in MM/YY format.' });
      return;
    }
    if (!/^\d{3,4}$/.test(cvvDigits)) {
      setMessage({ type: 'error', text: 'Enter a valid CVV (3 or 4 digits).' });
      return;
    }

    const payload = {
      payment_method: selectedPayment,
      first_name: customer.first_name.trim(),
      last_name: customer.last_name.trim(),
      email: customer.email.trim(),
      phone: customer.phone.trim() || null,
      use_shipping_as_billing: useShippingAsBilling,
      shipping_address: {
        ...shippingAddress,
        label: shippingAddress.label || 'Shipping',
        street_address: shippingAddress.street_address.trim()
      },
      billing_address: useShippingAsBilling
        ? {
            ...shippingAddress,
            label: 'Billing',
            street_address: shippingAddress.street_address.trim()
          }
        : {
            ...billingAddress,
            label: billingAddress.label || 'Billing',
            street_address: billingAddress.street_address.trim()
          },
      payment_details: {
        cardholder_name: cardholderName,
        card_number: cardNumberDigits,
        expiry_month: expiryParts.month,
        expiry_year: expiryParts.year,
        cvv: cvvDigits
      }
    };

    try {
      setPlacingOrder(true);
      const order = await api.publicCreate('checkout', payload);
      await load();
      setMessage({
        type: 'success',
        text: `Order placed successfully: ${order?.order_number || order?.id || ''}. Confirmation was sent to ${payload.email}.`
      });
      setCard({ cardholder_name: '', card_number: '', expiry: '', cvv: '' });
      setStep(1);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to place order.' });
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
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--muted-ink)]">Checkout</p>
              <h1 className="font-display mt-2 text-3xl">Cart Preview And Payment</h1>
              <p className="mt-2 text-sm text-[var(--muted-ink)]">
                Step 1: Cart Preview. Step 2: User + Shipping + Billing. Step 3: Credit Card.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/')}>Back To Products</Button>
              <Button onClick={() => navigate('/login')}>Login</Button>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs sm:text-sm">
          <div className={`rounded-xl border px-3 py-2 text-center ${step === 1 ? 'border-[var(--ink)] bg-[var(--surface)]' : 'border-[var(--border)] bg-[var(--surface-soft)]'}`}>
            1. Cart
          </div>
          <div className={`rounded-xl border px-3 py-2 text-center ${step === 2 ? 'border-[var(--ink)] bg-[var(--surface)]' : 'border-[var(--border)] bg-[var(--surface-soft)]'}`}>
            2. User + Address
          </div>
          <div className={`rounded-xl border px-3 py-2 text-center ${step === 3 ? 'border-[var(--ink)] bg-[var(--surface)]' : 'border-[var(--border)] bg-[var(--surface-soft)]'}`}>
            3. Card
          </div>
        </div>

        <div className="mt-5 surface-panel rounded-2xl p-4 sm:p-6">
          {loading ? (
            <div className="text-sm text-[var(--muted-ink)]">Loading cart...</div>
          ) : (
            <>
              {message ? (
                <div
                  className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                    message.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {message.text}
                </div>
              ) : null}

              {step === 1 ? (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl">Cart Preview</h2>
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
                    <Button className="mt-3 w-full" onClick={goToInfoStep} disabled={!(cart.items || []).length}>
                      Proceed To User Information
                    </Button>
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <div className="grid gap-4">
                  <h2 className="font-display text-xl">User Information, Shipping, Billing</h2>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Input
                      type="text"
                      placeholder="First name"
                      value={customer.first_name}
                      onChange={(event) => setCustomer((prev) => ({ ...prev, first_name: event.target.value }))}
                    />
                    <Input
                      type="text"
                      placeholder="Last name"
                      value={customer.last_name}
                      onChange={(event) => setCustomer((prev) => ({ ...prev, last_name: event.target.value }))}
                    />
                    <Input
                      type="email"
                      placeholder="Email (required for confirmation)"
                      value={customer.email}
                      onChange={(event) => setCustomer((prev) => ({ ...prev, email: event.target.value }))}
                    />
                    <Input
                      type="text"
                      placeholder="Phone"
                      value={customer.phone}
                      onChange={(event) => setCustomer((prev) => ({ ...prev, phone: event.target.value }))}
                    />
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <h3 className="text-sm font-semibold">Shipping Address</h3>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <Input
                        type="text"
                        placeholder="Street address *"
                        value={shippingAddress.street_address}
                        onChange={(event) => setShippingAddress((prev) => ({ ...prev, street_address: event.target.value }))}
                      />
                      <Input
                        type="text"
                        placeholder="City"
                        value={shippingAddress.city}
                        onChange={(event) => setShippingAddress((prev) => ({ ...prev, city: event.target.value }))}
                      />
                      <Input
                        type="text"
                        placeholder="State"
                        value={shippingAddress.state}
                        onChange={(event) => setShippingAddress((prev) => ({ ...prev, state: event.target.value }))}
                      />
                      <Input
                        type="text"
                        placeholder="Postal code"
                        value={shippingAddress.postal_code}
                        onChange={(event) => setShippingAddress((prev) => ({ ...prev, postal_code: event.target.value }))}
                      />
                      <Input
                        type="text"
                        placeholder="Country"
                        value={shippingAddress.country}
                        onChange={(event) => setShippingAddress((prev) => ({ ...prev, country: event.target.value }))}
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-[var(--muted-ink)]">
                    <input
                      type="checkbox"
                      checked={useShippingAsBilling}
                      onChange={(event) => setUseShippingAsBilling(event.target.checked)}
                    />
                    Billing address is the same as shipping.
                  </label>

                  {!useShippingAsBilling ? (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                      <h3 className="text-sm font-semibold">Billing Address</h3>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <Input
                          type="text"
                          placeholder="Street address *"
                          value={billingAddress.street_address}
                          onChange={(event) => setBillingAddress((prev) => ({ ...prev, street_address: event.target.value }))}
                        />
                        <Input
                          type="text"
                          placeholder="City"
                          value={billingAddress.city}
                          onChange={(event) => setBillingAddress((prev) => ({ ...prev, city: event.target.value }))}
                        />
                        <Input
                          type="text"
                          placeholder="State"
                          value={billingAddress.state}
                          onChange={(event) => setBillingAddress((prev) => ({ ...prev, state: event.target.value }))}
                        />
                        <Input
                          type="text"
                          placeholder="Postal code"
                          value={billingAddress.postal_code}
                          onChange={(event) => setBillingAddress((prev) => ({ ...prev, postal_code: event.target.value }))}
                        />
                        <Input
                          type="text"
                          placeholder="Country"
                          value={billingAddress.country}
                          onChange={(event) => setBillingAddress((prev) => ({ ...prev, country: event.target.value }))}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button variant="outline" onClick={() => setStep(1)}>Back To Cart</Button>
                    <Button onClick={goToPaymentStep}>Proceed To Card Payment</Button>
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="grid gap-4">
                  <h2 className="font-display text-xl">Credit Card</h2>
                  <select
                    className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]"
                    value={selectedPayment}
                    onChange={(event) => setSelectedPayment(event.target.value)}
                    disabled
                  >
                    <option value="credit_card">Credit Card</option>
                  </select>
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
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button variant="outline" onClick={() => setStep(2)}>Back To Information</Button>
                    <Button onClick={checkout} disabled={placingOrder || !(cart.items || []).length}>
                      {placingOrder ? 'Placing Order...' : 'Place Order'}
                    </Button>
                  </div>
                </div>
              ) : null}

              <p className="mt-4 text-xs text-[var(--muted-ink)]">
                Have an account? <Link to="/login" className="underline">Login</Link>. New user? <Link to="/register" className="underline">Sign up</Link>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
