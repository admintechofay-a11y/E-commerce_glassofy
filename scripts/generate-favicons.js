const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, '../client/public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Crisp SVG of the Glassofy brand monogram (Ink Black + Brass Gold, no purple)
const createSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="brassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5C78E" />
      <stop offset="50%" stop-color="#B08D57" />
      <stop offset="100%" stop-color="#846535" />
    </linearGradient>
  </defs>
  <!-- Ink background -->
  <rect width="100" height="100" rx="22" fill="#0F1115" />
  <!-- Brass subtle border -->
  <rect x="2" y="2" width="96" height="96" rx="20" fill="none" stroke="url(#brassGrad)" stroke-width="3" />
  <!-- Architectural Geometric Monogram / Glass Fitting Facet -->
  <path d="M50 18 L80 34 L80 66 L50 82 L20 66 L20 34 Z" fill="none" stroke="url(#brassGrad)" stroke-width="4" stroke-linejoin="round" />
  <path d="M50 18 L50 82" stroke="url(#brassGrad)" stroke-width="2.5" stroke-dasharray="3,3" opacity="0.6" />
  <path d="M20 34 L80 66" stroke="url(#brassGrad)" stroke-width="2.5" opacity="0.4" />
  <path d="M20 66 L80 34" stroke="url(#brassGrad)" stroke-width="2.5" opacity="0.4" />
  <circle cx="50" cy="50" r="12" fill="#0F1115" stroke="url(#brassGrad)" stroke-width="3" />
  <circle cx="50" cy="50" r="5" fill="url(#brassGrad)" />
</svg>
`;

async function generateFavicons() {
  console.log('[Favicon] Generating Glassofy brand icon assets in Ink Black & Brass Gold...');
  
  const svg512 = Buffer.from(createSvg(512));

  // 1. Generate PNGs
  await sharp(svg512).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16x16.png'));
  await sharp(svg512).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(svg512).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(svg512).resize(192, 192).png().toFile(path.join(publicDir, 'android-chrome-192x192.png'));
  await sharp(svg512).resize(512, 512).png().toFile(path.join(publicDir, 'android-chrome-512x512.png'));

  // 2. Favicon.ico (using 32x32 PNG)
  await sharp(svg512).resize(32, 32).toFile(path.join(publicDir, 'favicon.ico'));

  // 3. SVG vector favicon
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), createSvg(100).trim());

  // 4. Web Manifest
  const manifest = {
    name: 'Glassofy Architectural Hardware',
    short_name: 'Glassofy',
    description: 'Precision-crafted architectural hardware, glass fittings, shower hinges, and premium brass accessories for luxury spaces.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F1115',
    theme_color: '#0F1115',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };

  fs.writeFileSync(path.join(publicDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2));

  console.log('[Favicon] All favicon assets and web manifest created successfully in client/public!');
}

generateFavicons().catch(console.error);
