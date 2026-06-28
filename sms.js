// ============================================================
// SOKONI — SMS NOTIFICATION MODULE
// Provider: Africa's Talking (africastalking.com)
// Covers: Vodacom, Tigo, Airtel, Halotel Tanzania
// ============================================================

const SMS_CONFIG = {
  // Get these free at: africastalking.com/Tanzania
  apiKey: 'YOUR_AT_API_KEY',
  username: 'YOUR_AT_USERNAME', // e.g. 'sokoni'
  senderId: 'Sokoni',           // Your registered sender ID
  // Sandbox URL for testing:
  sandboxUrl: 'https://api.sandbox.africastalking.com/version1/messaging',
  // Production URL (use after going live):
  productionUrl: 'https://api.africastalking.com/version1/messaging',
  sandbox: true, // Set to false when going live
};

// ── SMS TEMPLATES ──
const SMS_TEMPLATES = {

  // Customer messages
  order_received: (name, orderId, vendor) =>
    `Habari ${name}! Agizo lako #${orderId} kutoka ${vendor} limepokelewa. Tutakujulisha hali yake. - Sokoni`,

  order_confirmed: (name, orderId) =>
    `${name}, agizo #${orderId} limethibitishwa! Duka limeanza kuliandaa. - Sokoni`,

  order_cooking: (name, orderId, vendor) =>
    `${name}, ${vendor} wanaandaa agizo lako #${orderId}. Itachukua dakika 15-30. - Sokoni`,

  order_ready: (name, orderId) =>
    `${name}, agizo #${orderId} liko tayari! Dereva atakuchukulia sasa hivi. - Sokoni`,

  order_on_the_way: (name, orderId, driverName, driverPhone) =>
    `${name}, agizo #${orderId} liko njiani! Dereva: ${driverName} (${driverPhone}). Muda: dakika 20-40. - Sokoni`,

  order_delivered: (name, orderId, amount) =>
    `${name}, agizo #${orderId} limefikia! Asante kwa kutumia Sokoni. Thamani: TZS ${parseInt(amount).toLocaleString()}. - Sokoni`,

  order_cancelled: (name, orderId, reason) =>
    `${name}, agizo #${orderId} limefutwa. Sababu: ${reason}. Wasiliana nasi: +255XXX. - Sokoni`,

  // English versions
  order_received_en: (name, orderId, vendor) =>
    `Hi ${name}! Order #${orderId} from ${vendor} received. We'll keep you updated. - Sokoni`,

  order_on_the_way_en: (name, orderId, driverName, driverPhone) =>
    `${name}, Order #${orderId} is on the way! Driver: ${driverName} (${driverPhone}). ETA: 20-40 mins. - Sokoni`,

  order_delivered_en: (name, orderId, amount) =>
    `${name}, Order #${orderId} delivered! Thank you for using Sokoni. Amount: TZS ${parseInt(amount).toLocaleString()}. - Sokoni`,

  // Driver messages
  new_order_driver: (driverName, orderId, vendor, address) =>
    `${driverName}, agizo jipya #${orderId} kutoka ${vendor} kwa ${address}. Fungua app: sokoni.app/driver - Sokoni`,

  order_ready_driver: (driverName, orderId, vendor) =>
    `${driverName}, agizo #${orderId} liko tayari kwa ${vendor}. Nenda kuchukua sasa! - Sokoni`,

  // OTP / Auth
  otp: (code) =>
    `Msimbo wako wa Sokoni ni: ${code}. Halali kwa dakika 10. Usimwambie mtu. - Sokoni`,
};

