const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PAGES = [
  { name: 'Home', url: 'http://localhost:3000/' },
  { name: 'Product list', url: 'http://localhost:3000/products' },
  { name: 'Product detail', url: 'http://localhost:3000/products/floorspringdoorcloser-glas-p004_02_floorspring_do' },
  { name: 'Cart', url: 'http://localhost:3000/cart' },
  { name: 'Login', url: 'http://localhost:3000/login' },
];

const reportsDir = path.resolve(__dirname, '..', 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

const results = [];

console.log('Starting Lighthouse audits for 5 target routes...\n');

for (const p of PAGES) {
  const safeName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const outputPath = path.join(reportsDir, `lh-${safeName}.json`);

  console.log(`Auditing: ${p.name} (${p.url})...`);

  try {
    const cmd = `npx lighthouse "${p.url}" --output=json --output-path="${outputPath}" --chrome-flags="--headless=new --no-sandbox --disable-gpu" --only-categories=performance,accessibility,best-practices,seo --quiet`;
    execSync(cmd, { stdio: 'inherit', timeout: 120000 });

    if (fs.existsSync(outputPath)) {
      const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      const scores = {
        page: p.name,
        url: p.url,
        performance: Math.round((report.categories.performance?.score || 0) * 100),
        accessibility: Math.round((report.categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((report.categories['best-practices']?.score || 0) * 100),
        seo: Math.round((report.categories.seo?.score || 0) * 100),
      };
      results.push(scores);
      console.log(`✓ ${p.name}: Perf: ${scores.performance} | A11y: ${scores.accessibility} | BP: ${scores.bestPractices} | SEO: ${scores.seo}\n`);
    } else {
      console.error(`✗ Output file not found for ${p.name}`);
    }
  } catch (err) {
    console.error(`Error running Lighthouse on ${p.name}:`, err.message);
  }
}

const summaryPath = path.join(reportsDir, 'lighthouse-summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2), 'utf8');

console.log('\n--- LIGHTHOUSE AUDIT SUMMARY ---');
console.table(results);
