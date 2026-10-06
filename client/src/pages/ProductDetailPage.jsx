import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProductBySlug } from '../api/catalogApi';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import ProductCard from '../components/products/ProductCard';
import { Button, Skeleton, useToast } from '../components/ui';
import {
  ShieldCheck,
  Truck,
  Layers,
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  AlertCircle,
  FileText,
} from 'lucide-react';
import SEO from '../components/common/SEO';
import { getOptimizedImageUrl, getImageSrcSet } from '../utils/imageUtils';

export const ProductDetailPage = () => {
  const { slug } = useParams();
  const { addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useToast();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchProductBySlug(slug)
      .then((data) => {
        if (!isMounted) return;
        const prod = data.product;
        setProduct(prod);
        setRelatedProducts(data.relatedProducts || []);

        // Default selected variant
        if (prod.variants && prod.variants.length > 0) {
          setSelectedVariant(prod.variants[0]);
        } else {
          setSelectedVariant(null);
        }

        setActiveImageIndex(0);
        setQuantity(1);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Product not found or unavailable.');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Gallery zoom mouse movement
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMousePos({ x, y });
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, selectedVariant, quantity, isAuthenticated);
    addToast({
      type: 'success',
      title: 'Added to Cart',
      message: `${quantity}x ${product.name || product.title} (${selectedVariant?.size || 'Standard'}) added to your order.`,
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <Skeleton className="h-4 w-48 rounded-[2px]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Skeleton className="aspect-square w-full rounded-[2px]" />
          <div className="space-y-6">
            <Skeleton className="h-8 w-3/4 rounded-[2px]" />
            <Skeleton className="h-6 w-1/3 rounded-[2px]" />
            <Skeleton className="h-24 w-full rounded-[2px]" />
            <Skeleton className="h-12 w-full rounded-[2px]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-[#A4493D] mx-auto" />
        <h2 className="text-2xl font-serif font-normal text-[#2E2622]">Hardware Item Unavailable</h2>
        <p className="text-xs text-[#7A726A]">
          {error || 'This product does not exist in our catalog.'}
        </p>
        <div className="pt-4">
          <Link to="/products">
            <Button variant="primary">Return to Catalog</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentPrice = selectedVariant?.price || product.basePrice;
  const currentMrp = selectedVariant?.mrp || product.baseMrp;
  const hasDiscount = currentMrp && currentMrp > currentPrice;
  const discountPercent = hasDiscount
    ? Math.round(((currentMrp - currentPrice) / currentMrp) * 100)
    : 0;

  const currentSku = selectedVariant?.sku || product.code;
  const images = product.images && product.images.length > 0 ? product.images : [];
  const currentImage = images[activeImageIndex] || null;

  const productSchema = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: images.map((img) => img.url),
    description: product.description || `${product.name} (${product.code}) architectural glass fitting.`,
    sku: currentSku,
    mpn: product.code,
    brand: {
      '@type': 'Brand',
      name: 'Glassofy',
    },
    offers: {
      '@type': 'Offer',
      url: window.location.href,
      priceCurrency: 'INR',
      price: currentPrice,
      priceValidUntil: '2027-12-31',
      itemCondition: 'https://schema.org/NewCondition',
      availability: (selectedVariant?.stock ?? product.stock) > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Glassofy',
      },
    },
  };

  // Bulk Discount Tiers breakdown
  const bulkTiers = product.bulkPricing && product.bulkPricing.length > 0
    ? product.bulkPricing
    : [
        { minQty: 10, discountPercent: 5 },
        { minQty: 25, discountPercent: 10 },
        { minQty: 50, discountPercent: 15 },
      ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      <SEO
        title={`${product.name} (${product.code}) - ${product.finish || 'Architectural Fitting'}`}
        description={product.description || `Buy ${product.name} (${product.code}) by Glassofy. Architectural grade hardware in ${product.finish || 'CP / SS / PVD Gold'}. Fast pan-India shipping.`}
        image={images[0]?.url || '/images/og-preview.png'}
        type="product"
        schema={productSchema}
      />

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-[#7A726A]">
        <Link to="/" className="hover:text-[#2E2622] transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3 h-3 text-[#DDD8CF]" />
        <Link to="/products" className="hover:text-[#2E2622] transition-colors">
          Catalogue
        </Link>
        {product.category && (
          <>
            <ChevronRight className="w-3 h-3 text-[#DDD8CF]" />
            <Link
              to={`/products?category=${product.category.slug}`}
              className="hover:text-[#2E2622] transition-colors"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3 h-3 text-[#DDD8CF]" />
        <span className="text-[#2E2622] font-medium truncate max-w-[200px]">
          {product.name || product.title}
        </span>
      </nav>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left Column: Gallery on Taupe Pedestal */}
        <div className="lg:col-span-6 space-y-4">
          <div
            className="relative aspect-square w-full bg-[#F0EDE8] border border-[#DDD8CF] rounded-[2px] p-8 sm:p-12 flex items-center justify-center cursor-crosshair overflow-hidden"
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            onMouseMove={handleMouseMove}
          >
            {currentImage ? (
              <img
                src={getOptimizedImageUrl(currentImage)}
                srcSet={getImageSrcSet(currentImage)}
                sizes="(max-width: 768px) 100vw, 600px"
                width={600}
                height={600}
                alt={product.name || product.title}
                loading="eager"
                decoding="async"
                className={`w-full h-full object-contain mix-blend-multiply transition-transform duration-200 ${
                  isZoomed ? 'scale-150' : 'scale-100'
                }`}
                style={
                  isZoomed
                    ? {
                        transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                      }
                    : undefined
                }
                onError={(e) => {
                  if (e.currentTarget.src !== currentImage) {
                    e.currentTarget.src = currentImage;
                    e.currentTarget.removeAttribute('srcset');
                  }
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-[#7A726A]">
                <Layers className="w-12 h-12 mb-2" />
                <span className="text-[11px] uppercase tracking-[0.08em]">Catalogue Schematic</span>
              </div>
            )}

            {/* Badges on Gallery */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none z-10">
              {product.finish && (
                <span className="text-[10px] font-medium uppercase tracking-[0.08em] px-2 py-0.5 bg-[#FAF8F4]/90 border border-[#DDD8CF] text-[#2E2622] rounded-[2px]">
                  {product.finish}
                </span>
              )}
              {hasDiscount && (
                <span className="text-[10px] font-medium uppercase tracking-[0.08em] px-2 py-0.5 bg-[#EDF2EC] text-[#4F6B4A] border border-[#4F6B4A]/30 rounded-[2px]">
                  {discountPercent}% SAVINGS
                </span>
              )}
            </div>

            <div className="absolute bottom-4 right-4 bg-[#FAF8F4]/80 px-2 py-1 rounded-[2px] text-[10px] text-[#7A726A] pointer-events-none border border-[#DDD8CF]">
              Hover to Zoom
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-18 h-18 rounded-[2px] bg-[#F0EDE8] p-2 border transition-all shrink-0 cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-[#2E2622] ring-1 ring-[#2E2622]'
                      : 'border-[#DDD8CF] hover:border-[#7A726A] opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={getOptimizedImageUrl(img, '300w')}
                    width={80}
                    height={80}
                    alt="thumbnail"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain mix-blend-multiply"
                    onError={(e) => {
                      if (e.currentTarget.src !== img) {
                        e.currentTarget.src = img;
                      }
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details, Variants, Bulk Table, Add to Cart */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3 pb-6 border-b border-[#DDD8CF]">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono uppercase text-[#7A726A] bg-[#F0EDE8] px-2 py-0.5 rounded-[2px] border border-[#DDD8CF]">
                CODE: {product.code || 'GLASSOFY'}
              </span>
              {product.finish && (
                <span className="text-[11px] uppercase tracking-[0.08em] text-[#7A726A]">
                  FINISH: {product.finish}
                </span>
              )}
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#2E2622] leading-tight">
              {product.name || product.title}
            </h1>

            {/* Price section */}
            <div className="pt-1 flex items-baseline gap-3">
              <span className="font-serif text-3xl sm:text-4xl text-[#2E2622] font-normal">
                {formatPrice(currentPrice)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-[#7A726A] line-through font-mono">
                  {formatPrice(currentMrp)}
                </span>
              )}
              <span className="text-xs text-[#7A726A]">(Excl. 18% GST at invoice)</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-[#7A726A] leading-relaxed">
            {product.description || 'Heavy-duty architectural fitting engineered for frameless glass installations and commercial doors.'}
          </p>

          {/* Variant Selector (Sizes) */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.08em]">
                <span className="text-[#7A726A]">Dimension / Specification:</span>
                <span className="text-[#2E2622] font-semibold">{selectedVariant?.size || 'Standard'}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.variants.map((v, i) => {
                  const isSelected =
                    selectedVariant?.sku === v.sku || selectedVariant?._id === v._id;
                  return (
                    <button
                      key={v._id || v.sku || i}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`px-3 py-2 rounded-[2px] text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#3A2F2B] text-[#FAF8F4] border border-[#3A2F2B]'
                          : 'bg-[#FAF8F4] text-[#2E2622] border border-[#DDD8CF] hover:border-[#2E2622]'
                      }`}
                    >
                      <span>{v.size || `Option ${i + 1}`}</span>
                      <span className="ml-2 opacity-75 font-mono">₹{v.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bulk Discount Table (Clean Ledger Style) */}
          <div className="p-4 bg-[#F0EDE8]/60 border border-[#DDD8CF] rounded-[2px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#2E2622]">
                Volume Bulk Tier Pricing
              </span>
              <span className="text-[10px] uppercase text-[#7A726A]">Auto-applied at checkout</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
              {bulkTiers.map((tier, idx) => (
                <div key={idx} className="p-2 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px]">
                  <span className="block text-[10px] text-[#7A726A] uppercase">{tier.minQty}+ Units</span>
                  <span className="block font-medium text-[#2E2622] mt-0.5">
                    {tier.discountPercent ? `${tier.discountPercent}% OFF` : `₹${tier.tierPrice}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quantity Selector & Add to Cart */}
          <div className="pt-2 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Stepper */}
              <div className="flex items-center border border-[#DDD8CF] bg-[#FAF8F4] rounded-[2px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 text-[#7A726A] hover:text-[#2E2622] hover:bg-[#F0EDE8] transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-12 text-center text-xs font-semibold text-[#2E2622]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 text-[#7A726A] hover:text-[#2E2622] hover:bg-[#F0EDE8] transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add to Cart button */}
              <Button
                size="lg"
                onClick={handleAddToCart}
                className="flex-1 justify-center gap-2 py-3"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Order ({formatPrice(currentPrice * quantity)})</span>
              </Button>
            </div>

            {/* Value assurance items */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-[11px] text-[#7A726A]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2E2622] shrink-0" />
                <span>Architectural Warranty</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-[#2E2622] shrink-0" />
                <span>Pan-India Crated Dispatch</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#2E2622] shrink-0" />
                <span>18% GST Input Credit</span>
              </div>
            </div>
          </div>

          {/* Technical Specifications Table */}
          <div className="pt-6 border-t border-[#DDD8CF] space-y-3">
            <h3 className="text-xs uppercase tracking-[0.08em] font-medium text-[#2E2622]">
              Technical Specifications
            </h3>
            <div className="border border-[#DDD8CF] rounded-[2px] overflow-hidden bg-[#FAF8F4]">
              <table className="w-full text-left text-xs divide-y divide-[#DDD8CF]">
                <tbody className="divide-y divide-[#DDD8CF]">
                  <tr>
                    <td className="px-4 py-2.5 text-[#7A726A] w-1/3">Product Code</td>
                    <td className="px-4 py-2.5 text-[#2E2622] font-mono">{product.code || 'GLASSOFY'}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-[#7A726A]">Material / Finish</td>
                    <td className="px-4 py-2.5 text-[#2E2622]">{product.finish || 'Solid Brass'}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-[#7A726A]">Selected Size</td>
                    <td className="px-4 py-2.5 text-[#2E2622]">{selectedVariant?.size || 'Standard'}</td>
                  </tr>
                  {product.specifications &&
                    Object.entries(product.specifications).map(([specKey, specVal]) => (
                      <tr key={specKey}>
                        <td className="px-4 py-2.5 text-[#7A726A]">{specKey}</td>
                        <td className="px-4 py-2.5 text-[#2E2622]">{specVal}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="pt-12 border-t border-[#DDD8CF] space-y-8">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="editorial-label block text-[#7A726A]">Complementary Fittings</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#2E2622] mt-1">
                Related Architectural Hardware
              </h2>
            </div>
            <Link
              to={`/products?category=${product.category?.slug}`}
              className="text-xs uppercase tracking-[0.08em] font-medium text-[#2E2622] underline underline-offset-4 hover:text-[#7A726A]"
            >
              View More &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel._id || rel.slug} product={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailPage;
