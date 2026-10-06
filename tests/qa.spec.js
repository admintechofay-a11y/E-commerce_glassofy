const { test, expect } = require('@playwright/test');

const PUBLIC_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/products', name: 'Product Catalogue' },
  { path: '/products/floorspringdoorcloser-glas-p004_02_floorspring_do', name: 'Product Detail' },
  { path: '/cart', name: 'Cart' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/forgot-password', name: 'Forgot Password' },
  { path: '/about', name: 'About Us' },
  { path: '/contact', name: 'Contact' },
  { path: '/shipping', name: 'Shipping Policy' },
  { path: '/returns', name: 'Returns Policy' },
  { path: '/privacy', name: 'Privacy Policy' },
  { path: '/terms', name: 'Terms of Service' },
  { path: '/unknown-route-for-qa-test', name: 'Custom 404 Page' },
];

const ADMIN_ROUTES = [
  { path: '/admin', name: 'Admin Dashboard' },
  { path: '/admin/products', name: 'Admin Products' },
  { path: '/admin/categories', name: 'Admin Categories' },
  { path: '/admin/orders', name: 'Admin Orders' },
  { path: '/admin/users', name: 'Admin Users' },
  { path: '/admin/discounts', name: 'Admin Discounts' },
  { path: '/admin/settings', name: 'Admin Settings' },
  { path: '/admin/audit-logs', name: 'Admin Audit Logs' },
  { path: '/admin/whatsapp-inbox', name: 'Admin WhatsApp Inbox' },
  { path: '/admin/whatsapp-whitelist', name: 'Admin WhatsApp Whitelist' },
];

test.describe('Glassofy QA Audit: Public Storefront Routes', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`QA Check on ${route.name} (${route.path})`, async ({ page, request }) => {
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          // Ignore external connection / third-party font noise if any
          const text = msg.text();
          if (!text.includes('Failed to load resource') && !text.includes('Razorpay')) {
            consoleErrors.push(text);
          }
        }
      });

      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      expect(response.status()).toBeLessThan(400);

      // 1. Check Horizontal Scrolling: scrollWidth <= innerWidth
      await page.waitForTimeout(500); // Allow any layout calculations
      const scrollCheck = await page.evaluate(() => {
        const docElem = document.documentElement;
        return {
          scrollWidth: docElem.scrollWidth,
          clientWidth: docElem.clientWidth,
          innerWidth: window.innerWidth,
          isNoScroll: docElem.scrollWidth <= window.innerWidth + 1, // 1px sub-pixel tolerance
        };
      });
      expect(
        scrollCheck.isNoScroll,
        `Page ${route.path} has horizontal scroll! (scrollWidth: ${scrollCheck.scrollWidth}, innerWidth: ${scrollCheck.innerWidth})`
      ).toBeTruthy();

      // 2. Check <title> is non-empty
      const title = await page.title();
      expect(title.trim().length).toBeGreaterThan(0);

      // 3. Check <meta name="description"> is present and non-empty
      const metaDesc = await page.$eval('meta[name="description"]', (el) => el.getAttribute('content')).catch(() => null);
      expect(metaDesc, `Meta description missing on ${route.path}`).not.toBeNull();
      expect(metaDesc.trim().length).toBeGreaterThan(0);

      // 4. Verify Favicon loads
      const faviconResponse = await request.get('/favicon.ico');
      expect(faviconResponse.status()).toBe(200);

      // 5. Zero unhandled console errors
      expect(consoleErrors, `Console errors on ${route.path}: ${consoleErrors.join(' | ')}`).toHaveLength(0);
    });
  }
});

test.describe('Glassofy QA Audit: Internal Links Integrity', () => {
  test('Crawl and verify all internal links on Home page return valid HTTP responses', async ({ page, request }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors
        .map((a) => a.getAttribute('href'))
        .filter((href) => href && href.startsWith('/') && !href.startsWith('/#') && !href.startsWith('//'));
    });

    const uniqueLinks = Array.from(new Set(links));
    console.log(`Found ${uniqueLinks.length} unique internal links on Home page to test.`);

    for (const link of uniqueLinks) {
      // Don't test parameterized product link if slug is fake
      const res = await request.get(link);
      expect(
        res.status(),
        `Internal link ${link} returned HTTP ${res.status()}`
      ).toBeLessThan(400);
    }
  });
});

test.describe('Glassofy QA Audit: Admin Protected Routes', () => {
  test.beforeEach(async ({ page, request }) => {
    // Authenticate directly via API to set authentication cookies seamlessly
    const loginRes = await request.post('http://localhost:5000/api/auth/login', {
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
      await page.context().addCookies(cookiesToAdd);
    }
  });

  for (const route of ADMIN_ROUTES) {
    test(`QA Check on Admin ${route.name} (${route.path})`, async ({ page }) => {
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!text.includes('Failed to load resource')) {
            consoleErrors.push(text);
          }
        }
      });

      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      // 1. Check Horizontal Scrolling
      const scrollCheck = await page.evaluate(() => {
        const docElem = document.documentElement;
        return {
          scrollWidth: docElem.scrollWidth,
          clientWidth: docElem.clientWidth,
          innerWidth: window.innerWidth,
          isNoScroll: docElem.scrollWidth <= window.innerWidth + 1,
        };
      });
      expect(
        scrollCheck.isNoScroll,
        `Admin Page ${route.path} has horizontal scroll! (scrollWidth: ${scrollCheck.scrollWidth}, innerWidth: ${scrollCheck.innerWidth})`
      ).toBeTruthy();

      // 2. Check <title> is non-empty
      const title = await page.title();
      expect(title.trim().length).toBeGreaterThan(0);

      // 3. Check <meta name="description"> is present and non-empty
      const metaDesc = await page.$eval('meta[name="description"]', (el) => el.getAttribute('content')).catch(() => null);
      expect(metaDesc, `Meta description missing on ${route.path}`).not.toBeNull();
      expect(metaDesc.trim().length).toBeGreaterThan(0);

      // 4. Zero console errors
      expect(consoleErrors, `Console errors on admin ${route.path}: ${consoleErrors.join(' | ')}`).toHaveLength(0);
    });
  }
});
