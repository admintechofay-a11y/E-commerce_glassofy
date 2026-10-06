const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getFiles(fullPath, files);
    } else if (/\.(jsx|js|tsx|ts)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const clientFiles = getFiles(path.join(__dirname, '../client/src'));

const definedRoutes = [
  '/',
  '/products',
  '/products/:slug',
  '/cart',
  '/checkout',
  '/order-success/:orderId',
  '/orders',
  '/orders/:id',
  '/register',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/profile',
  '/about',
  '/contact',
  '/shipping',
  '/returns',
  '/privacy',
  '/terms',
  '/admin',
  '/admin/products',
  '/admin/categories',
  '/admin/orders',
  '/admin/users',
  '/admin/discounts',
  '/admin/settings',
  '/admin/audit-logs',
  '/admin/whatsapp-inbox',
  '/admin/whatsapp-whitelist',
];

function isMatch(route, target) {
  // Strip query params
  const cleanTarget = target.split('?')[0].split('#')[0];
  if (route === cleanTarget) return true;

  // Handle parameterized routes
  const routeParts = route.split('/');
  const targetParts = cleanTarget.split('/');
  if (routeParts.length !== targetParts.length) return false;

  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(':')) continue;
    if (routeParts[i] !== targetParts[i]) return false;
  }
  return true;
}

const foundLinks = [];
for (const file of clientFiles) {
  const content = fs.readFileSync(file, 'utf8');

  // Match <Link to="..." or <Link to={`...`}
  const linkMatches = content.matchAll(/to=["'`]([^"'`$]+)["'`]/g);
  for (const m of linkMatches) {
    foundLinks.push({ file: path.relative(path.join(__dirname, '..'), file), target: m[1], type: 'Link' });
  }

  // Match navigate("...")
  const navMatches = content.matchAll(/navigate\(["'`]([^"'`$]+)["'`]\)/g);
  for (const m of navMatches) {
    foundLinks.push({ file: path.relative(path.join(__dirname, '..'), file), target: m[1], type: 'navigate' });
  }

  // Match href="..."
  const hrefMatches = content.matchAll(/href=["']([^"']+)["']/g);
  for (const m of hrefMatches) {
    foundLinks.push({ file: path.relative(path.join(__dirname, '..'), file), target: m[1], type: 'href' });
  }
}

console.log(`Discovered ${foundLinks.length} link/navigation targets across client code.`);

const deadLinks = [];
for (const item of foundLinks) {
  const target = item.target;
  if (!target || target.startsWith('http') || target.startsWith('tel:') || target.startsWith('mailto:') || target.startsWith('#')) {
    continue;
  }

  const matches = definedRoutes.some(route => isMatch(route, target));
  if (!matches) {
    deadLinks.push(item);
  }
}

if (deadLinks.length > 0) {
  console.log('\n❌ DEAD / UNRESOLVED INTERNAL LINKS FOUND:');
  deadLinks.forEach(d => console.log(`  File: ${d.file} -> Target: "${d.target}" (${d.type})`));
} else {
  console.log('\n✅ All internal links lead to valid, existing routes!');
}
