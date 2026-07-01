[README (1).md](https://github.com/user-attachments/files/29557755/README.1.md)
# 🛒 Sokoni — Delivery Platform

**Full-stack delivery marketplace for Tanzania**  
Food · Groceries · Supermarkets · Pharmacies

Built with: HTML/CSS/JS · Supabase · Google Sheets · Africa's Talking · Leaflet Maps · GitHub Pages

Live at: `https://alvincharles824-rgb.github.io/msosi--app/`

---

## 📁 All Files

### 🌐 Web Portals (HTML)

| File | URL | Login |
|------|-----|-------|
| `index.html` | `/` | Sign up as customer |
| `admin.html` | `/admin.html` | admin@sokoni.co.tz / admin123 |
| `vendor.html` | `/vendor.html` | any email / vendor123 |
| `customer-service.html` | `/customer-service.html` | any email / cs123 |
| `driver.html` | `/driver.html` | any email / driver123 |

### ⚙️ JavaScript Modules

| File | Purpose |
|------|---------|
| `payment.js` | M-Pesa, Tigo Pesa, Airtel Money checkout |
| `sms.js` | SMS notifications via Africa's Talking |
| `sw.js` | Service Worker — PWA offline support |

### 📦 PWA

| File | Purpose |
|------|---------|
| `manifest.json` | Makes app installable on mobile home screen |
| `sw.js` | Caches pages for offline use |

### 🗄️ Database (SQL)

| File | Purpose |
|------|---------|
| `schema.sql` | Full Supabase schema — run once |
| `fix_patch.sql` | Nuclear reset patch — run if schema errors |
| `cs_orders_table.sql` | Customer service orders table |

### 📊 Automation

| File | Purpose |
|------|---------|
| `daily_report_script.gs` | Google Apps Script — auto-fills Google Sheets daily |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SOKONI PLATFORM                         │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   Customer   │    Vendor    │    Admin     │  Customer Svc │
│  index.html  │ vendor.html  │  admin.html  │   cs.html     │
└──────┬───────┴──────┬───────┴──────┬───────┴───────┬───────┘
       │              │              │               │
       └──────────────┴──────────────┴───────────────┘
                              │
                    ┌─────────┴──────────┐
                    │   Supabase Backend │
                    │  ppzrofbkwzxbd...  │
                    ├────────────────────┤
                    │ profiles           │
                    │ shops              │
                    │ products           │
                    │ orders             │
                    │ subscriptions      │
                    │ reviews            │
                    │ cs_orders          │
                    └─────────┬──────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
   ┌──────┴──────┐   ┌────────┴──────┐   ┌───────┴──────┐
   │ Google Sheet│   │ Africa's Talk │   │  Driver App  │
   │  Auto Report│   │ SMS Notifs    │   │  driver.html │
   │  Midnight   │   │ All networks  │   │  Live Map    │
   └─────────────┘   └───────────────┘   └──────────────┘
```

---

## 🗄️ Database Tables

| Table | Description |
|-------|-------------|
| `profiles` | All users — customers, vendors, admins |
| `shops` | Vendor shop listings with GPS coordinates |
| `products` | Items listed by each shop |
| `orders` | Customer orders with status tracking |
| `subscriptions` | Vendor plans — 30-day free trial auto-enrolled |
| `reviews` | Customer ratings per order |
| `cs_orders` | Customer service order tracking (separate from main orders) |

### cs_orders Columns
```
id, customer_name, customer_phone, vendor, driver_name, driver_phone,
order_type, shift, total_amount, payment_method, delivery_address,
notes, status, cancel_reason, vendor_lat, vendor_lng,
customer_lat, customer_lng, created_at, updated_at
```

---

## 🔐 Credentials & Keys

### Supabase
```
Project URL : https://ppzrofbkwzxbdahtcybu.supabase.co
Anon Key    : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...IGHY
```

### Google Sheets
```
Sheet ID    : 1V95JmQkgaK3i04GFU_TIsqv4jfscx-3dO0tMzl1R4Cs
Webhook URL : https://script.google.com/macros/s/AKfycbzep9TaadQVSC9F4dD-tulz3isYPVAcvdLKyCiGvLDmRR3GKD1cI3WsPlQiYJZgRv36/exec
Trigger     : Daily at midnight (setupDailyTrigger ✅ done)
```

### Africa's Talking (SMS)
```
Status      : Not yet configured
Sign up at  : africastalking.com
Set in      : sms.js → SMS_CONFIG.apiKey / username
Sandbox     : true (flip to false when going live)
```

### M-Pesa / Mobile Money
```
Status      : Demo mode (simulates 5-second payment)
M-Pesa API  : developer.vodacom.co.tz
Selcom API  : selcom.net/developer (covers all TZ networks)
Set in      : payment.js → PAYMENT_CONFIG
```

---

## 📱 PWA — Mobile App Install

Files needed: `manifest.json` + `sw.js` (both uploaded ✅)

When customers open the site on their phone:
- A banner appears: **"📱 Install Sokoni App"**
- Clicking Install adds it to home screen
- Works offline (cached pages)
- Feels like a native app (no browser bar)

---

## 🚗 Order Flow (End to End)

```
1. Customer browses shops on index.html
2. Adds items to cart
3. Clicks checkout → Payment modal (M-Pesa/Tigo/Cash)
4. Payment confirmed → Order saved to Supabase
5. Customer Service sees order in customer-service.html
6. CS moves order: Received → Accepted → Cooking → Ready
7. SMS sent to customer at each stage automatically
8. Driver sees order in driver.html (status: Ready)
9. Driver accepts → map shows vendor + customer locations
10. Driver picks up → taps "I Picked Up" → status: On the Way
11. SMS sent to customer: "Liko njiani! Dereva: Juma..."
12. Driver delivers → taps "Order Delivered"
13. Google Sheets updated automatically
14. At midnight → full daily report generated in 4 sheet tabs
```

---

## 📊 Google Sheets — 4 Auto-Filled Tabs

| Tab | What fills in |
|-----|--------------|
| `DAILY ODER REPORT` | Day + Night orders side by side, totals |
| `ODER TYPE` | Every order by Food/Grocery/Supermarket/Pharmacy |
| `CANCELED ODER` | Cancellations with reason + amount lost |
| `DELIVERY MAN REPORT` | Per driver: trips, revenue, cancellations |

Triggers:
- **Instant** — every order recorded syncs via webhook
- **Midnight** — full daily summary auto-generated

---

## 💰 Business Model

| Revenue Stream | Rate |
|---------------|------|
| Platform commission | 10% per delivered order |
| Basic vendor subscription | TZS 25,000/month |
| Pro vendor subscription | TZS 55,000/month |
| Free trial (all new vendors) | 30 days |
| Driver cut | 15% per delivery |

---

## 🗺️ Map Features

- **Leaflet.js** + CartoDB dark tiles (free, no API key)
- Customer location via browser geolocation
- Shop markers clickable — opens product panel
- Driver map shows vendor + customer with route line
- `nearby_shops()` SQL function for distance calculation
- **Open Navigation** → Google Maps turn-by-turn

---

## 📦 Order Status Stages

```
received → accepted → cooking → ready → on the way → delivered
                                                    ↘ cancelled
```

Each stage change:
- Updates Supabase instantly
- Moves card in Kanban board (customer-service.html)
- Sends SMS to customer
- Updates driver app in real time

---

## 💳 Payment Methods

| Method | Status |
|--------|--------|
| M-Pesa (Vodacom) | Demo mode — connect via Daraja API |
| Tigo Pesa | Demo mode — connect via Selcom |
| Airtel Money | Demo mode — connect via Selcom |
| Cash on Delivery | ✅ Live |

---

## 🔔 SMS Templates (Swahili)

| Event | Message |
|-------|---------|
| Order received | "Habari [name]! Agizo #X limepokelewa..." |
| On the way | "Liko njiani! Dereva: [name] ([phone])..." |
| Delivered | "Limefikia! Asante kwa kutumia Sokoni..." |
| Cancelled | "Limefutwa. Sababu: [reason]..." |
| New order (driver) | "Agizo jipya #X kutoka [vendor]..." |

---

## 🚀 Deployment Checklist

- [x] GitHub repo: `alvincharles824-rgb/msosi--app`
- [x] GitHub Pages enabled (main branch)
- [x] Supabase project connected
- [x] Database schema created (all 7 tables)
- [x] GPS columns added to cs_orders
- [x] Email confirmation enabled in Supabase Auth
- [x] Google Apps Script deployed as Web App
- [x] Daily midnight trigger set
- [x] PWA manifest + service worker uploaded
- [ ] Africa's Talking API key configured
- [ ] M-Pesa/Selcom API keys configured
- [ ] Custom domain (optional: sokoni.co.tz)

---

## 📂 GitHub Repo File List

```
msosi--app/
├── index.html              ← Customer app
├── admin.html              ← Admin dashboard
├── vendor.html             ← Vendor portal
├── customer-service.html   ← CS Kanban board
├── driver.html             ← Driver navigation app
├── payment.js              ← Mobile money checkout
├── sms.js                  ← SMS notifications
├── sw.js                   ← Service worker (PWA)
├── manifest.json           ← PWA manifest
├── schema.sql              ← Database schema
├── fix_patch.sql           ← DB reset patch
├── cs_orders_table.sql     ← CS orders table
├── daily_report_script.gs  ← Google Apps Script
└── README.md               ← This file
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend/DB | Supabase (PostgreSQL + Auth + Realtime) |
| Maps | Leaflet.js + CartoDB dark tiles |
| Hosting | GitHub Pages (free) |
| Payments | M-Pesa Daraja API / Selcom API |
| SMS | Africa's Talking |
| Reports | Google Sheets + Apps Script |
| PWA | Web App Manifest + Service Worker |

---

## 👤 Project Info

**Developer:** Alvin Charles  
**University:** Ardhi University, Dar es Salaam  
**Country:** Tanzania 🇹🇿  
**Started:** June 2025  
**Status:** Live & in development

---

*Built in Tanzania 🇹🇿 · Powered by Supabase · © Sokoni 2025*
