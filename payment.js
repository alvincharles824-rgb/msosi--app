// ============================================================
// SOKONI — MOBILE MONEY PAYMENT MODULE
// Supports: M-Pesa, Tigo Pesa, Airtel Money, Selcom
// ============================================================

const PAYMENT_CONFIG = {
  // ── M-PESA (Vodacom Tanzania - Daraja API) ──
  mpesa: {
    name: 'M-Pesa',
    color: '#00A651',
    logo: '🟢',
    // Get these from: developer.vodacom.co.tz
    consumer_key: 'YOUR_MPESA_CONSUMER_KEY',
    consumer_secret: 'YOUR_MPESA_CONSUMER_SECRET',
    business_shortcode: 'YOUR_SHORTCODE', // e.g. 174379
    passkey: 'YOUR_MPESA_PASSKEY',
    // For Tanzania Daraja: use this base URL
    base_url: 'https://openapi.m-pesa.com',
  },
  // ── SELCOM (covers Tigo Pesa + Airtel + all Tanzania) ──
  selcom: {
    name: 'Selcom',
    color: '#E31E25',
    logo: '🔴',
    // Get from: selcom.net/developer
    api_key: 'YOUR_SELCOM_API_KEY',
    api_secret: 'YOUR_SELCOM_API_SECRET',
    vendor: 'YOUR_SELCOM_VENDOR_ID',
    base_url: 'https://apigw.selcom.net/v1',
  }
};

// ── PAYMENT STATE ──
let paymentState = {
  orderId: null,
  amount: 0,
  phone: null,
  method: null,
  checkInterval: null,
  attempts: 0,
  maxAttempts: 12, // 60 seconds total
};

// ============================================================
// MAIN PAYMENT FUNCTION
// Call this when customer confirms order
// ============================================================
async function initiatePayment(orderId, amount, phone, method, onSuccess, onFail) {
  paymentState = { orderId, amount, phone, method, onSuccess, onFail, attempts: 0, checkInterval: null };

  // Format phone: ensure it starts with 255
  const formattedPhone = formatPhone(phone);
  if (!formattedPhone) {
    onFail('Invalid phone number. Use format: 0712345678 or +255712345678');
    return;
  }

  showPaymentModal(amount, formattedPhone, method);

  try {
    let result;
    if (method === 'mpesa') {
      result = await initiateMpesaSTK(orderId, amount, formattedPhone);
    } else {
      result = await initiateSelcom(orderId, amount, formattedPhone, method);
    }

    if (result.success) {
      updatePaymentModal('pending', formattedPhone);
      startPolling(result.transactionId, onSuccess, onFail);
    } else {
      updatePaymentModal('failed', result.error);
      onFail(result.error);
    }
  } catch (err) {
    updatePaymentModal('failed', err.message);
    onFail(err.message);
  }
}

// ============================================================
// M-PESA STK PUSH (Vodacom Tanzania Daraja)
// ============================================================
async function initiateMpesaSTK(orderId, amount, phone) {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password = btoa(
    PAYMENT_CONFIG.mpesa.business_shortcode +
    PAYMENT_CONFIG.mpesa.passkey +
    timestamp
  );

  // NOTE: This must go through your backend to avoid exposing keys
  // In production, call your server which calls M-Pesa
  const response = await fetch('/api/mpesa/stk-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      amount,
      orderId,
      timestamp,
      password,
    })
  });

  const data = await response.json();

  if (data.ResponseCode === '0') {
    return { success: true, transactionId: data.CheckoutRequestID };
  }
  return { success: false, error: data.ResponseDescription || 'STK push failed' };
}

// ============================================================
// SELCOM API (Tigo Pesa, Airtel Money, M-Pesa via Selcom)
// Selcom is the easiest for Tanzania — covers all networks
// ============================================================
async function initiateSelcom(orderId, amount, phone, method) {
  const methodMap = {
    tigo_pesa: 'TIGOPESA',
    airtel_money: 'AIRTELMONEY',
    mpesa: 'MPESA',
    selcom: 'SELCOM',
  };

  // NOTE: Must go through your backend
  const response = await fetch('/api/selcom/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      amount,
      orderId,
      network: methodMap[method] || 'TIGOPESA',
      currency: 'TZS',
    })
  });

  const data = await response.json();

  if (data.resultcode === '000') {
    return { success: true, transactionId: data.transid };
  }
  return { success: false, error: data.resultdesc || 'Payment failed' };
}

