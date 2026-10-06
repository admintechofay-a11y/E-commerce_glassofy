import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { getOptimizedImageUrl, getImageSrcSet } from '../../utils/imageUtils';

export const ProductCard = ({ product }) => {
  const [imageError, setImageError] = useState(false);
  if (!product) return null;

  const imageSrc = product.images && product.images.length > 0 ? product.images[0] : null;
  const secondaryImageSrc = product.images && product.images.length > 1 ? product.images[1] : null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const hasDiscount = product.baseMrp && product.baseMrp > product.basePrice;
  const variantCount = product.variants ? product.variants.length : 0;
  const inStock = product.stock !== undefined ? product.stock > 0 : true;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group flex flex-col justify-between transition-colors duration-200 select-none"
    >
      {/* Square Taupe Tile */}
      <div className="relative aspect-square w-full bg-[#F0EDE8] border border-[#DDD8CF] rounded-[2px] p-6 sm:p-8 flex items-center justify-center overflow-hidden transition-colors duration-200 group-hover:border-[#2E2622]/40">
        {imageSrc && !imageError ? (
          <>
            {/* Primary Product Image */}
            <img
              src={getOptimizedImageUrl(imageSrc)}
              srcSet={getImageSrcSet(imageSrc)}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              width={400}
              height={400}
              alt={product.name || product.title}
              loading="lazy"
              decoding="async"
              className={`w-full h-full object-contain mix-blend-multiply transition-all duration-200 ease-out ${
                secondaryImageSrc
                  ? 'group-hover:opacity-0 group-hover:scale-[1.03]'
                  : 'group-hover:scale-[1.03]'
              }`}
              onError={(e) => {
                if (e.currentTarget.src !== imageSrc) {
                  e.currentTarget.src = imageSrc;
                  e.currentTarget.removeAttribute('srcset');
                } else {
                  setImageError(true);
                }
              }}
            />

            {/* Secondary Product Image (if available on hover) */}
            {secondaryImageSrc && (
              <img
                src={getOptimizedImageUrl(secondaryImageSrc)}
                srcSet={getImageSrcSet(secondaryImageSrc)}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                width={400}
                height={400}
                alt={`${product.name} alternate view`}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full p-6 sm:p-8 object-contain mix-blend-multiply opacity-0 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-200 ease-out pointer-events-none"
              />
            )}
          </>
        ) : (
          <div className="w-12 h-12 rounded-[2px] bg-[#FAF8F4] border border-[#DDD8CF] flex items-center justify-center text-[#7A726A]">
            <Layers className="w-6 h-6" />
          </div>
        )}

        {/* Top Badges: Finish & Code */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
          {product.finish && (
            <span className="text-[9px] uppercase tracking-[0.08em] font-medium px-1.5 py-0.5 bg-[#FAF8F4]/95 border border-[#DDD8CF] text-[#2E2622] rounded-[2px]">
              {product.finish}
            </span>
          )}
          {hasDiscount && (
            <span className="text-[9px] uppercase tracking-[0.08em] font-medium px-1.5 py-0.5 bg-[#EDF2EC] text-[#4F6B4A] border border-[#4F6B4A]/30 rounded-[2px]">
              Sale
            </span>
          )}
        </div>

        {product.code && (
          <span className="absolute top-2.5 right-2.5 text-[9px] font-mono uppercase text-[#7A726A] bg-[#FAF8F4]/80 px-1 py-0.5 rounded-[2px] pointer-events-none">
            {product.code}
          </span>
        )}
      </div>

      {/* Editorial Card Footer */}
      <div className="pt-3 pb-1 flex flex-col justify-between">
        <div className="flex items-baseline justify-between gap-2">
          {/* Name: Uppercase, Small at bottom-left */}
          <h3 className="text-[11px] uppercase tracking-[0.08em] font-medium text-[#2E2622] truncate flex-1">
            {product.name || product.title}
          </h3>

          {/* Price: Big serif at bottom-right */}
          <span className="font-serif text-sm sm:text-base font-normal text-[#2E2622] shrink-0">
            {formatPrice(product.basePrice)}
          </span>
        </div>

        {/* Subtle Metadata Subline: Variants, Stock, Bulk Hint */}
        <div className="flex items-center justify-between gap-2 mt-1 text-[10px] uppercase tracking-[0.08em] text-[#7A726A]">
          <span>
            {variantCount > 1 ? `${variantCount} Sizes` : inStock ? 'In Stock' : 'Pre-Order'}
          </span>
          <span className="text-[9px] text-[#B08D57]">
            Bulk Tiers
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
