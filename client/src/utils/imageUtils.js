/**
 * Responsive & WebP Image Helper Utilities for Glassofy Architectural Hardware
 */

/**
 * Returns a WebP version URL for local image paths.
 * e.g. /images/door-handle.jpg -> /images/door-handle.webp
 * or /images/door-handle-600w.webp if size is specified
 */
export function getOptimizedImageUrl(src, size = null) {
  if (!src || typeof src !== 'string') return src;

  // External URLs (e.g. cloudinary, unsplash) return as-is
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // Check if it's a local /images/ or /api/images/ path
  const match = src.match(/^(.*?)(\.[a-zA-Z0-9]+)$/);
  if (!match) return src;

  const [, basePath, ext] = match;
  if (!['.jpg', '.jpeg', '.png'].includes(ext.toLowerCase())) {
    return src;
  }

  if (size === '300w' || size === 300) {
    return `${basePath}-300w.webp`;
  }
  if (size === '600w' || size === 600) {
    return `${basePath}-600w.webp`;
  }

  return `${basePath}.webp`;
}

/**
 * Generates standard srcset string for responsive WebP display
 */
export function getImageSrcSet(src) {
  if (!src || typeof src !== 'string') return undefined;
  if (src.startsWith('http://') || src.startsWith('https://')) return undefined;

  const match = src.match(/^(.*?)(\.[a-zA-Z0-9]+)$/);
  if (!match) return undefined;

  const [, basePath, ext] = match;
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext.toLowerCase())) {
    return undefined;
  }

  const cleanBase = basePath.replace(/-300w$|-600w$/, '');
  return `${cleanBase}-300w.webp 300w, ${cleanBase}-600w.webp 600w, ${cleanBase}.webp 1200w`;
}
