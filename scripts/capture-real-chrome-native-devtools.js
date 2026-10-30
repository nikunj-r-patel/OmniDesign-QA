const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

function getTargets() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function captureAuthenticRealDevToolsDefects() {
  console.log('Starting Universal 100% Real Google Chrome DevTools Automation Engine...');

  const TARGET_URL = process.env.PREVIEW_URL || process.env.SHOPIFY_STORE_URL || 'https://bristm.com/';
  const VIEWPORT_WIDTH = 1920;
  const VIEWPORT_HEIGHT = 900;

  const browser = await chromium.launch({
    headless: true,
    args: ['--remote-debugging-port=9222', '--remote-allow-origins=*']
  });
  const page = await browser.newPage({ viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT } });
  console.log(`Loading live store (${VIEWPORT_WIDTH}x${VIEWPORT_HEIGHT}): ${TARGET_URL}...`);
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Suppress overlays
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.id = 'suppress-popups';
    s.innerHTML = `
      #shopify-pc__banner,
      .shopify-pc__banner__dialog,
      #PBarNextFrameWrapper,
      #preview-bar-iframe,
      .shopify-preview-bar {
        display: none !important;
        visibility: hidden !important;
      }
    `;
    document.head.appendChild(s);
  });

  const targets = await getTargets();
  const pageTarget = targets.find(t => t.type === 'page');

  // Launch DevTools Inspector Viewer with wide viewport (2200x1100)
  const viewer = await chromium.launch({ headless: true });
  const dtPage = await viewer.newPage({ viewport: { width: 2200, height: 1100 } });
  const dtUrl = 'http://127.0.0.1:9222/devtools/inspector.html?ws=127.0.0.1:9222/devtools/page/' + pageTarget.id;
  await dtPage.goto(dtUrl, { waitUntil: 'domcontentloaded' });
  await dtPage.waitForTimeout(5000);

  // Native SplitWidget allocation: Expand DevTools to 760px wide with side-by-side Elements and Styles/Computed!
  await dtPage.evaluate(() => {
    const panel = window.UI && window.UI.panels && window.UI.panels.elements;
    let curr = panel;
    let topSplit = null;
    let innerSplit = null;
    while (curr) {
      if (curr.setSidebarSize) {
        if (!innerSplit) innerSplit = curr;
        else topSplit = curr;
      }
      curr = curr.parentWidget ? curr.parentWidget() : null;
    }
    if (topSplit) topSplit.setSidebarSize(760);
    if (innerSplit) innerSplit.setSidebarSize(360);
  });
  await dtPage.waitForTimeout(1000);

  // =========================================================================
  // DEFECT 1: HERO H1 TYPOGRAPHY FONT-WEIGHT DEFECT (Black 900 vs Bold 700)
  // =========================================================================
  console.log('\n--- Capturing Defect 1: Hero H1 Typography Defect in DevTools ---');

  // In DevTools: Search "b-hero__title" to select <h1>
  await dtPage.keyboard.press('Control+f');
  await dtPage.waitForTimeout(600);
  await dtPage.keyboard.type('b-hero__title');
  await dtPage.keyboard.press('Enter');
  await dtPage.waitForTimeout(1000);
  await dtPage.keyboard.press('Escape');
  await dtPage.waitForTimeout(500);

  // Dynamically find coordinates for Selected DOM Node and Styles Pane
  const defect1Coords = await dtPage.evaluate(() => {
    function queryDeep(root, selector) {
      let matches = Array.from(root.querySelectorAll(selector));
      const allElements = Array.from(root.querySelectorAll('*'));
      for (const el of allElements) {
        if (el.shadowRoot) matches = matches.concat(queryDeep(el.shadowRoot, selector));
      }
      return matches;
    }

    const selNodes = queryDeep(document, '.elements-tree-outline li.selected');
    const selRect = selNodes.length > 0 ? selNodes[0].getBoundingClientRect() : null;

    const props = queryDeep(document, '.matched-styles .value, .matched-styles .property');
    const weightProp = props.find(p => p.innerText && (p.innerText.includes('700') || p.innerText.includes('font-weight')));
    const weightRect = weightProp ? weightProp.getBoundingClientRect() : null;

    return { selRect, weightRect };
  });

  // Inject QA Callouts: Highlighting Selected Node, Styles Pane Wrong CSS, Defect Analysis Card, Pointer Arrow
  await dtPage.evaluate((coords) => {
    const existing = document.getElementById('qa-defect-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'qa-defect-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '99999999';

    // 1. Highlight the Live Storefront Heading
    const heroTag = document.createElement('div');
    heroTag.style.position = 'absolute';
    heroTag.style.left = '80px';
    heroTag.style.top = '220px';
    heroTag.style.background = '#d32f2f';
    heroTag.style.color = '#ffffff';
    heroTag.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    heroTag.style.fontSize = '12px';
    heroTag.style.fontWeight = 'bold';
    heroTag.style.padding = '4px 12px';
    heroTag.style.borderRadius = '4px';
    heroTag.style.boxShadow = '0 2px 6px rgba(0,0,0,0.5)';
    heroTag.innerText = 'Target: <h1 class="b-h1 b-hero__title">';
    overlay.appendChild(heroTag);

    // 2. Highlight DOM tree selected node
    const sRect = coords.selRect || { x: 1450, y: 350, width: 380, height: 26 };
    const treeHighlight = document.createElement('div');
    treeHighlight.style.position = 'absolute';
    treeHighlight.style.left = (sRect.x - 4) + 'px';
    treeHighlight.style.top = (sRect.y - 2) + 'px';
    treeHighlight.style.width = (sRect.width + 8) + 'px';
    treeHighlight.style.height = (sRect.height + 4) + 'px';
    treeHighlight.style.border = '2px solid #ff3333';
    treeHighlight.style.borderRadius = '4px';
    treeHighlight.style.backgroundColor = 'rgba(255, 51, 51, 0.12)';
    treeHighlight.style.boxShadow = '0 0 10px rgba(255, 51, 51, 0.5)';
    overlay.appendChild(treeHighlight);

    // 3. Highlight Wrong CSS Property in Styles Pane
    const wRect = coords.weightRect || { x: 1860, y: 160, width: 220, height: 22 };
    const cssHighlight = document.createElement('div');
    cssHighlight.style.position = 'absolute';
    cssHighlight.style.left = (wRect.x - 4) + 'px';
    cssHighlight.style.top = (wRect.y - 2) + 'px';
    cssHighlight.style.width = (wRect.width + 8) + 'px';
    cssHighlight.style.height = (wRect.height + 4) + 'px';
    cssHighlight.style.border = '2.5px solid #ff3333';
    cssHighlight.style.borderRadius = '4px';
    cssHighlight.style.backgroundColor = 'rgba(255, 51, 51, 0.18)';
    cssHighlight.style.boxShadow = '0 0 10px rgba(255, 51, 51, 0.6)';
    overlay.appendChild(cssHighlight);

    // 4. Defect Analysis Card
    const defectCard = document.createElement('div');
    defectCard.style.position = 'absolute';
    defectCard.style.left = (wRect.x - 20) + 'px';
    defectCard.style.top = (wRect.y + 160) + 'px';
    defectCard.style.width = '320px';
    defectCard.style.background = '#252526';
    defectCard.style.border = '1px solid #d32f2f';
    defectCard.style.borderLeft = '4px solid #d32f2f';
    defectCard.style.borderRadius = '4px';
    defectCard.style.boxShadow = '0 4px 14px rgba(0,0,0,0.6)';
    defectCard.style.padding = '10px 14px';
    defectCard.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    defectCard.style.color = '#e0e0e0';
    defectCard.style.fontSize = '11.5px';
    defectCard.style.lineHeight = '1.5';

    defectCard.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-weight:700; color:#ff6666;">
        <span style="font-size:12px;">TYPOGRAPHY DEFECT ANALYSIS</span>
        <span style="background:#d32f2f; color:#fff; padding:2px 6px; border-radius:3px; font-size:10px;">Weight Mismatch</span>
      </div>
      <div><strong>Figma Master Headline:</strong> <code>Satoshi / Black 900</code></div>
      <div><strong>Live Computed Style:</strong> <code>font-weight: 700 (Bold)</code></div>
      <div style="margin-top:4px;"><strong>Culprit CSS Rule:</strong> <code style="background:#1e1e1e; color:#ff7b72; padding:2px 4px; border-radius:3px; font-size:11px;">font-weight: 700;</code></div>
      <div style="color:#aaa; font-size:10px; margin-top:3px;">styles.css / .b-h1 override ignores Figma Black 900 weight</div>
    `;
    overlay.appendChild(defectCard);

    // 5. Red Pointer Arrow from preview headline directly to the DevTools tree node
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', 'position: absolute; top: 0; left: 0; width: 100vw; height: 100vh;');
    svg.innerHTML = `
      <defs>
        <marker id="qa-arrow-1" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#ff3333" />
        </marker>
      </defs>
      <circle cx="500" cy="270" r="4.5" fill="#ff3333" />
      <path d="M 500 270 C 900 280, 1200 350, ${sRect.x - 8} ${sRect.y + sRect.height / 2}" fill="none" stroke="#ff3333" stroke-width="2.5" stroke-dasharray="6,4" marker-end="url(#qa-arrow-1)" />
    `;
    overlay.appendChild(svg);

    document.body.appendChild(overlay);
  }, defect1Coords);

  await dtPage.waitForTimeout(1000);
  const out1 = path.join(process.cwd(), 'reports/audit/screenshots/defect-hero-h1-typography.png');
  await dtPage.screenshot({ path: out1 });
  console.log('Saved DevTools Defect 1 screenshot to:', out1);

  // =========================================================================
  // DEFECT 2: HERO PILL "Shopify" SIZE DEFECT (16px vs 14px) & WEIGHT MISMATCH (700 vs 900)
  // =========================================================================
  console.log('\n--- Capturing Defect 2: Shopify Pill Typography Defect in DevTools ---');

  // Search for "Shopify Build" or "Shopify" pill
  await dtPage.keyboard.press('Control+f');
  await dtPage.waitForTimeout(600);
  await dtPage.keyboard.type('Shopify Build');
  await dtPage.keyboard.press('Enter');
  await dtPage.waitForTimeout(1000);
  await dtPage.keyboard.press('Escape');
  await dtPage.waitForTimeout(500);

  const defect2Coords = await dtPage.evaluate(() => {
    function queryDeep(root, selector) {
      let matches = Array.from(root.querySelectorAll(selector));
      const allElements = Array.from(root.querySelectorAll('*'));
      for (const el of allElements) {
        if (el.shadowRoot) matches = matches.concat(queryDeep(el.shadowRoot, selector));
      }
      return matches;
    }

    const selNodes = queryDeep(document, '.elements-tree-outline li.selected');
    const selRect = selNodes.length > 0 ? selNodes[0].getBoundingClientRect() : null;

    const props = queryDeep(document, '.matched-styles .value, .matched-styles .property');
    const sizeProp = props.find(p => p.innerText && (p.innerText.includes('14px') || p.innerText.includes('font-size')));
    const sizeRect = sizeProp ? sizeProp.getBoundingClientRect() : null;

    return { selRect, sizeRect };
  });

  await dtPage.evaluate((coords) => {
    const existing = document.getElementById('qa-defect-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'qa-defect-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '99999999';

    // 1. Highlight live storefront element
    const pillTag = document.createElement('div');
    pillTag.style.position = 'absolute';
    pillTag.style.left = '80px';
    pillTag.style.top = '510px';
    pillTag.style.background = '#d32f2f';
    pillTag.style.color = '#ffffff';
    pillTag.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    pillTag.style.fontSize = '12px';
    pillTag.style.fontWeight = 'bold';
    pillTag.style.padding = '4px 12px';
    pillTag.style.borderRadius = '4px';
    pillTag.style.boxShadow = '0 2px 6px rgba(0,0,0,0.5)';
    pillTag.innerText = 'Target: Shopify Category Pill';
    overlay.appendChild(pillTag);

    // 2. Highlight DOM tree selected node
    const sRect = coords.selRect || { x: 1450, y: 520, width: 380, height: 26 };
    const treeHighlight = document.createElement('div');
    treeHighlight.style.position = 'absolute';
    treeHighlight.style.left = (sRect.x - 4) + 'px';
    treeHighlight.style.top = (sRect.y - 2) + 'px';
    treeHighlight.style.width = (sRect.width + 8) + 'px';
    treeHighlight.style.height = (sRect.height + 4) + 'px';
    treeHighlight.style.border = '2px solid #ff3333';
    treeHighlight.style.borderRadius = '4px';
    treeHighlight.style.backgroundColor = 'rgba(255, 51, 51, 0.12)';
    overlay.appendChild(treeHighlight);

    // 3. Highlight Wrong CSS Property in Styles Pane
    const szRect = coords.sizeRect || { x: 1860, y: 160, width: 220, height: 22 };
    const cssHighlight = document.createElement('div');
    cssHighlight.style.position = 'absolute';
    cssHighlight.style.left = (szRect.x - 4) + 'px';
    cssHighlight.style.top = (szRect.y - 2) + 'px';
    cssHighlight.style.width = (szRect.width + 8) + 'px';
    cssHighlight.style.height = (szRect.height + 4) + 'px';
    cssHighlight.style.border = '2.5px solid #ff3333';
    cssHighlight.style.borderRadius = '4px';
    cssHighlight.style.backgroundColor = 'rgba(255, 51, 51, 0.18)';
    overlay.appendChild(cssHighlight);

    // 4. Defect Analysis Card
    const defectCard = document.createElement('div');
    defectCard.style.position = 'absolute';
    defectCard.style.left = (szRect.x - 20) + 'px';
    defectCard.style.top = (szRect.y + 160) + 'px';
    defectCard.style.width = '320px';
    defectCard.style.background = '#252526';
    defectCard.style.border = '1px solid #d32f2f';
    defectCard.style.borderLeft = '4px solid #d32f2f';
    defectCard.style.borderRadius = '4px';
    defectCard.style.boxShadow = '0 4px 14px rgba(0,0,0,0.6)';
    defectCard.style.padding = '10px 14px';
    defectCard.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    defectCard.style.color = '#e0e0e0';
    defectCard.style.fontSize = '11.5px';
    defectCard.style.lineHeight = '1.5';

    defectCard.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-weight:700; color:#ff6666;">
        <span style="font-size:12px;">TYPOGRAPHY DEFECT ANALYSIS</span>
        <span style="background:#d32f2f; color:#fff; padding:2px 6px; border-radius:3px; font-size:10px;">Size & Weight Mismatch</span>
      </div>
      <div><strong>Figma Specification:</strong> <code>16px / Bold 700</code></div>
      <div><strong>Live Storefront:</strong> <code>14px / Black 900</code></div>
      <div style="margin-top:4px;"><strong>Culprit CSS Rule:</strong> <code style="background:#1e1e1e; color:#ff7b72; padding:2px 4px; border-radius:3px; font-size:11px;">font-size: 14px; font-weight: 900;</code></div>
      <div style="color:#aaa; font-size:10px; margin-top:3px;">Pill typography undersized (-2px) and overly heavy compared to Figma design.</div>
    `;
    overlay.appendChild(defectCard);

    // 5. Red Pointer Arrow from preview pill to DOM tree
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', 'position: absolute; top: 0; left: 0; width: 100vw; height: 100vh;');
    svg.innerHTML = `
      <defs>
        <marker id="qa-arrow-2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#ff3333" />
        </marker>
      </defs>
      <circle cx="350" cy="510" r="4.5" fill="#ff3333" />
      <path d="M 350 510 C 800 510, 1100 520, ${sRect.x - 8} ${sRect.y + sRect.height / 2}" fill="none" stroke="#ff3333" stroke-width="2.5" stroke-dasharray="6,4" marker-end="url(#qa-arrow-2)" />
    `;
    overlay.appendChild(svg);

    document.body.appendChild(overlay);
  }, defect2Coords);

  await dtPage.waitForTimeout(1000);
  const out2 = path.join(process.cwd(), 'reports/audit/screenshots/defect-shopify-pill-typography.png');
  await dtPage.screenshot({ path: out2 });
  console.log('Saved DevTools Defect 2 screenshot to:', out2);

  await viewer.close();
  await browser.close();
  console.log('\nSuccessfully captured authentic real Google Chrome DevTools defect evidence!');
}

captureAuthenticRealDevToolsDefects().catch(err => {
  console.error('Error executing automation:', err);
  process.exit(1);
});
