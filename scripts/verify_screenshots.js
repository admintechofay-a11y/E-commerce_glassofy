const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Products page
  console.log('Capturing Products page...');
  await page.goto('http://localhost:3000/products', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/fixed_products_page.png' });

  // 2. Home page scrolled to Signature Highlights
  console.log('Capturing Homepage Featured section...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, 1100));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/fixed_home_featured.png' });

  // 3. Product Detail page
  console.log('Capturing Product Detail page...');
  await page.goto('http://localhost:3000/products', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const firstCard = page.locator('a[href^="/products/"]').first();
  await firstCard.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/fixed_product_detail.png' });

  await browser.close();
  console.log('All verification screenshots saved successfully!');
})();
