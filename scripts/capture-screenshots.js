const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || 'qa/before';
const outPath = path.resolve(process.cwd(), targetDir);

if (!fs.existsSync(outPath)) {
  fs.mkdirSync(outPath, { recursive: true });
}

const PUBLIC_ROUTES = [
  { path: '/', name: 'home' },
  { path: '/products', name: 'products' },
  { path: '/products/floorspringdoorcloser-glas-p004_02_floorspring_do', name: 'product-detail' },
  { path: '/cart', name: 'cart' },
  { path: '/login', name: 'login' },
  { path: '/register', name: 'register' },
  { path: '/forgot-password', name: 'forgot-password' },
  { path: '/about', name: 'about' },
  { path: '/contact', name: 'contact' },
  { path: '/shipping', name: 'shipping' },
  { path: '/returns', name: 'returns' },
  { path: '/privacy', name: 'privacy' },
  { path: '/terms', name: 'terms' },
  { path: '/unknown-route', name: '404' },
];

const ADMIN_ROUTES = [
  { path: '/admin', name: 'admin-dashboard' },
  { path: '/admin/products', name: 'admin-products' },
  { path: '/admin/categories', name: 'admin-categories' },
  { path: '/admin/orders', name: 'admin-orders' },
  { path: '/admin/users', name: 'admin-users' },
  { path: '/admin/discounts', name: 'admin-discounts' },
  { path: '/admin/settings', name: 'admin-settings' },
  { path: '/admin/audit-logs', name: 'admin-audit-logs' },
  { path: '/admin/whatsapp-inbox', name: 'admin-whatsapp-inbox' },
  { path: '/admin/whatsapp-whitelist', name: 'admin-whatsapp-whitelist' },
];

async function capture() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  const viewports = [
    { name: '1440px', width: 1440, height: 900 },
    { name: '375px', width: 375, height: 667 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      baseURL: 'http://localhost:3000',
    });
    const page = await context.newPage();

    // Capture public routes
    for (const r of PUBLIC_ROUTES) {
      try {
        await page.goto(r.path, { waitUntil: 'networkidle', timeout: 15000 });
      } catch (e) {
        await page.goto(r.path, { waitUntil: 'domcontentloaded', timeout: 15000 });
      }
      await page.waitForTimeout(600);
      const filename = path.join(outPath, `${r.name}-${vp.name}.png`);
      await page.screenshot({ path: filename, fullPage: false });
      console.log(`Saved: ${filename}`);
    }

    // Authenticate admin
    try {
      const loginRes = await context.request.post('http://localhost:5000/api/auth/login', {
        data: {
          email: 'admin@glassofy.com',
          password: 'AdminSecurePassword123!',
        },
      });
      const headers = await loginRes.headersArray();
      const cookieHeaders = headers.filter((h) => h.name.toLowerCase() === 'set-cookie');
      const cookiesToAdd = [];
      for (const h of cookieHeaders) {
        const firstPart = h.value.split(';')[0];
        const eqIdx = firstPart.indexOf('=');
        if (eqIdx > 0) {
          cookiesToAdd.push({
            name: firstPart.substring(0, eqIdx).trim(),
            value: firstPart.substring(eqIdx + 1).trim(),
            domain: 'localhost',
            path: '/',
          });
        }
      }
      if (cookiesToAdd.length > 0) {
        await context.addCookies(cookiesToAdd);
      }
    } catch (err) {
      console.error('Failed to log in admin for screenshots:', err.message);
    }

    // Capture admin routes
    for (const r of ADMIN_ROUTES) {
      try {
        await page.goto(r.path, { waitUntil: 'networkidle', timeout: 15000 });
      } catch (e) {
        await page.goto(r.path, { waitUntil: 'domcontentloaded', timeout: 15000 });
      }
      await page.waitForTimeout(600);
      const filename = path.join(outPath, `${r.name}-${vp.name}.png`);
      await page.screenshot({ path: filename, fullPage: false });
      console.log(`Saved: ${filename}`);
    }

    await context.close();
  }

  await browser.close();
  console.log(`Finished capturing screenshots to ${targetDir}`);
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});
