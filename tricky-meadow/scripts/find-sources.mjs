import https from 'https';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let loc = res.headers.location;
        if (!loc.startsWith('http')) {
          const u = new URL(url);
          loc = new URL(loc, u.origin).href;
        }
        return fetchText(loc).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

const html = await fetchText('https://www.noaa.gov/jetstream');
const matches = [...html.matchAll(/href="(\/jetstream\/[a-z0-9\/-]+)"/g)].map(m => m[1]);
console.log('NOAA jetstream links:', Array.from(new Set(matches)).slice(0, 20));
