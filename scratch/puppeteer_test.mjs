import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:3000/login');
  await page.waitForSelector('input[type="email"]');
  
  await page.type('input[type="email"]', 'owner@inka.com');
  await page.type('input[type="password"]', 'inka2026');
  
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('Navigation timeout'))
  ]);
  
  console.log('Current URL after login:', page.url());
  
  await page.screenshot({ path: join(__dirname, 'screenshot.png') });
  
  await browser.close();
})();