// ============================================================
// SEND SMS FUNCTION
// ============================================================
async function sendSMS(phone, message) {
  // Format Tanzania phone number
  const formattedPhone = formatSMSPhone(phone);
  if (!formattedPhone) {
    console.error('Invalid phone for SMS:', phone);
    return { success: false, error: 'Invalid phone number' };
  }

  const url = SMS_CONFIG.sandbox
    ? SMS_CONFIG.sandboxUrl
    : SMS_CONFIG.productionUrl;

  try {
    const params = new URLSearchParams({
      username: SMS_CONFIG.username,
      to: formattedPhone,
      message: message,
      from: SMS_CONFIG.senderId,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apiKey': SMS_CONFIG.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (data.SMSMessageData?.Recipients?.[0]?.status === 'Success') {
      console.log(`✅ SMS sent to ${formattedPhone}`);
      return { success: true, messageId: data.SMSMessageData.Recipients[0].messageId };
    } else {
      console.error('SMS failed:', data);
      return { success: false, error: data.SMSMessageData?.Message || 'SMS failed' };
    }
  } catch (err) {
    console.error('SMS error:', err);
    return { success: false, error: err.message };
  }
}

// ── SEND BULK SMS ──
async function sendBulkSMS(recipients) {
  // recipients = [{phone, message}, ...]
  const results = await Promise.allSettled(
    recipients.map(r => sendSMS(r.phone, r.message))
  );
  return results;
}

// ============================================================
// ORDER STATUS NOTIFICATIONS
// Call these from customer-service.html when status changes
// ============================================================

async function notifyOrderReceived(order) {
  await sendSMS(
    order.customer_phone,
    SMS_TEMPLATES.order_received(
      order.customer_name?.split(' ')[0] || 'Mteja',
      order.id,
      order.vendor
    )
  );
}

async function notifyOrderConfirmed(order) {
  await sendSMS(
    order.customer_phone,
    SMS_TEMPLATES.order_confirmed(
      order.customer_name?.split(' ')[0] || 'Mteja',
      order.id
    )
  );
}

async function notifyOrderCooking(order) {
  await sendSMS(
    order.customer_phone,
    SMS_TEMPLATES.order_cooking(
      order.customer_name?.split(' ')[0] || 'Mteja',
      order.id,
      order.vendor
    )
  );
}

async function notifyOrderReady(order) {
  // Notify customer
  await sendSMS(
    order.customer_phone,
    SMS_TEMPLATES.order_ready(
      order.customer_name?.split(' ')[0] || 'Mteja',
      order.id
    )
  );
  // Notify driver if assigned
  if (order.driver_phone) {
    await sendSMS(
      order.driver_phone,
      SMS_TEMPLATES.order_ready_driver(
        order.driver_name?.split(' ')[0] || 'Dereva',
        order.id,
        order.vendor
      )
    );
  }
}

async function notifyOrderOnTheWay(order) {
  await sendSMS(
    order.customer_phone,
    SMS_TEMPLATES.order_on_the_way(
      order.customer_name?.split(' ')[0] || 'Mteja',
      order.id,
      order.driver_name || 'Dereva',
      order.driver_phone || ''
    )
  );
}

async function notifyOrderDelivered(order) {
  await sendSMS(
    order.customer_phone,
    SMS_TEMPLATES.order_delivered(
      order.customer_name?.split(' ')[0] || 'Mteja',
      order.id,
      order.total_amount
    )
  );
}

async function notifyOrderCancelled(order, reason) {
  await sendSMS(
    order.customer_phone,
    SMS_TEMPLATES.order_cancelled(
      order.customer_name?.split(' ')[0] || 'Mteja',
      order.id,
      reason || order.cancel_reason || 'Haijulikani'
    )
  );
}

async function notifyNewOrderDriver(order) {
  if (!order.driver_phone) return;
  await sendSMS(
    order.driver_phone,
    SMS_TEMPLATES.new_order_driver(
      order.driver_name?.split(' ')[0] || 'Dereva',
      order.id,
      order.vendor,
      order.delivery_address
    )
  );
}

// ── SEND OTP ──
async function sendOTP(phone) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const result = await sendSMS(phone, SMS_TEMPLATES.otp(code));
  if (result.success) {
    // Store OTP in session (in production use Supabase)
    sessionStorage.setItem('otp_code', code);
    sessionStorage.setItem('otp_phone', phone);
    sessionStorage.setItem('otp_expires', Date.now() + 600000);
  }
  return { success: result.success, code }; // Don't return code in production!
}

function verifyOTP(inputCode) {
  const stored = sessionStorage.getItem('otp_code');
  const expires = parseInt(sessionStorage.getItem('otp_expires') || '0');
  if (Date.now() > expires) return { valid: false, error: 'OTP expired' };
  if (inputCode === stored) {
    sessionStorage.removeItem('otp_code');
    return { valid: true };
  }
  return { valid: false, error: 'Incorrect code' };
}

// ============================================================
// AUTO NOTIFY ON STATUS CHANGE
// Wire this into updateOrderStatus() in customer-service.html
// ============================================================
async function notifyStatusChange(order, newStatus) {
  const handlers = {
    received:     () => notifyOrderReceived(order),
    confirmed:    () => notifyOrderConfirmed(order),
    cooking:      () => notifyOrderCooking(order),
    ready:        () => notifyOrderReady(order),
    'on the way': () => notifyOrderOnTheWay(order),
    delivered:    () => notifyOrderDelivered(order),
    cancelled:    () => notifyOrderCancelled(order, order.cancel_reason),
  };
  if (handlers[newStatus]) {
    await handlers[newStatus]();
    console.log(`📱 SMS sent for status: ${newStatus}`);
  }
}

// ============================================================
// HELPER
// ============================================================
function formatSMSPhone(phone) {
  if (!phone) return null;
  phone = phone.replace(/[\s\-\(\)]/g, '');
  if (phone.startsWith('+')) phone = phone.slice(1);
  if (phone.startsWith('0') && phone.length === 10) return '+255' + phone.slice(1);
  if (phone.startsWith('255') && phone.length === 12) return '+' + phone;
  if (phone.startsWith('7') && phone.length === 9) return '+255' + phone;
  return null;
}

// ============================================================
// SMS LOG UI — show in customer service dashboard
// ============================================================
const smsLog = [];

function logSMS(orderId, phone, message, status) {
  smsLog.unshift({ orderId, phone, message, status, time: new Date().toLocaleTimeString() });
  updateSMSLogUI();
}

function updateSMSLogUI() {
  const el = document.getElementById('sms-log');
  if (!el) return;
  el.innerHTML = smsLog.slice(0, 10).map(s => `
    <div style="padding:8px 12px;border-bottom:1px solid #1a1a1a;font-size:.75rem">
      <div style="display:flex;justify-content:space-between;margin-bottom:2px">
        <span style="font-weight:700;color:#FF6B2C">#${s.orderId}</span>
        <span style="color:#666">${s.time}</span>
      </div>
      <div style="color:#888">${s.phone}</div>
      <div style="color:#ccc;margin-top:2px">${s.message.slice(0, 60)}…</div>
      <div style="margin-top:3px">${s.status === 'sent' ?
        '<span style="color:#22c55e">✓ Sent</span>' :
        '<span style="color:#ef4444">✗ Failed</span>'}</div>
    </div>`).join('');
}