// ============================================================
// POLLING — Check payment status every 5 seconds
// ============================================================
function startPolling(transactionId, onSuccess, onFail) {
  paymentState.checkInterval = setInterval(async () => {
    paymentState.attempts++;

    if (paymentState.attempts >= paymentState.maxAttempts) {
      clearInterval(paymentState.checkInterval);
      updatePaymentModal('timeout');
      onFail('Payment timed out. Please try again.');
      return;
    }

    try {
      const status = await checkPaymentStatus(transactionId);
      if (status === 'completed') {
        clearInterval(paymentState.checkInterval);
        updatePaymentModal('success');
        setTimeout(() => {
          closePaymentModal();
          onSuccess(transactionId);
        }, 2000);
      } else if (status === 'failed' || status === 'cancelled') {
        clearInterval(paymentState.checkInterval);
        updatePaymentModal('failed', 'Payment was cancelled or failed');
        onFail('Payment cancelled');
      }
    } catch (err) {
      console.log('Status check error:', err);
    }
  }, 5000);
}

async function checkPaymentStatus(transactionId) {
  const response = await fetch(`/api/payment/status?id=${transactionId}`);
  const data = await response.json();
  return data.status; // 'pending' | 'completed' | 'failed' | 'cancelled'
}

// ============================================================
// HELPERS
// ============================================================
function formatPhone(phone) {
  if (!phone) return null;
  phone = phone.replace(/\s+/g, '').replace('+', '');
  if (phone.startsWith('0') && phone.length === 10) {
    return '255' + phone.slice(1);
  }
  if (phone.startsWith('255') && phone.length === 12) {
    return phone;
  }
  if (phone.startsWith('7') && phone.length === 9) {
    return '255' + phone;
  }
  return null;
}

function formatTZS(amount) {
  return 'TZS ' + parseInt(amount).toLocaleString();
}

// ============================================================
// PAYMENT MODAL UI
// ============================================================
function injectPaymentStyles() {
  if (document.getElementById('payment-styles')) return;
  const style = document.createElement('style');
  style.id = 'payment-styles';
  style.textContent = `
    .pay-overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:16px;}
    .pay-sheet{background:#181818;border:1px solid #2a2a2a;border-radius:20px 20px 16px 16px;width:100%;max-width:420px;padding:28px;animation:slideUp .3s ease;}
    @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
    .pay-title{font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:1.1rem;color:#f5f5f5;margin-bottom:4px;}
    .pay-sub{font-size:.82rem;color:#666;margin-bottom:20px;}
    .pay-amount{font-size:2rem;font-weight:800;color:#FF6B2C;text-align:center;margin:16px 0;}
    .pay-phone{background:#222;border:1px solid #333;border-radius:10px;padding:14px;display:flex;align-items:center;gap:10px;margin-bottom:16px;}
    .pay-phone-flag{font-size:1.3rem;}
    .pay-phone-num{font-weight:700;color:#f5f5f5;font-size:.95rem;}
    .pay-phone-net{font-size:.72rem;color:#666;margin-top:2px;}
    .pay-status{text-align:center;padding:20px 0;}
    .pay-spinner{width:48px;height:48px;border:3px solid #2a2a2a;border-top-color:#FF6B2C;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 14px;}
    @keyframes spin{to{transform:rotate(360deg)}}
    .pay-status-icon{font-size:3rem;margin-bottom:10px;}
    .pay-status-text{font-weight:700;font-size:.95rem;color:#f5f5f5;margin-bottom:4px;}
    .pay-status-sub{font-size:.78rem;color:#666;}
    .pay-steps{display:flex;flex-direction:column;gap:10px;margin:16px 0;}
    .pay-step{display:flex;align-items:center;gap:10px;font-size:.82rem;color:#666;padding:8px 12px;border-radius:8px;background:#222;}
    .pay-step.active{color:#f5f5f5;background:#1a0800;border:1px solid #FF6B2C33;}
    .pay-step.done{color:#22c55e;}
    .pay-step-num{width:22px;height:22px;border-radius:50%;background:#2a2a2a;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:800;flex-shrink:0;}
    .pay-step.active .pay-step-num{background:#FF6B2C;color:#fff;}
    .pay-step.done .pay-step-num{background:#22c55e;color:#fff;}
    .pay-cancel-btn{width:100%;background:transparent;border:1px solid #2a2a2a;border-radius:10px;padding:12px;color:#666;font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:.85rem;cursor:pointer;margin-top:10px;}
    .pay-cancel-btn:hover{border-color:#ef4444;color:#ef4444;}
    .pay-retry-btn{width:100%;background:#FF6B2C;border:none;border-radius:10px;padding:13px;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:.88rem;cursor:pointer;margin-top:10px;}
    .pay-methods{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
    .pay-method-btn{background:#222;border:2px solid #2a2a2a;border-radius:10px;padding:12px;cursor:pointer;text-align:center;transition:all .2s;}
    .pay-method-btn.selected{border-color:#FF6B2C;background:#1a0800;}
    .pay-method-btn:hover{border-color:#FF6B2C44;}
    .pay-method-icon{font-size:1.5rem;margin-bottom:4px;}
    .pay-method-name{font-size:.72rem;font-weight:700;color:#f5f5f5;}
    .pay-input{width:100%;background:#222;border:1px solid #2a2a2a;border-radius:10px;padding:13px;color:#f5f5f5;font-family:'Plus Jakarta Sans',sans-serif;font-size:.95rem;outline:none;margin-bottom:12px;}
    .pay-input:focus{border-color:#FF6B2C;}
    .pay-btn-primary{width:100%;background:#FF6B2C;border:none;border-radius:10px;padding:14px;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:.95rem;cursor:pointer;}
    .pay-btn-primary:hover{background:#e5571e;}
    .pay-btn-primary:disabled{background:#333;color:#666;cursor:not-allowed;}
  `;
  document.head.appendChild(style);
}

