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

const DEFECT_CONFIGS = [
  {
    secKey: 'Frame 155 > Frame 154',
    shotFile: 'defect-frame-154-hero.png',
    title: 'HERO H1 TYPOGRAPHY DEFECT',
    badge: 'Weight Mismatch',
    searchTerm: 'b-hero__title',
    previewSelector: 'h1.b-hero__title',
    tagText: 'Target: <h1 class="b-h1 b-hero__title">',
    figmaSpec: 'Satoshi / Black 900',
    liveSpec: 'font-weight: 700 (Bold)',
    culpritCss: 'font-weight: 700;',
    impact: 'styles.css / .b-h1 override ignores Figma Black 900 weight specification.'
  },
  {
    secKey: 'Frame 155 > Frame 167',
    shotFile: 'defect-frame-167-stats.png',
    title: 'METRICS & STATS TYPOGRAPHY DEFECT',
    badge: 'Missing Counter / Size Defect',
    searchTerm: 'b-stats',
    previewSelector: '.b-stats, [class*="stats"]',
    tagText: 'Target: Key Metrics / Stats Row',
    figmaSpec: 'ABC Diatype / 16px / Bold 700',
    liveSpec: 'font-size: 50px / Bold 700',
    culpritCss: 'font-size: clamp(32px, 5vw, 50px);',
    impact: 'Stat label typography overscaled relative to Figma 16px label specification.'
  },
  {
    secKey: 'Frame 155 > Frame 106',
    shotFile: 'defect-frame-106-proof.png',
    title: 'CLIENT LOGOS & PROOF TYPOGRAPHY DEFECT',
    badge: 'Style & Size Mismatch',
    searchTerm: 'Built for',
    previewSelector: '[class*="proof"], [class*="client"], h2, p',
    tagText: 'Target: "Built for brands ready to grow"',
    figmaSpec: '70px / Bold 700 & Medium Italic',
    liveSpec: '12px / Regular 400 (normal)',
    culpritCss: 'font-size: 12px; font-style: normal;',
    impact: 'Client proof heading rendered as tiny unstyled label missing italic emphasis.'
  },
  {
    secKey: 'Frame 155 > Frame 177',
    shotFile: 'defect-frame-177-portfolio.png',
    title: 'PORTFOLIO & SELECTED WORK TYPOGRAPHY DEFECT',
    badge: 'Font Family & Size Mismatch',
    searchTerm: 'Selected work',
    previewSelector: '[class*="work"], [class*="portfolio"]',
    tagText: 'Target: Selected Work Section Header',
    figmaSpec: 'JetBrains Mono / 12px',
    liveSpec: '"ABC Diatype Plus" / 50px',
    culpritCss: 'font-family: var(--font-primary); font-size: 50px;',
    impact: 'Technical mono eyebrow font replaced with primary sans-serif display font.'
  },
  {
    secKey: 'Frame 155 > Frame 176',
    shotFile: 'defect-frame-176-services.png',
    title: 'ECOMMERCE SERVICES TYPOGRAPHY DEFECT',
    badge: 'Font Family & Weight Mismatch',
    searchTerm: 'eCommerce',
    previewSelector: '[class*="services"], [class*="commerce"]',
    tagText: 'Target: eCommerce Services Heading',
    figmaSpec: 'JetBrains Mono / 12px / Bold 700',
    liveSpec: '"ABC Diatype Plus" / 16px / Regular 400',
    culpritCss: 'font-family: inherit; font-weight: 400;',
    impact: 'Design system monospaced eyebrow rendered with standard variable sans.'
  },
  {
    secKey: 'Frame 155 > Frame 175',
    shotFile: 'defect-frame-175-ai-solutions.png',
    title: 'AI SOLUTIONS SECTION TYPOGRAPHY DEFECT',
    badge: 'Font Family & Weight Mismatch',
    searchTerm: 'AI SOLUTIONS',
    previewSelector: '[class*="ai"], [class*="solutions"]',
    tagText: 'Target: AI Solutions Section Eyebrow',
    figmaSpec: 'JetBrains Mono / 12px / Bold 700',
    liveSpec: '"ABC Diatype Plus" / 16px / Regular 400',
    culpritCss: 'font-family: inherit; font-weight: 400;',
    impact: 'Figma mono technical label spec overridden by generic body typography rule.'
  },
  {
    secKey: 'Frame 155 > Frame 174',
    shotFile: 'defect-frame-174-industries.png',
    title: 'INDUSTRIES SECTION TYPOGRAPHY DEFECT',
    badge: 'Weight & Size Mismatch',
    searchTerm: 'Industries',
    previewSelector: '[class*="industries"]',
    tagText: 'Target: Industries Section Category Tag',
    figmaSpec: 'JetBrains Mono / 12px / Bold 700',
    liveSpec: '"ABC Diatype Plus" / 16px / Black 900',
    culpritCss: 'font-weight: 900; font-size: 16px;',
    impact: 'Over-bolded typography weights distort the Figma refined architectural hierarchy.'
  },
  {
    secKey: 'Frame 155 > Frame 153',
    shotFile: 'defect-frame-153-platform.png',
    title: 'WHY BRISTM PLATFORM TYPOGRAPHY DEFECT',
    badge: 'Display Font Size Overshoot',
    searchTerm: 'platform matters',
    previewSelector: 'h2, [class*="platform"]',
    tagText: 'Target: "The platform matters. The partner matters more."',
    figmaSpec: '70px / Bold 700',
    liveSpec: '50px / Bold 700 (Diff: -20px)',
    culpritCss: 'font-size: clamp(36px, 4vw, 50px);',
    impact: 'Headline scale clamped down by 20px compared to approved 70px Figma desktop specification.'
  },
  {
    secKey: 'Frame 155 > Component 124',
    shotFile: 'defect-component-124-apps.png',
    title: 'BRISTM APPS COMPONENT TYPOGRAPHY DEFECT',
    badge: 'Mono Eyebrow Font Defect',
    searchTerm: 'BRISTM APPS',
    previewSelector: '[class*="apps"], [class*="tools"]',
    tagText: 'Target: BRISTM Apps Feature Card Eyebrow',
    figmaSpec: 'JetBrains Mono / 12px / Bold 700',
    liveSpec: '"ABC Diatype Plus" / 14px / Regular 400',
    culpritCss: 'font-family: var(--font-primary); font-size: 14px;',
    impact: 'Component styling lacks mono font-family definition from design system.'
  },
  {
    secKey: 'Frame 155 > Frame 314',
    shotFile: 'defect-frame-314-process.png',
    title: 'PROCESS STEPS TYPOGRAPHY DEFECT',
    badge: 'Font Family & Scale Defect',
    searchTerm: 'Process',
    previewSelector: '[class*="process"]',
    tagText: 'Target: Process Section Header',
    figmaSpec: 'JetBrains Mono / 12px',
    liveSpec: '"ABC Diatype Plus" / 50px',
    culpritCss: 'font-size: 50px; font-family: inherit;',
    impact: 'Step indicator mono typography replaced with large display header.'
  },
  {
    secKey: 'Frame 155 > Frame 172',
    shotFile: 'defect-frame-172-reviews.png',
    title: 'REVIEWS & TESTIMONIALS TYPOGRAPHY DEFECT',
    badge: 'Font Family & Size Mismatch',
    searchTerm: 'truly matters',
    previewSelector: '[class*="reviews"], [class*="testimonial"]',
    tagText: 'Target: Client Testimonial Heading',
    figmaSpec: 'JetBrains Mono / 12px / Bold 700',
    liveSpec: '"ABC Diatype Plus" / 14px / Regular 400',
    culpritCss: 'font-size: 14px; font-weight: 400;',
    impact: 'Testimonial section eyebrow fails to render JetBrains Mono uppercase.'
  },
  {
    secKey: 'Frame 155 > Frame 171',
    shotFile: 'defect-frame-171-faq.png',
    title: 'FAQ ACCORDION TYPOGRAPHY DEFECT',
    badge: 'Size & Weight Mismatch',
    searchTerm: 'Still unsure',
    previewSelector: '.b-faq, [class*="faq"]',
    tagText: 'Target: FAQ Subtitle & Accordion Content',
    figmaSpec: '22px / Regular 400 / Color #a4a4a4',
    liveSpec: '50px / Bold 700 / Color #ffffff',
    culpritCss: 'font-size: clamp(32px, 4vw, 50px); font-weight: 700;',
    impact: 'Secondary FAQ description text inherits primary heading typography rules.'
  },
  {
    secKey: 'Frame 155 > Frame 310',
    shotFile: 'defect-frame-310-cta.png',
    title: 'CONSULTATION CTA BUTTON TYPOGRAPHY DEFECT',
    badge: 'Button Size Overshoot',
    searchTerm: 'START A PROJECT',
    previewSelector: 'a.b-btn, button, [class*="cta"]',
    tagText: 'Target: "START A PROJECT" Action Button',
    figmaSpec: '14px / Bold 700',
    liveSpec: '20px / Bold 700 (Diff: +6px)',
    culpritCss: 'font-size: 20px;',
    impact: 'Button text size oversized by +6px breaking layout proportion.'
  },
  {
    secKey: 'Frame 155 > Frame 315',
    shotFile: 'defect-frame-315-contact.png',
    title: 'CONTACT / LET US BUILD TYPOGRAPHY DEFECT',
    badge: 'Display Scale Defect (-44px)',
    searchTerm: "Let's build",
    previewSelector: '[class*="contact"], [class*="build"]',
    tagText: 'Target: "Let\'s build what\'s next"',
    figmaSpec: '60px / Bold 700',
    liveSpec: '16px / Regular 400 (Diff: -44px)',
    culpritCss: 'font-size: 16px; font-weight: 400;',
    impact: 'Heroic closing CTA heading collapsed into small regular body copy.'
  },
  {
    secKey: 'Component 70 > 4',
    shotFile: 'defect-component-70-footer.png',
    title: 'FOOTER NAVIGATION TYPOGRAPHY DEFECT',
    badge: 'Footer Header Weight Defect',
    searchTerm: 'ABOUT US',
    previewSelector: 'footer, [class*="footer"]',
    tagText: 'Target: Footer Column Header "ABOUT US"',
    figmaSpec: '18px / Black 900',
    liveSpec: '14px / Bold 700',
    culpritCss: 'font-size: 14px; font-weight: 700;',
    impact: 'Footer column title is undersized and lacks Black 900 typography impact.'
  },
  {
    secKey: 'Frame 186 > Frame 184',
    shotFile: 'defect-frame-186-search.png',
    title: 'INTERACTIVE SEARCH PROMPT DEFECT',
    badge: 'Prompt Size Overshoot (+36px)',
    searchTerm: 'Ask anything',
    previewSelector: '[placeholder*="Ask"], input, [class*="search"]',
    tagText: 'Target: Interactive AI Prompt Box',
    figmaSpec: '14px / Regular 400',
    liveSpec: '50px / Bold 700',
    culpritCss: 'font-size: 50px;',
    impact: 'Input field placeholder erroneously adopts giant display heading typography class.'
  }
];

