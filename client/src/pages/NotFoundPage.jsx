import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, Search, Layers } from 'lucide-react';
import SEO from '../components/common/SEO';
import { Button } from '../components/ui';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-[#FAF8F4] text-[#2E2622]">
      <SEO
        title="404 Page Not Found"
        description="The architectural hardware page or fitting you requested could not be located in our catalogue."
      />

      <div className="max-w-2xl w-full text-center space-y-8 bg-white border border-[#DDD8CF] rounded-[2px] p-8 sm:p-12 shadow-xs">
        <div className="relative inline-flex items-center justify-center">
          <span className="text-8xl sm:text-9xl font-serif font-light text-[#DDD8CF] select-none tracking-tight">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#F0EDE8] border border-[#DDD8CF] flex items-center justify-center text-[#2E2622]">
              <Compass className="w-7 h-7" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-xs uppercase tracking-[0.08em] text-[#7A726A] font-medium">
            Catalogue Navigation Notice
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-light text-[#2E2622] tracking-tight">
            Architectural Fitting Not Located
          </h1>
          <p className="text-xs sm:text-sm text-[#7A726A] max-w-md mx-auto leading-relaxed">
            The page or specification document you are looking for has been moved, archived, or is no longer listed in our hardware index.
          </p>
        </div>

        {/* Search Hardware Catalogue */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const q = e.target.search.value.trim();
            if (q) window.location.href = `/products?search=${encodeURIComponent(q)}`;
          }}
          className="max-w-md mx-auto relative flex items-center"
        >
          <input
            name="search"
            type="text"
            placeholder="Search hinges, brackets, spider fittings..."
            className="w-full bg-[#FAF8F4] text-[#2E2622] text-xs pl-10 pr-24 py-3 rounded-[2px] border border-[#DDD8CF] focus:outline-none focus:border-[#3A2F2B] placeholder-[#7A726A]"
          />
          <Search className="w-4 h-4 text-[#7A726A] absolute left-3.5 pointer-events-none" />
          <button
            type="submit"
            className="absolute right-1 px-3 py-1.5 rounded-[2px] bg-[#3A2F2B] text-[#FAF8F4] text-xs uppercase tracking-[0.08em] font-medium hover:bg-[#2E2622] transition-colors"
          >
            Search
          </button>
        </form>

        {/* Quick Links */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="primary" className="w-full gap-2">
              <Home className="w-4 h-4" />
              <span>Return Home</span>
            </Button>
          </Link>
          <Link to="/products" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full gap-2">
              <Layers className="w-4 h-4 text-[#7A726A]" />
              <span>Browse Full Catalogue</span>
            </Button>
          </Link>
        </div>

        {/* Popular Category Shortcuts */}
        <div className="pt-6 border-t border-[#DDD8CF]">
          <p className="text-xs uppercase tracking-[0.08em] text-[#7A726A] mb-3 font-medium">Popular Product Lines</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { name: 'Shower Hinges', slug: 'shower-hinges' },
              { name: 'Floor Springs', slug: 'floor-springs' },
              { name: 'Spider Fittings', slug: 'spider-fittings' },
              { name: 'Glass Connectors', slug: 'glass-connectors' },
            ].map((cat) => (
              <Link
                key={cat.slug}
                to={`/products?category=${cat.slug}`}
                className="text-xs px-3 py-1.5 rounded-[2px] bg-[#FAF8F4] border border-[#DDD8CF] text-[#2E2622] hover:bg-[#F0EDE8] transition-colors font-medium"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