// ── CHECKOUT MODAL (select method + enter phone) ──
function showCheckoutModal(amount, preselectedMethod, onPay) {
  injectPaymentStyles();
  const methods = [
    { id: 'mpesa', name: 'M-Pesa', icon: '🟢', hint: '07xx' },
    { id: 'tigo_pesa', name: 'Tigo Pesa', icon: '🔵', hint: '06xx/07xx' },
    { id: 'airtel_money', name: 'Airtel Money', icon: '🔴', hint: '068x/069x' },
    { id: 'cash', name: 'Cash on Delivery', icon: '💵', hint: 'Pay driver' },
  ];

  let selectedMethod = preselectedMethod || 'mpesa';

  const el = document.createElement('div');
  el.className = 'pay-overlay';
  el.id = 'checkout-modal';
  el.innerHTML = `
    <div class="pay-sheet">
      <div class="pay-title">💳 Complete Payment</div>
      <div class="pay-sub">Select payment method</div>
      <div class="pay-amount">${formatTZS(amount)}</div>
      <div class="pay-methods" id="pay-methods">
        ${methods.map(m => `
          <div class="pay-method-btn ${m.id === selectedMethod ? 'selected' : ''}"
               onclick="selectPayMethod('${m.id}')" id="pm-${m.id}">
            <div class="pay-method-icon">${m.icon}</div>
            <div class="pay-method-name">${m.name}</div>
          </div>`).join('')}
      </div>
      <div id="phone-input-wrap">
        <input class="pay-input" type="tel" id="pay-phone-input"
          placeholder="e.g. 0712 345 678" maxlength="13"
          oninput="validatePayPhone(this)"/>
      </div>
      <button class="pay-btn-primary" id="pay-now-btn" onclick="submitPayment(${amount}, arguments[0], '${JSON.stringify(onPay)}')" disabled>
        Pay ${formatTZS(amount)} →
      </button>
      <button class="pay-cancel-btn" onclick="closeCheckoutModal()">Cancel</button>
    </div>`;
  document.body.appendChild(el);

  // Handle cash — hide phone input
  updatePhoneVisibility(selectedMethod);

  window._payOnSuccess = onPay;
}

function selectPayMethod(method) {
  document.querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('pm-' + method)?.classList.add('selected');
  paymentState.method = method;
  updatePhoneVisibility(method);
  validatePayPhone(document.getElementById('pay-phone-input'));
}

function updatePhoneVisibility(method) {
  const wrap = document.getElementById('phone-input-wrap');
  const btn = document.getElementById('pay-now-btn');
  if (method === 'cash') {
    wrap.style.display = 'none';
    btn.disabled = false;
    btn.textContent = 'Confirm Order (Cash on Delivery)';
  } else {
    wrap.style.display = 'block';
    btn.textContent = `Pay ${formatTZS(paymentState.amount || 0)} →`;
  }
}

function validatePayPhone(input) {
  const btn = document.getElementById('pay-now-btn');
  const val = input?.value?.replace(/\s+/g, '') || '';
  const valid = val.length >= 9;
  if (btn) btn.disabled = !valid && paymentState.method !== 'cash';
}