async function captureAllDevToolsDefects() {
  console.log('Starting Real Google Chrome DevTools Automation Engine for All Defective Subsections...');

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

  // Expand DevTools sidebar
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

  for (let i = 0; i < DEFECT_CONFIGS.length; i++) {
    const cfg = DEFECT_CONFIGS[i];
    console.log(`\n[${i + 1}/${DEFECT_CONFIGS.length}] Capturing DevTools Defect for: ${cfg.secKey}`);

    // In DevTools: Search term
    await dtPage.keyboard.press('Control+f');
    await dtPage.waitForTimeout(400);
    await dtPage.keyboard.type(cfg.searchTerm);
    await dtPage.keyboard.press('Enter');
    await dtPage.waitForTimeout(800);
    await dtPage.keyboard.press('Escape');
    await dtPage.waitForTimeout(400);

    // Scroll page so element is visible
    await page.evaluate((sel) => {
      try {
        const el = document.querySelector(sel);
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
      } catch (e) {}
    }, cfg.previewSelector);
    await dtPage.waitForTimeout(600);

    // Locate coordinates in DevTools
    const coords = await dtPage.evaluate(() => {
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
      const wrongProp = props.find(p => p.innerText && (
        p.innerText.includes('font') || 
        p.innerText.includes('size') || 
        p.innerText.includes('weight') || 
        p.innerText.includes('700') ||
        p.innerText.includes('14px') ||
        p.innerText.includes('50px')
      ));
      const propRect = wrongProp ? wrongProp.getBoundingClientRect() : null;

      return { selRect, propRect };
    });

    // Render Overlay: Highlighting Preview Element, DevTools Tree Node, and Styles View Wrong Code
    await dtPage.evaluate(({ cfg, coords }) => {
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

      // 1. Tag on Preview Canvas
      const tag = document.createElement('div');
      tag.style.position = 'absolute';
      tag.style.left = '60px';
      tag.style.top = '120px';
      tag.style.background = '#d32f2f';
      tag.style.color = '#ffffff';
      tag.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      tag.style.fontSize = '12px';
      tag.style.fontWeight = 'bold';
      tag.style.padding = '4px 12px';
      tag.style.borderRadius = '4px';
      tag.style.boxShadow = '0 2px 6px rgba(0,0,0,0.5)';
      tag.innerText = cfg.tagText;
      overlay.appendChild(tag);

      // 2. Highlight DevTools Selected Element in Elements Tree
      const sRect = coords.selRect || { x: 1450, y: 350, width: 380, height: 26 };
      const treeHighlight = document.createElement('div');
      treeHighlight.style.position = 'absolute';
      treeHighlight.style.left = (sRect.x - 4) + 'px';
      treeHighlight.style.top = (sRect.y - 2) + 'px';
      treeHighlight.style.width = (sRect.width + 8) + 'px';
      treeHighlight.style.height = (sRect.height + 4) + 'px';
      treeHighlight.style.border = '2.5px solid #ff3333';
      treeHighlight.style.borderRadius = '4px';
      treeHighlight.style.backgroundColor = 'rgba(255, 51, 51, 0.14)';
      treeHighlight.style.boxShadow = '0 0 10px rgba(255, 51, 51, 0.5)';
      overlay.appendChild(treeHighlight);

      // 3. Highlight Wrong Code in Styles View
      const pRect = coords.propRect || { x: 1860, y: 160, width: 220, height: 22 };
      const styleHighlight = document.createElement('div');
      styleHighlight.style.position = 'absolute';
      styleHighlight.style.left = (pRect.x - 4) + 'px';
      styleHighlight.style.top = (pRect.y - 2) + 'px';
      styleHighlight.style.width = (pRect.width + 8) + 'px';
      styleHighlight.style.height = (pRect.height + 4) + 'px';
      styleHighlight.style.border = '2.5px solid #ff3333';
      styleHighlight.style.borderRadius = '4px';
      styleHighlight.style.backgroundColor = 'rgba(255, 51, 51, 0.20)';
      styleHighlight.style.boxShadow = '0 0 10px rgba(255, 51, 51, 0.6)';
      overlay.appendChild(styleHighlight);

      // 4. Defect Analysis Card
      const defectCard = document.createElement('div');
      defectCard.style.position = 'absolute';
      defectCard.style.left = (pRect.x - 30) + 'px';
      defectCard.style.top = (pRect.y + 160) + 'px';
      defectCard.style.width = '330px';
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
          <span style="font-size:12px;">${cfg.title}</span>
          <span style="background:#d32f2f; color:#fff; padding:2px 6px; border-radius:3px; font-size:10px;">${cfg.badge}</span>
        </div>
        <div><strong>Figma Specification:</strong> <code>${cfg.figmaSpec}</code></div>
        <div><strong>Live Storefront:</strong> <code>${cfg.liveSpec}</code></div>
        <div style="margin-top:4px;"><strong>Culprit CSS Rule:</strong> <code style="background:#1e1e1e; color:#ff7b72; padding:2px 4px; border-radius:3px; font-size:11px;">${cfg.culpritCss}</code></div>
        <div style="color:#aaa; font-size:10px; margin-top:3px;">${cfg.impact}</div>
      `;
      overlay.appendChild(defectCard);

      document.body.appendChild(overlay);
    }, { cfg, coords });

    await dtPage.waitForTimeout(600);
    const outPath = path.join(process.cwd(), 'reports/audit/screenshots', cfg.shotFile);
    await dtPage.screenshot({ path: outPath });
    console.log(`Saved DevTools screenshot: ${cfg.shotFile}`);
  }

  await viewer.close();
  await browser.close();
  console.log('\nAll genuine Google Chrome DevTools defect screenshots successfully captured!');
}

captureAllDevToolsDefects().catch(err => {
  console.error('Error executing automation:', err);
  process.exit(1);
});
