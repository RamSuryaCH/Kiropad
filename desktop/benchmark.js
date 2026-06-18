const qrcode = require('qrcode-generator');

function generateUncached(url, code) {
  const payload = JSON.stringify({
    url: url.replace('https://', 'wss://'),
    code,
    v: '2.0.0',
  });

  try {
    const qr = qrcode(0, 'M');
    qr.addData(payload);
    qr.make();
    return qr.createDataURL(4, 2);
  } catch {
    return null;
  }
}

let cachedQRCode = null;
let lastTunnelUrl = undefined;
let lastPairingCode = undefined;

function generateCached(url, code) {
  if (url === lastTunnelUrl && code === lastPairingCode && cachedQRCode !== null) {
    return cachedQRCode;
  }

  const payload = JSON.stringify({
    url: url.replace('https://', 'wss://'),
    code,
    v: '2.0.0',
  });

  try {
    const qr = qrcode(0, 'M');
    qr.addData(payload);
    qr.make();
    cachedQRCode = qr.createDataURL(4, 2);
    lastTunnelUrl = url;
    lastPairingCode = code;
    return cachedQRCode;
  } catch {
    return null;
  }
}

const ITERATIONS = 10000;
const url = 'https://some-tunnel-url.loca.lt';
const code = '123456';

console.log("Benchmarking QR code generation...");

const startUncached = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  generateUncached(url, code);
}
const endUncached = performance.now();
const uncachedTime = endUncached - startUncached;

const startCached = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  generateCached(url, code);
}
const endCached = performance.now();
const cachedTime = endCached - startCached;

console.log(`Uncached time (${ITERATIONS} iterations): ${uncachedTime.toFixed(2)} ms`);
console.log(`Cached time (${ITERATIONS} iterations): ${cachedTime.toFixed(2)} ms`);
console.log(`Improvement: ${(uncachedTime / cachedTime).toFixed(2)}x faster`);
