jest.mock('axios');
const axios = require('axios');
const { scrapeProduct } = require('../services/productScraper');

describe('productScraper.scrapeProduct', () => {
  afterEach(() => jest.clearAllMocks());

  it('extracts title, url and price from JSON-LD', async () => {
    const html = `
      <html><head>
      <title>Fallback Title</title>
      <script type="application/ld+json">
        {"name":"Bisleri 1L","offers":{"price":"19.00"}}
      </script>
      </head></html>`;
    axios.get.mockResolvedValue({ data: html });

    const res = await scrapeProduct('https://example.com/p/1');
    expect(res.title).toBe('Fallback Title');
    expect(res.price).toBe(19);
    expect(res.checkoutUrl).toBe('https://example.com/p/1');
  });

  it('prefers og meta tags for title and url', async () => {
    const html = `
      <meta property="og:title" content="Meta Product" />
      <meta property="og:url" content="https://shop.example/p/2" />
      <meta property="product:price:amount" content="45" />`;
    axios.get.mockResolvedValue({ data: html });

    const res = await scrapeProduct('https://example.com/p/2');
    expect(res.title).toBe('Meta Product');
    expect(res.checkoutUrl).toBe('https://shop.example/p/2');
    expect(res.price).toBe(45);
  });

  it('falls back to extracting a rupee price from text', async () => {
    const html = `<title>Loose Item</title><div>Now only ₹499.50 today</div>`;
    axios.get.mockResolvedValue({ data: html });

    const res = await scrapeProduct('https://example.com/p/3');
    expect(res.title).toBe('Loose Item');
    expect(res.price).toBe(499.5);
  });

  it('returns null price when nothing can be parsed', async () => {
    axios.get.mockResolvedValue({ data: '<html><body>no price here</body></html>' });

    const res = await scrapeProduct('https://example.com/p/4');
    expect(res.price).toBeNull();
    expect(res.checkoutUrl).toBe('https://example.com/p/4');
  });

  it('returns a safe fallback when the request fails', async () => {
    axios.get.mockRejectedValue(new Error('network error'));

    const res = await scrapeProduct('https://example.com/p/5');
    expect(res).toEqual({ title: '', checkoutUrl: 'https://example.com/p/5', price: null });
  });
});
