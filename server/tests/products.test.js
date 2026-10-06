const request = require('supertest');
const app = require('../src/app');
const { Product, Category } = require('../src/models');

describe('Product and Catalogue API Integration Tests', () => {
  let categoryHinges;
  let categoryBrackets;

  beforeEach(async () => {
    // 1. Setup test categories
    categoryHinges = await Category.create({
      name: 'Shower Hinges',
      slug: 'shower-hinges',
      description: 'Solid brass shower hinges',
      isActive: true,
      displayOrder: 1,
    });

    categoryBrackets = await Category.create({
      name: 'F-Brackets',
      slug: 'f-brackets',
      description: 'Architectural wall brackets',
      isActive: true,
      displayOrder: 2,
    });

    // 2. Setup published test products
    await Product.create({
      name: 'Brass Shower Hinge 90 Degree',
      title: 'Brass Shower Hinge 90 Degree',
      slug: 'brass-shower-hinge-90-degree',
      code: 'SH-90-BR',
      description: 'Heavy duty glass to wall shower hinge with brass finish',
      category: categoryHinges._id,
      finish: 'BRASS',
      basePrice: 1250,
      baseMrp: 1600,
      isFeatured: true,
      status: 'PUBLISHED',
      isPublished: true,
      isActive: true,
      variants: [
        { sku: 'SH-90-BR-STD', size: '10mm', finish: 'BRASS', price: 1250, stock: 50 },
        { sku: 'SH-90-BR-HD', size: '12mm', finish: 'BRASS', price: 1450, stock: 30 },
      ],
    });

    await Product.create({
      name: 'Chrome Plated F-Bracket Heavy',
      title: 'Chrome Plated F-Bracket Heavy',
      slug: 'chrome-plated-f-bracket-heavy',
      code: 'FB-CP-102',
      description: 'CNC machined mirror finish chrome F-bracket',
      category: categoryBrackets._id,
      finish: 'CP',
      basePrice: 450,
      baseMrp: 600,
      isFeatured: true,
      status: 'PUBLISHED',
      isPublished: true,
      isActive: true,
      variants: [
        { sku: 'FB-CP-19', size: '19mm', finish: 'CP', price: 450, stock: 100 },
        { sku: 'FB-CP-25', size: '25mm', finish: 'CP', price: 550, stock: 80 },
      ],
    });

    await Product.create({
      name: 'Satin Stainless Steel Bullet Stud',
      title: 'Satin Stainless Steel Bullet Stud',
      slug: 'satin-ss-bullet-stud',
      code: 'BS-SS-01',
      description: 'Point fixed standoff pin for railing installations',
      category: categoryBrackets._id,
      finish: 'SS',
      basePrice: 850,
      baseMrp: 1100,
      isFeatured: false,
      status: 'PUBLISHED',
      isPublished: true,
      isActive: true,
      variants: [{ sku: 'BS-SS-32', size: '32mm', finish: 'SS', price: 850, stock: 40 }],
    });

    // 3. Setup draft product (MUST be hidden from public catalog)
    await Product.create({
      name: 'Unpublished Prototype Magnetic Lock',
      title: 'Unpublished Prototype Magnetic Lock',
      slug: 'prototype-magnetic-lock',
      code: 'PROTO-LOCK-99',
      description: 'Secret prototype in research and development',
      category: categoryHinges._id,
      finish: 'MATT BLACK',
      basePrice: 5000,
      baseMrp: 6500,
      isFeatured: true,
      status: 'DRAFT',
      isPublished: false,
      isActive: false,
      variants: [
        { sku: 'PROTO-01', size: 'Standard', finish: 'MATT BLACK', price: 5000, stock: 5 },
      ],
    });
  });

  describe('GET /api/categories', () => {
    it('should return list of active categories with product counts', async () => {
      const res = await request(app).get('/api/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);

      const hingeCat = res.body.data.find((c) => c.slug === 'shower-hinges');
      expect(hingeCat).toBeDefined();
      // Only 1 published product in shower-hinges (the DRAFT product must NOT be counted)
      expect(hingeCat.productCount).toBe(1);

      const bracketCat = res.body.data.find((c) => c.slug === 'f-brackets');
      expect(bracketCat.productCount).toBe(2);
    });
  });

  describe('GET /api/products', () => {
    it('should return only PUBLISHED products (drafts hidden)', async () => {
      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.products.length).toBe(3);

      const returnedCodes = res.body.data.products.map((p) => p.code);
      expect(returnedCodes).toContain('SH-90-BR');
      expect(returnedCodes).toContain('FB-CP-102');
      expect(returnedCodes).toContain('BS-SS-01');
      // Draft product must NOT be present
      expect(returnedCodes).not.toContain('PROTO-LOCK-99');
    });

    it('should filter products by category slug', async () => {
      const res = await request(app).get('/api/products?category=shower-hinges');

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.products[0].code).toBe('SH-90-BR');
    });

    it('should search products by text in name, code, or description', async () => {
      // Search by code
      const resByCode = await request(app).get('/api/products?search=FB-CP');
      expect(resByCode.status).toBe(200);
      expect(resByCode.body.data.total).toBe(1);
      expect(resByCode.body.data.products[0].code).toBe('FB-CP-102');

      // Search by description keyword
      const resByDesc = await request(app).get('/api/products?search=standoff');
      expect(resByDesc.status).toBe(200);
      expect(resByDesc.body.data.total).toBe(1);
      expect(resByDesc.body.data.products[0].code).toBe('BS-SS-01');
    });

    it('should filter products by finish', async () => {
      const res = await request(app).get('/api/products?finish=BRASS');

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.products[0].finish).toBe('BRASS');
    });

    it('should filter products by variant size', async () => {
      const res = await request(app).get('/api/products?size=19mm');

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.products[0].code).toBe('FB-CP-102');
    });

    it('should filter products by price range', async () => {
      const res = await request(app).get('/api/products?minPrice=500&maxPrice=1300');

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(2);
      const codes = res.body.data.products.map((p) => p.code);
      expect(codes).toContain('SH-90-BR');
      expect(codes).toContain('BS-SS-01');
      expect(codes).not.toContain('FB-CP-102');
    });

    it('should handle pagination correctly', async () => {
      const res = await request(app).get('/api/products?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(2);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(2);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.totalPages).toBe(2);

      const page2 = await request(app).get('/api/products?page=2&limit=2');
      expect(page2.status).toBe(200);
      expect(page2.body.data.products.length).toBe(1);
      expect(page2.body.data.page).toBe(2);
    });
  });

  describe('GET /api/products/featured', () => {
    it('should return featured published products and exclude drafts', async () => {
      const res = await request(app).get('/api/products/featured');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);

      const codes = res.body.data.map((p) => p.code);
      expect(codes).toContain('SH-90-BR');
      expect(codes).toContain('FB-CP-102');
      // Even though draftProduct has isFeatured: true, it must be excluded because status is DRAFT
      expect(codes).not.toContain('PROTO-LOCK-99');
    });
  });

  describe('GET /api/products/:slug', () => {
    it('should return single published product and related products', async () => {
      const res = await request(app).get('/api/products/chrome-plated-f-bracket-heavy');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product).toBeDefined();
      expect(res.body.data.product.code).toBe('FB-CP-102');
      expect(res.body.data.product.category.name).toBe('F-Brackets');

      // Related products in category F-Brackets should include publishedProduct3
      expect(res.body.data.relatedProducts.length).toBe(1);
      expect(res.body.data.relatedProducts[0].code).toBe('BS-SS-01');
    });

    it('should return 404 when requesting a DRAFT / unpublished product slug', async () => {
      const res = await request(app).get('/api/products/prototype-magnetic-lock');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('should return 404 for non-existent product slug', async () => {
      const res = await request(app).get('/api/products/non-existent-product-slug');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
