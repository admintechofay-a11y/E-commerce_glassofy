import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Reusable SEO Component powered by react-helmet-async
 * Dynamically updates document title, meta descriptions, Open Graph, Twitter cards,
 * canonical link, and JSON-LD structured data for search engine indexing.
 */
export default function SEO({
  title,
  description = 'Glassofy is India\'s premier architectural glass hardware & fittings manufacturer. Explore heavy shower hinges, spider fittings, and brass connectors.',
  keywords = 'architectural hardware, glass hardware, shower hinges, floor spring, spider fittings, patch fittings, glass connectors, Glassofy India',
  image = '/android-chrome-512x512.png',
  url,
  type = 'website',
  schema,
}) {
  const formattedTitle = title
    ? `${title} | Glassofy Architectural Hardware`
    : 'Glassofy | Architectural Hardware, Glass Fittings & Accessories';

  // Ensure description is ideally 120-160 characters
  let normalizedDescription = description.trim();
  if (normalizedDescription.length < 120) {
    normalizedDescription = `${normalizedDescription} Engineered for luxury spaces with certified heavy-duty brass and stainless steel architectural standards.`;
  }
  if (normalizedDescription.length > 165) {
    normalizedDescription = `${normalizedDescription.substring(0, 160).trim()}...`;
  }

  const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://glassofy.com');
  const fullImageUrl = image.startsWith('http')
    ? image
    : typeof window !== 'undefined'
      ? `${window.location.origin}${image}`
      : `https://glassofy.com${image}`;

  // Direct DOM fallback for immediate head synchronization
  useEffect(() => {
    document.title = formattedTitle;

    const setMetaTag = (attr, val, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${val}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, val);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMetaTag('name', 'description', normalizedDescription);
    setMetaTag('name', 'keywords', keywords);
    setMetaTag('property', 'og:title', formattedTitle);
    setMetaTag('property', 'og:description', normalizedDescription);
    setMetaTag('property', 'og:image', fullImageUrl);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:site_name', 'Glassofy');
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', formattedTitle);
    setMetaTag('name', 'twitter:description', normalizedDescription);
    setMetaTag('name', 'twitter:image', fullImageUrl);

    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);
  }, [formattedTitle, normalizedDescription, keywords, fullImageUrl, canonicalUrl, type]);

  return (
    <Helmet prioritizeSeoTags>
      <title>{formattedTitle}</title>
      <meta name="description" content={normalizedDescription} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Glassofy" />
      <meta property="og:title" content={formattedTitle} />
      <meta property="og:description" content={normalizedDescription} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:url" content={canonicalUrl} />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={formattedTitle} />
      <meta name="twitter:description" content={normalizedDescription} />
      <meta name="twitter:image" content={fullImageUrl} />

      {/* JSON-LD Structured Data */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}
