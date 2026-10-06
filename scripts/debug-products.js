const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGE ERROR] ${err.message}`));
  
  await page.goto('http://localhost:3000/products', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'reports/products-debug.png' });
  
  const errorEl = await page.$('.bg-rose-500\\/10');
  const errorText = errorEl ? await errorEl.innerText() : null;
  
  const cards = await page.$$('.group');
  const images = await page.$$eval('img', imgs => imgs.map(i => ({ 
    src: i.src, 
    naturalWidth: i.naturalWidth, 
    naturalHeight: i.naturalHeight, 
    complete: i.complete,
    alt: i.alt 
  })));
  
  console.log('Error text:', errorText);
  console.log('Images found on page:', images.length);
  console.log('Sample images:', JSON.stringify(images.slice(0, 10), null, 2));
  console.log('Console logs:', logs);
  
  await browser.close();
})();
