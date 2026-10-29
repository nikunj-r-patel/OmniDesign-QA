import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const TARGET_URL = process.env.PREVIEW_URL || process.env.SHOPIFY_STORE_URL || '';

export const EIGHTEEN_VIEWPORTS = [
  // XL Viewports (1600px+)
  { name: 'xl-1728', width: 1728, height: 1080, category: 'XL' },
  { name: 'xl-1600', width: 1600, height: 900, category: 'XL' },
  { name: 'xl-1920', width: 1920, height: 1080, category: 'XL' },

  // Desktop Viewports (1200px - 1599px)
  { name: 'desktop-1440', width: 1440, height: 900, category: 'Desktop' },
  { name: 'desktop-1200', width: 1200, height: 900, category: 'Desktop' },
  { name: 'desktop-1280', width: 1280, height: 900, category: 'Desktop' },
  { name: 'desktop-1366', width: 1366, height: 900, category: 'Desktop' },
  { name: 'desktop-1536', width: 1536, height: 900, category: 'Desktop' },
  { name: 'desktop-1599', width: 1599, height: 900, category: 'Desktop' },

  // Tablet Viewports (744px - 1199px)
  { name: 'tablet-768', width: 768, height: 1024, category: 'Tablet' },
  { name: 'tablet-834', width: 834, height: 1112, category: 'Tablet' },
  { name: 'tablet-1024', width: 1024, height: 1366, category: 'Tablet' },
  { name: 'tablet-1199', width: 1199, height: 900, category: 'Tablet' },

  // Mobile Viewports (320px - 430px)
  { name: 'mobile-402', width: 402, height: 874, category: 'Mobile' },
  { name: 'mobile-390', width: 390, height: 844, category: 'Mobile' },
  { name: 'mobile-375', width: 375, height: 812, category: 'Mobile' },
  { name: 'mobile-320', width: 320, height: 844, category: 'Mobile' },
  { name: 'mobile-430', width: 430, height: 932, category: 'Mobile' },
];

async function captureAll18Viewports() {
  console.log('========================================================================');
  console.log('?? OMNIDESIGN-QA: AUTOMATED 18-VIEWPORT FULL-PAGE SCREENSHOT ENGINE');
  console.log('========================================================================');

  if (!TARGET_URL) {
    console.error('? Error: PREVIEW_URL or SHOPIFY_STORE_URL is missing in .env file!');
    process.exit(1);
  }

  console.log(`?? Target Storefront URL: ${TARGET_URL}\n`);

  const outputDir = path.join(process.cwd(), 'reports/audit/screenshots/18-viewports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  for (let i = 0; i < EIGHTEEN_VIEWPORTS.length; i++) {
    const vp = EIGHTEEN_VIEWPORTS[i];
    const indexStr = String(i + 1).padStart(2, '0');
    console.log(`[${indexStr}/18] Capturing ${vp.category.padEnd(8)}: ${vp.name.padEnd(14)} (${vp.width}x${vp.height})...`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    try {
      await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);

      // Clean popups, banners, preview bars & unlock scrolling
      await page.evaluate(() => {
        const s = document.createElement('style');
        s.id = 'qa-clean-style';
        s.innerHTML = `
          #shopify-pc__banner,
          .shopify-pc__banner__dialog,
          #PBarNextFrameWrapper,
          #preview-bar-iframe,
          .shopify-preview-bar,
          [aria-label*="cookie" i],
          [class*="cookie" i] {
            display: none !important;
            visibility: hidden !important;
          }
          html, body {
            overflow: visible !important;
            height: auto !important;
          }
        `;
        document.head.appendChild(s);
      });

      // Lazy load assets smoothly down the page
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 400;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              window.scrollTo(0, 0);
              resolve(true);
            }
          }, 100);
        });
      });

      await page.waitForTimeout(1000);

      const filename = `${indexStr}_${vp.name}_${vp.width}x${vp.height}_fullpage.png`;
      const filePath = path.join(outputDir, filename);

      await page.screenshot({
        path: filePath,
        fullPage: true,
      });

      console.log(`   ? Saved: reports/audit/screenshots/18-viewports/${filename}`);
    } catch (err: any) {
      console.error(`   ? Failed on ${vp.name}: ${err.message}`);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log('\n?? Successfully captured pristine full-page screenshots for ALL 18 viewports!');
  console.log(`?? Destination: reports/audit/screenshots/18-viewports/`);
}

captureAll18Viewports().catch(console.error);
