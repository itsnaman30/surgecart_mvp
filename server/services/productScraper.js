const axios = require('axios');
const dns = require('dns').promises;
const net = require('net');

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    if (lower.startsWith('fe80')) return true; // link-local
    return false;
  }
  return false;
}

// Guard against SSRF: only allow http(s) URLs that resolve to public addresses.
async function assertSafeUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (err) {
    throw new Error('Invalid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }

  const hostname = parsed.hostname;
  const addresses = net.isIP(hostname)
    ? [hostname]
    : (await dns.lookup(hostname, { all: true })).map((entry) => entry.address);

  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw new Error('URL resolves to a disallowed address');
  }
}

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
    await assertSafeUrl(url);
    const resp = await axios.get(url, {
      timeout: 8000,
      maxRedirects: 0,
      headers: { 'User-Agent': 'SurgeCart/1.0 (+https://surgecart)' },
    });
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
