const request = require('supertest');
const app = require('../src/app');
const { Product, Category } = require('../src/models');
const fs = require('fs');
const path = require('path');

describe('Targeted Category Resolution & Catalog Consistency Tests', () => {
  let categoryHinges;
  let categoryBrackets;
  let categoryStuds;

  beforeEach(async () => {
    // 1. Setup Canonical Categories matching production schema
    categoryHinges = await Category.create({
      name: 'Shower Hinges & Enclosures',
      slug: 'shower-hinges',
      description: 'Heavy-duty solid brass 90°, 180°, and 135° shower enclosure hinges',
      isActive: true,
      displayOrder: 1,
    });

    categoryBrackets = await Category.create({
      name: 'Brackets & Clamps',
      slug: 'brackets-and-clamps',
      description: 'Precision CNC-machined architectural F-brackets and partition clamps',
      isActive: true,
      displayOrder: 2,
    });

    categoryStuds = await Category.create({
      name: 'Bullet Studs & Floor Pivots',
      slug: 'bullet-studs-and-pivots',
      description: 'Solid brass and SS 304 bullet glass studs',
      isActive: true,
      displayOrder: 3,
    });

    // 2. Setup Products across categories
    await Product.create({
      name: 'Brass Shower Hinge 90 Deg',
      title: 'Brass Shower Hinge 90 Deg',
      slug: 'brass-shower-hinge-90-deg',
      code: 'SH-90-BR',
      description: 'Heavy duty glass to wall shower hinge with brass finish',
      category: categoryHinges._id,
      finish: 'BRASS',
      basePrice: 1250,
      baseMrp: 1600,
      status: 'PUBLISHED',
      isPublished: true,
      isActive: true,
      variants: [{ sku: 'SH-90-BR-STD', size: '10mm', finish: 'BRASS', price: 1250, stock: 50 }],
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
      status: 'PUBLISHED',
      isPublished: true,
      isActive: true,
      variants: [{ sku: 'FB-CP-19', size: '19mm', finish: 'CP', price: 450, stock: 100 }],
    });

    await Product.create({
      name: 'Stainless Steel Bullet Stud 32mm',
      title: 'Stainless Steel Bullet Stud 32mm',
      slug: 'ss-bullet-stud-32mm',
      code: 'BS-SS-32',
      description: 'Point fixed standoff pin',
      category: categoryStuds._id,
      finish: 'SS',
      basePrice: 850,
      baseMrp: 1100,
      status: 'PUBLISHED',
      isPublished: true,
      isActive: true,
      variants: [{ sku: 'BS-SS-32-STD', size: '32mm', finish: 'SS', price: 850, stock: 40 }],
    });
  });

  describe('1. Canonical Slug vs Legacy Alias Resolution', () => {
    it('resolves canonical category slug "shower-hinges"', async () => {
      const res = await request(app).get('/api/products?category=shower-hinges');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.products[0].code).toBe('SH-90-BR');
    });

    it('resolves legacy alias "hinges" to canonical "shower-hinges"', async () => {
      const res = await request(app).get('/api/products?category=hinges');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.products[0].code).toBe('SH-90-BR');
    });

    it('resolves bracket aliases "f-brackets-clamps", "d-brackets", and "brackets" to "brackets-and-clamps"', async () => {
      for (const alias of ['f-brackets-clamps', 'd-brackets', 'brackets']) {
        const res = await request(app).get(`/api/products?category=${alias}`);
        expect(res.status).toBe(200);
        expect(res.body.data.total).toBe(1);
        expect(res.body.data.products[0].code).toBe('FB-CP-102');
      }
    });

    it('resolves bullet stud alias "bullet-studs-floor-pivots" to "bullet-studs-and-pivots"', async () => {
      const res = await request(app).get('/api/products?category=bullet-studs-floor-pivots');
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.products[0].code).toBe('BS-SS-32');
    });

    it('resolves category filtering by MongoDB ObjectId directly', async () => {
      const res = await request(app).get(`/api/products?category=${categoryHinges._id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.products[0].code).toBe('SH-90-BR');
    });
  });

  describe('2. Multi-Filter & Query Parameter Preservation', () => {
    it('correctly filters by category and finish together', async () => {
      const res = await request(app).get('/api/products?category=hinges&finish=BRASS');
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.products[0].code).toBe('SH-90-BR');

      // Finish mismatch should return 0 products (valid empty state)
      const resMismatch = await request(app).get('/api/products?category=hinges&finish=CP');
      expect(resMismatch.status).toBe(200);
      expect(resMismatch.body.data.total).toBe(0);
      expect(resMismatch.body.data.products).toHaveLength(0);
    });

    it('returns empty set without crashing for completely non-existent categories', async () => {
      const res = await request(app).get('/api/products?category=non-existent-fantasy-category');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(0);
      expect(res.body.data.products).toHaveLength(0);
    });
  });

  describe('3. Static JSON Catalog Fallback Dataset Verification', () => {
    const productsPath = path.resolve(__dirname, '../../client/public/data/products.json');
    const categoriesPath = path.resolve(__dirname, '../../client/public/data/categories.json');

    it('static categories.json has valid JSON and contains canonical shower-hinges', () => {
      expect(fs.existsSync(categoriesPath)).toBe(true);
      const raw = fs.readFileSync(categoriesPath, 'utf8');
      const categories = JSON.parse(raw);
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);

      const hingeCategory = categories.find((c) => c.slug === 'shower-hinges');
      expect(hingeCategory).toBeDefined();
      expect(hingeCategory.name).toBe('Shower Hinges & Enclosures');
    });

    it('static products.json has products linked to shower-hinges category id', () => {
      expect(fs.existsSync(productsPath)).toBe(true);
      const rawProducts = fs.readFileSync(productsPath, 'utf8');
      const rawCategories = fs.readFileSync(categoriesPath, 'utf8');
      const products = JSON.parse(rawProducts);
      const categories = JSON.parse(rawCategories);

      const hingeCategory = categories.find((c) => c.slug === 'shower-hinges');
      const hingeProducts = products.filter(
        (p) => p.category === hingeCategory._id || p.category?._id === hingeCategory._id
      );

      expect(hingeProducts.length).toBeGreaterThan(0);
    });
  });
});
