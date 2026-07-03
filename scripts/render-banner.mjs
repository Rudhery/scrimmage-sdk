import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [input, output, title = 'SCRIMMAGE', eyebrow = 'TYPE SCRIPT SDK', w = '430', h = '135'] =
  process.argv.slice(2);

if (!input || !output) {
  console.error(
    'Usage: node scripts/render-banner.mjs <input.html> <output.png> [title] [eyebrow] [width] [height]',
  );
  process.exit(1);
}

const url = new URL(pathToFileURL(path.resolve(input)).href);
url.searchParams.set('title', title);
url.searchParams.set('eyebrow', eyebrow);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: 2,
});

await page.goto(url.href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: output });
await browser.close();

console.log(`WROTE ${output} (${Number(w) * 2}x${Number(h) * 2})`);