async function submitPayment(amount) {
  const method = paymentState.method ||
    document.querySelector('.pay-method-btn.selected')?.id?.replace('pm-', '') || 'mpesa';
  const phone = document.getElementById('pay-phone-input')?.value || '';
  const orderId = paymentState.orderId || 'ORD-' + Date.now();

  closeCheckoutModal();

  if (method === 'cash') {
    window._payOnSuccess && window._payOnSuccess('cash', 'CASH_' + Date.now());
    return;
  }

  // Show processing modal
  showPaymentModal(amount, formatPhone(phone) || phone, method);

  // Simulate payment for demo (replace with real API call)
  simulatePayment(method, phone, amount, orderId);
}

// ── DEMO SIMULATOR (remove when real API connected) ──
function simulatePayment(method, phone, amount, orderId) {
  updatePaymentModal('pending', phone);
  // Simulate 5 second processing
  setTimeout(() => {
    updatePaymentModal('success');
    setTimeout(() => {
      closePaymentModal();
      window._payOnSuccess && window._payOnSuccess(method, 'TXN' + Date.now());
    }, 2000);
  }, 5000);
}

function showPaymentModal(amount, phone, method) {
  injectPaymentStyles();
  const methodNames = {mpesa:'M-Pesa',tigo_pesa:'Tigo Pesa',airtel_money:'Airtel Money',cash:'Cash'};
  const el = document.createElement('div');
  el.className = 'pay-overlay';
  el.id = 'payment-modal';
  el.innerHTML = `
    <div class="pay-sheet">
      <div class="pay-title">Processing Payment</div>
      <div class="pay-sub">${methodNames[method] || method} · ${formatTZS(amount)}</div>
      <div class="pay-status" id="pay-status">
        <div class="pay-spinner"></div>
        <div class="pay-status-text">Sending push to your phone…</div>
        <div class="pay-status-sub">Check your phone for a payment prompt</div>
      </div>
      <div class="pay-steps">
        <div class="pay-step active" id="ps-1"><div class="pay-step-num">1</div>Payment request sent to ${phone}</div>
        <div class="pay-step" id="ps-2"><div class="pay-step-num">2</div>Waiting for your confirmation</div>
        <div class="pay-step" id="ps-3"><div class="pay-step-num">3</div>Payment verified</div>
        <div class="pay-step" id="ps-4"><div class="pay-step-num">4</div>Order confirmed</div>
      </div>
      <button class="pay-cancel-btn" onclick="cancelPayment()">Cancel Payment</button>
    </div>`;
  document.body.appendChild(el);
}

function updatePaymentModal(status, msg) {
  const statusEl = document.getElementById('pay-status');
  if (!statusEl) return;

  if (status === 'pending') {
    document.getElementById('ps-1')?.classList.add('done');
    document.getElementById('ps-2')?.classList.add('active');
    statusEl.innerHTML = `
      <div class="pay-spinner"></div>
      <div class="pay-status-text">Confirm on your phone</div>
      <div class="pay-status-sub">Enter your PIN on the popup prompt</div>`;

  } else if (status === 'success') {
    ['ps-1','ps-2','ps-3','ps-4'].forEach(id => {
      document.getElementById(id)?.classList.remove('active');
      document.getElementById(id)?.classList.add('done');
    });
    statusEl.innerHTML = `
      <div class="pay-status-icon">✅</div>
      <div class="pay-status-text" style="color:#22c55e">Payment Successful!</div>
      <div class="pay-status-sub">Your order is being prepared</div>`;

  } else if (status === 'failed') {
    statusEl.innerHTML = `
      <div class="pay-status-icon">❌</div>
      <div class="pay-status-text" style="color:#ef4444">Payment Failed</div>
      <div class="pay-status-sub">${msg || 'Please try again'}</div>
      <button class="pay-retry-btn" onclick="closePaymentModal()">Try Again</button>`;

  } else if (status === 'timeout') {
    statusEl.innerHTML = `
      <div class="pay-status-icon">⏱️</div>
      <div class="pay-status-text" style="color:#f59e0b">Payment Timed Out</div>
      <div class="pay-status-sub">No response received. Please try again.</div>
      <button class="pay-retry-btn" onclick="closePaymentModal()">Try Again</button>`;
  }
}

function closePaymentModal() {
  if (paymentState.checkInterval) clearInterval(paymentState.checkInterval);
  document.getElementById('payment-modal')?.remove();
}

function closeCheckoutModal() {
  document.getElementById('checkout-modal')?.remove();
}

function cancelPayment() {
  closePaymentModal();
}
