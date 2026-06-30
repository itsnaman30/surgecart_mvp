const axios = require('axios');

function tryParseJsonLd(html) {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const j = JSON.parse(m[1]);
      if (Array.isArray(j)) {
        for (const item of j) if (item?.offers?.price) return item;
      } else if (j?.offers?.price) return j;
    } catch (e) {
      // ignore
    }
  }
  return null;
}

function findMeta(html, name) {
  const re = new RegExp(`<meta\\s+(?:property|name)=["']${name}["']\\s+content=["'](.*?)["']`, 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

function extractPriceFromText(html) {
  // Look for INR/₹ or Rs patterns
  const re = /(?:₹|Rs\.?|INR\s?)\s?([0-9]{1,3}(?:[,0-9]{3})*(?:\.[0-9]{1,2})?)/g;
  const m = re.exec(html);
  if (m) return Number(m[1].replace(/,/g, ''));
  return null;
}

async function scrapeProduct(url) {
  try {
    const resp = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'SurgeCart/1.0 (+https://surgecart)' } });
    const html = resp.data || '';

    // title
    let title = findMeta(html, 'og:title') || (html.match(/<title>(.*?)<\/title>/i) || [])[1] || '';

    // checkout/canonical url
    const checkoutUrl = findMeta(html, 'og:url') || (html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["'](.*?)["']/i) || [])[1] || url;

    // try JSON-LD
    const jld = tryParseJsonLd(html);
    let price = null;
    if (jld) {
      const p = jld.offers?.price || jld.offers?.priceSpecification?.price;
      if (p) price = Number(p);
      if (!title && jld.name) title = jld.name;
    }

    if (!price) {
      // look for meta price
      const metaPrice = findMeta(html, 'product:price:amount') || findMeta(html, 'og:price:amount');
      if (metaPrice) price = Number(metaPrice);
    }

    if (!price) {
      price = extractPriceFromText(html);
    }

    const normalize = (value) => value.replace(/<[^>]*>/g, '').trim();
    return {
      title: normalize(title || ''),
      checkoutUrl: normalize(checkoutUrl || url),
      price: price == null ? null : Number(price),
    };
  } catch (err) {
    return { title: '', checkoutUrl: url, price: null };
  }
}

module.exports = { scrapeProduct };
