import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchCategories, fetchFeaturedProducts } from '../api/catalogApi';
import ProductCard from '../components/products/ProductCard';
import { Skeleton } from '../components/ui';
import { ArrowRight, Layers, ShieldCheck, Cpu, Award } from 'lucide-react';
import SEO from '../components/common/SEO';

export const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchCategories(), fetchFeaturedProducts(8)])
      .then(([cats, prods]) => {
        if (!isMounted) return;
        setCategories(cats || []);
        setFeaturedProducts(prods || []);
      })
      .catch((_err) => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-24 sm:space-y-32 pb-24">
      <SEO
        title="Glassofy | Architectural Glass Hardware & Fittings"
        description="Engineered for architectural luxury & heavy precision. Explore premium shower hinges, floor springs, spider fittings, and glass hardware crafted in solid brass and SS 304."
        schema={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization',
              '@id': 'https://glassofy.com/#organization',
              name: 'Glassofy',
              url: 'https://glassofy.com',
              logo: 'https://glassofy.com/images/logo.png',
              description: 'Architectural glass fittings and luxury hardware manufacturer.',
            },
            {
              '@type': 'WebSite',
              '@id': 'https://glassofy.com/#website',
              url: 'https://glassofy.com',
              name: 'Glassofy Architectural Hardware',
              publisher: { '@id': 'https://glassofy.com/#organization' },
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://glassofy.com/products?search={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            },
          ],
        }}
      />

      {/* 1. Hero Section (Split Layout with Round Overlapping SHOP CTA & Warm Brown Architectural Tone) */}
      <section className="border-b border-[#D8CFC4] bg-gradient-to-b from-[#F2EAE1] via-[#F7F2EC] to-[#FAF8F4] pt-12 sm:pt-20 pb-16 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Brand, Tagline, Editorial Statement */}
            <div className="lg:col-span-6 space-y-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8DDD0] border border-[#D5C7B7] text-[#5A4333] text-[10px] uppercase tracking-[0.1em] font-medium rounded-full">
                Architectural Hardware Atelier • Solid Brass & SS 304
              </span>

              <h1 className="font-serif text-5xl sm:text-6xl xl:text-7xl font-light text-[#2E2622] tracking-tight leading-[1.05]">
                Glass Hardware of <span className="italic font-normal text-[#5A4333]">Rare Precision</span>
              </h1>

              <p className="text-xs sm:text-sm text-[#5C5147] max-w-md leading-relaxed">
                Engineered for architects, interior specifiers, and glass contractors. Solid forged brass hinges, structural spider fittings, and precision floor springs built to withstand commercial cycles.
              </p>

              <div className="pt-4 flex flex-wrap items-center gap-4 sm:gap-6">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#3A2F2B] hover:bg-[#4D3F37] text-[#FAF8F4] text-xs uppercase tracking-[0.1em] font-medium rounded-[2px] transition-all shadow-sm active:scale-[0.98]"
                >
                  Explore Collection &rarr;
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-3 border border-[#3A2F2B]/30 hover:border-[#3A2F2B] text-xs uppercase tracking-[0.08em] font-medium text-[#3A2F2B] hover:bg-[#3A2F2B]/5 transition-all rounded-[2px]"
                >
                  B2B Trade Register
                </Link>
              </div>

              {/* Specs Ledger Bar */}
              <div className="pt-6 mt-8 border-t border-[#D5C7B7] grid grid-cols-3 gap-4 text-left bg-[#EDE3D6]/50 p-4 rounded-[2px] border border-[#D5C7B7]/80">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-[#7A6B5D] block">Metallurgy</span>
                  <p className="text-xs font-medium text-[#2E2622] mt-0.5">Forged Brass & 304</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-[#7A6B5D] block">Glass Range</span>
                  <p className="text-xs font-medium text-[#2E2622] mt-0.5">8mm to 12mm</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-[#7A6B5D] block">Cycle Test</span>
                  <p className="text-xs font-medium text-[#2E2622] mt-0.5">100,000+ Cycles</p>
                </div>
              </div>
            </div>

            {/* Right Column: Split Image Composition with Overlapping Round SHOP button */}
            <div className="lg:col-span-6 relative flex items-center justify-center">
              <div className="relative w-full max-w-lg grid grid-cols-12 gap-4 items-end">
                {/* Large Lifestyle / Flagship Hardware Image */}
                <div className="col-span-8 aspect-[4/5] bg-[#EFE7DE] border border-[#D5C7B7] rounded-[2px] p-8 flex items-center justify-center relative overflow-hidden shadow-sm">
                  <img
                    src="/images/page_005_prod_01_Brass-D_Bracke.jpg"
                    alt="Solid Brass D-Bracket Architectural Hardware"
                    width={500}
                    height={600}
                    className="w-full h-full object-contain mix-blend-multiply transition-transform duration-300 hover:scale-[1.03]"
                  />
                  <span className="absolute bottom-3 left-3 text-[9px] uppercase tracking-[0.08em] font-mono text-[#7A6B5D]">
                    QW-DB-01 • Solid Brass
                  </span>
                </div>

                {/* Secondary Image Tile */}
                <div className="col-span-4 aspect-square bg-[#EFE7DE] border border-[#D5C7B7] rounded-[2px] p-4 flex items-center justify-center relative overflow-hidden shadow-sm self-center">
                  <img
                    src="/images/page_005_prod_10_Brass-BulletSt.jpg"
                    alt="Brass Bullet Stud Fitting"
                    width={300}
                    height={300}
                    className="w-full h-full object-contain mix-blend-multiply transition-transform duration-300 hover:scale-[1.03]"
                    onError={(e) => {
                      e.currentTarget.src = '/images/page_005_prod_02_Brass-U_Bracke.jpg';
                    }}
                  />
                  <span className="absolute bottom-2 left-2 text-[8px] uppercase tracking-[0.08em] font-mono text-[#7A6B5D]">
                    Bullet Stud
                  </span>
                </div>

                {/* Round Dark "SHOP" Button Overlapping the Seam */}
                <Link
                  to="/products"
                  className="absolute left-[58%] top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#3A2F2B] text-[#FAF8F4] flex flex-col items-center justify-center text-center transition-transform hover:scale-105 active:scale-95 shadow-xl hover:bg-[#261E1A] group ring-4 ring-[#FAF8F4]/90"
                  aria-label="Shop All Products"
                >
                  <span className="font-serif text-xs uppercase tracking-widest font-normal text-[#FAF8F4] group-hover:text-white">
                    Shop
                  </span>
                  <span className="text-[9px] tracking-widest text-[#DDD8CF] uppercase">
                    Fittings
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Bestsellers Section (Strictly per user checklist) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between pb-4 border-b border-[#DDD8CF] mb-8 sm:mb-12">
          <div>
            <span className="editorial-label block text-[#7A726A]">Architectural Collection</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#2E2622] mt-1">
              Bestsellers
            </h2>
          </div>
          <Link
            to="/products"
            className="text-xs uppercase tracking-[0.08em] font-medium text-[#2E2622] underline underline-offset-4 hover:text-[#5A4333] transition-colors"
          >
            SEE ALL
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-[2px]" />
                <Skeleton className="h-3 w-3/4 rounded-[2px]" />
                <Skeleton className="h-3 w-1/3 rounded-[2px]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {featuredProducts.map((prod) => (
              <ProductCard key={prod._id || prod.slug} product={prod} />
            ))}
          </div>
        )}
      </section>

      {/* 3. Categories / Architectural Collections */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between pb-4 border-b border-[#DDD8CF] mb-8">
          <div>
            <span className="editorial-label block text-[#7A726A]">Hardware By Discipline</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#2E2622] mt-1">
              Architectural Collections
            </h2>
          </div>
          <Link
            to="/products"
            className="text-xs uppercase tracking-[0.08em] font-medium text-[#2E2622] underline underline-offset-4 hover:text-[#5A4333] transition-colors"
          >
            All Categories
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-[2px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat._id || cat.slug}
                to={`/products?category=${cat.slug}`}
                className="group p-6 bg-[#F0EDE8] border border-[#DDD8CF] rounded-[2px] hover:border-[#3A2F2B]/50 hover:bg-[#ECE7DF] transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.08em] text-[#7A726A] mb-3">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#2E2622]" />
                      <span>Fittings</span>
                    </span>
                    {cat.productCount !== undefined && <span>{cat.productCount} Items</span>}
                  </div>
                  <h3 className="font-serif text-xl font-normal text-[#2E2622] group-hover:text-[#5A4333] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-[#5C5147] mt-2 line-clamp-2 leading-relaxed">
                    {cat.description || 'Precision architectural glass fittings and mounting hardware.'}
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#DDD8CF] flex items-center justify-between text-xs uppercase tracking-[0.08em]">
                  <span className="text-[#7A726A]">Commercial Grade</span>
                  <span className="text-[#2E2622] font-medium group-hover:underline flex items-center gap-1">
                    View <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 4. Atelier Standards & Metallurgy */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border border-[#4A3C34] bg-[#342A24] p-8 sm:p-14 rounded-[2px] text-[#FAF8F4] shadow-xs">
          <div className="max-w-2xl mb-10">
            <span className="editorial-label block text-[#CDB185]">Manufacturing Benchmark</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#FAF8F4] mt-1">
              Engineered Without Compromise
            </h2>
            <p className="text-xs sm:text-sm text-[#DDD5CA] mt-2 leading-relaxed">
              Architectural grade brass & austenitic stainless steel alloys engineered to eliminate sagging, hinge play, and uneven glass stress in luxury installations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-[#4A3C34]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#FAF8F4]">
                <Cpu className="w-4 h-4 text-[#CDB185]" />
                <h3 className="text-xs uppercase tracking-[0.08em] font-medium text-[#FAF8F4]">CNC Precision Alloy</h3>
              </div>
              <p className="text-xs text-[#D2C8BC] leading-relaxed">
                Extruded from solid forged brass and AISI 304 stainless steel for zero porosity, maximum tensile strength, and permanent mirror or satin finish retention.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#FAF8F4]">
                <ShieldCheck className="w-4 h-4 text-[#CDB185]" />
                <h3 className="text-xs uppercase tracking-[0.08em] font-medium text-[#FAF8F4]">100,000 Cycle Testing</h3>
              </div>
              <p className="text-xs text-[#D2C8BC] leading-relaxed">
                Every shower hinge, pivot, and glass bracket undergoes continuous fatigue cycle testing under 65 kg glass deadloads, exceeding EN14428 European hardware standards.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#FAF8F4]">
                <Award className="w-4 h-4 text-[#CDB185]" />
                <h3 className="text-xs uppercase tracking-[0.08em] font-medium text-[#FAF8F4]">Trade Invoicing & Input Credit</h3>
              </div>
              <p className="text-xs text-[#D2C8BC] leading-relaxed">
                Instant GSTIN tax invoices with 18% input tax credit documentation, transparent volume discounts, and direct freight dispatch across India.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
