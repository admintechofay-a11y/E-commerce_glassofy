/**
 * Image Compression Script for Glassofy Architectural Hardware
 * Converts all catalogue and uploaded images to WebP (multiple responsive sizes: 300w, 600w, full),
 * calculates before and after byte sizes, and writes an audit report.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const TARGET_DIRS = [
  path.join(__dirname, '../server/public/images'),
];

const SIZES = [
  { suffix: '-300w', width: 300 },
  { suffix: '-600w', width: 600 },
];

async function compressImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
    return null;
  }

  // Avoid processing already sized images
  const baseName = path.basename(filePath, ext);
  if (baseName.endsWith('-300w') || baseName.endsWith('-600w')) {
    return null;
  }

  const dir = path.dirname(filePath);
  const origStat = fs.statSync(filePath);
  const origSize = origStat.size;

  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    // 1. Full-size WebP
    const webpPath = path.join(dir, `${baseName}.webp`);
    await sharp(filePath)
      .webp({ quality: 80, effort: 4 })
      .toFile(webpPath);
    const webpStat = fs.statSync(webpPath);

    // 2. Responsive variations (300w, 600w)
    const variantSizes = {};
    for (const size of SIZES) {
      if (metadata.width && metadata.width > size.width) {
        const variantPath = path.join(dir, `${baseName}${size.suffix}.webp`);
        await sharp(filePath)
          .resize({ width: size.width, withoutEnlargement: true })
          .webp({ quality: 80, effort: 4 })
          .toFile(variantPath);
        variantSizes[size.suffix] = fs.statSync(variantPath).size;
      }
    }

    return {
      file: path.relative(path.join(__dirname, '..'), filePath),
      originalSize: origSize,
      webpSize: webpStat.size,
      width: metadata.width,
      height: metadata.height,
      variants: variantSizes,
    };
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
    return null;
  }
}

async function run() {
  console.log('--- Starting Glassofy WebP Image Compression Audit ---');

  const allFiles = [];
  for (const dir of TARGET_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.jpg', '.jpeg', '.png'].includes(ext) && !entry.name.includes('-300w') && !entry.name.includes('-600w')) {
          allFiles.push(path.join(dir, entry.name));
        }
      }
    }
  }

  console.log(`Discovered ${allFiles.length} original source images to compress.`);

  let totalOriginalBytes = 0;
  let totalWebpBytes = 0;
  let processedCount = 0;
  const results = [];

  // Process in batches of 15 to balance speed and memory
  const BATCH_SIZE = 15;
  for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
    const batch = allFiles.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(f => compressImage(f)));
    for (const res of batchResults) {
      if (res) {
        processedCount++;
        totalOriginalBytes += res.originalSize;
        totalWebpBytes += res.webpSize;
        results.push(res);
      }
    }
    if ((i / BATCH_SIZE) % 5 === 0 || i + BATCH_SIZE >= allFiles.length) {
      const pct = Math.round((i / allFiles.length) * 100);
      console.log(`Progress: ${pct}% (${processedCount}/${allFiles.length} images converted)`);
    }
  }

  const origMB = (totalOriginalBytes / (1024 * 1024)).toFixed(2);
  const webpMB = (totalWebpBytes / (1024 * 1024)).toFixed(2);
  const savingsPct = Math.round(((totalOriginalBytes - totalWebpBytes) / totalOriginalBytes) * 100);

  console.log('\n=========================================');
  console.log('IMAGE COMPRESSION AUDIT RESULTS:');
  console.log(`Total Images Processed : ${processedCount}`);
  console.log(`Original Size (JPG/PNG): ${origMB} MB (${totalOriginalBytes} bytes)`);
  console.log(`Compressed Size (WebP) : ${webpMB} MB (${totalWebpBytes} bytes)`);
  console.log(`Bandwidth Savings      : ${savingsPct}% reduction (${(origMB - webpMB).toFixed(2)} MB saved)`);
  console.log('=========================================\n');

  const reportDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  const reportPath = path.join(reportDir, 'image-compression-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        totalImagesProcessed: processedCount,
        originalSizeBytes: totalOriginalBytes,
        originalSizeMB: parseFloat(origMB),
        webpSizeBytes: totalWebpBytes,
        webpSizeMB: parseFloat(webpMB),
        savingsPercent: savingsPct,
        savedMB: parseFloat((origMB - webpMB).toFixed(2)),
      },
      null,
      2
    )
  );

  console.log(`Saved detailed compression audit to ${reportPath}`);
}

run().catch(err => {
  console.error('Fatal error during compression:', err);
  process.exit(1);
});
