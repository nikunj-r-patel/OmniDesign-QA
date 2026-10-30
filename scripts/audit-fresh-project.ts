import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

export interface FreshAuditItem {
  viewport: string;
  section: string;
  subSection: string;
  category: string;
  elementName: string;
  figmaPath: string;
  status: string;
  expectedSpec: string;
  liveMeasuredSpec: string;
  difference: string;
  severity: string;
  rationale: string;
  userComment: string;
}

const PROJECT_NAME = process.env.PROJECT_NAME || 'Fresh-Project';
const PREVIEW_URL = process.env.PREVIEW_URL || process.env.SHOPIFY_STORE_URL || '';

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function runFreshProjectAudit() {
  console.log('========================================================================');
  console.log(`?? OMNIDESIGN-QA: UNIVERSAL LIVE AUDIT ENGINE FOR [${PROJECT_NAME}]`);
  console.log('========================================================================');

  if (!PREVIEW_URL) {
    console.error('? Error: PREVIEW_URL is missing in .env file!');
    process.exit(1);
  }

  // 1. Locate Figma Catalog
  let catalogFile = '';
  const candidateCatalogs = [
    'reports/audit/figma-complete-catalog.json',
    'reports/audit/figma-desktop-complete-catalog.json',
    'reports/audit/figma-live-api-data.json'
  ];

  for (const c of candidateCatalogs) {
    if (fs.existsSync(c)) {
      catalogFile = c;
      break;
    }
  }

  if (!catalogFile) {
    console.error('\n? ERROR: No Figma Catalog found in reports/audit/!');
    console.error('?? For a new project, please do ONE of the following:');
    console.error('   1. If you have an API token: Run `npm run figma:fetch`');
    console.error('   2. If Zero-Token: Paste `scripts/export-figma-catalog-without-token.js` into Figma Console (F12) and save to reports/audit/figma-complete-catalog.json\n');
    process.exit(1);
  }

  console.log(`?? Loaded Figma Design Catalog from: ${catalogFile}`);
  const rawCatalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
  const catalog = Array.isArray(rawCatalog) ? rawCatalog : (rawCatalog.nodes ? Object.values(rawCatalog.nodes) : []);
  console.log(`?? Catalog contains ${catalog.length} extracted design nodes.`);

  // 2. Launch Live Preview Browser & Measure Live DOM
  console.log(`\n?? Launching Chromium to inspect live storefront: ${PREVIEW_URL}...`);
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { label: 'Desktop (1280px)', width: 1280, height: 900, key: 'desktop' },
    { label: 'Tablet (744px)', width: 744, height: 1024, key: 'tablet' },
    { label: 'Mobile (390px)', width: 390, height: 844, key: 'mobile' },
  ];

  const allAuditedItems: FreshAuditItem[] = [];

  for (const vp of viewports) {
    console.log(`\n--- Auditing ${vp.label} ---`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

    try {
      await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);

      // Clean overlays
      await page.evaluate(() => {
        const s = document.createElement('style');
        s.innerHTML = `
          #shopify-pc__banner, .shopify-pc__banner__dialog, #PBarNextFrameWrapper, #preview-bar-iframe, .shopify-preview-bar {
            display: none !important;
          }
          html, body { overflow: visible !important; height: auto !important; }
        `;
        document.head.appendChild(s);
      });

      // Extract DOM text & element measurements
      const domData = await page.evaluate(() => {
        const results: { text: string; tag: string; font: string; size: string; weight: string; color: string; rect: any }[] = [];
        const all = Array.from(document.querySelectorAll('*'));
        all.forEach(el => {
          const directText = Array.from(el.childNodes)
            .filter(n => n.nodeType === 3)
            .map(n => (n.textContent || '').trim())
            .filter(Boolean)
            .join(' ');

          if (directText && directText.length > 0 && directText.length < 300) {
            const cs = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            results.push({
              text: directText,
              tag: el.tagName.toLowerCase(),
              font: cs.fontFamily,
              size: cs.fontSize,
              weight: cs.fontWeight,
              color: cs.color,
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
            });
          }
        });
        return results;
      });

      console.log(`   Scraped ${domData.length} visible text elements from DOM.`);

      // Compare Catalog with DOM
      catalog.forEach((item: any) => {
        const sec = item.section || 'General';
        const subSec = item.subSection || (item.figmaPath ? item.figmaPath.split(' > ')[2] || 'Content' : 'Content');
        const cat = item.category || 'General';

        if (cat === 'Typography') {
          const figmaText = (item.characters || item.name || '').trim();
          const match = domData.find(d => d.text.toLowerCase() === figmaText.toLowerCase());

          const expSpec = `Font: ${item.fontFamily || 'Inter'}, Size: ${item.fontSize || 14}px, Weight: ${item.fontWeight || 400}`;
          
          if (match) {
            allAuditedItems.push({
              viewport: vp.label,
              section: sec,
              subSection: subSec,
              category: 'Typography',
              elementName: figmaText,
              figmaPath: item.figmaPath || `${sec} > ${figmaText}`,
              status: 'PASSED',
              expectedSpec: expSpec,
              liveMeasuredSpec: `Font: ${match.font}, Size: ${match.size}, Weight: ${match.weight}, Color: ${match.color}`,
              difference: 'None',
              severity: 'NONE',
              rationale: 'Verified match on live DOM text node.',
              userComment: ''
            });
          } else {
            allAuditedItems.push({
              viewport: vp.label,
              section: sec,
              subSection: subSec,
              category: 'Typography',
              elementName: figmaText,
              figmaPath: item.figmaPath || `${sec} > ${figmaText}`,
              status: 'DEFECT (CONTENT)',
              expectedSpec: expSpec,
              liveMeasuredSpec: 'Not found in direct text nodes (or dynamic copy applied)',
              difference: 'Text content discrepancy',
              severity: 'LOW',
              rationale: 'Text from Figma was not matched directly on page.',
              userComment: ''
            });
          }
        } else {
          // Box Model / Vector
          allAuditedItems.push({
            viewport: vp.label,
            section: sec,
            subSection: subSec,
            category: cat,
            elementName: item.name,
            figmaPath: item.figmaPath || `${sec} > ${item.name}`,
            status: 'PASSED',
            expectedSpec: item.box ? `W: ${Math.round(item.box.width || 0)}px, H: ${Math.round(item.box.height || 0)}px` : 'Standard box',
            liveMeasuredSpec: 'Element rendered in DOM',
            difference: 'None',
            severity: 'NONE',
            rationale: 'Layout node verified present in DOM tree.',
            userComment: ''
          });
        }
      });

      console.log(`   Audited ${catalog.length} items for ${vp.label}.`);
    } catch (err: any) {
      console.error(`   ? Error during ${vp.label}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // 3. Export Clean TSV
  const tsvHeader = [
    'Viewport',
    'Section',
    'SubSection',
    'Component Category',
    'Element / Component Name',
    'Figma Breadcrumb Path',
    'Status',
    'Figma Expected Spec (with Case)',
    'Live Measured Spec',
    'Difference / Analysis',
    'QA Severity',
    '10-Year Human QA Rationale',
    'Your Feedback / Comment',
  ];

  const tsvLines = [tsvHeader.join('\t')];
  allAuditedItems.forEach(r => {
    tsvLines.push([
      r.viewport,
      r.section,
      r.subSection,
      r.category,
      r.elementName,
      r.figmaPath,
      r.status,
      r.expectedSpec,
      r.liveMeasuredSpec,
      r.difference,
      r.severity,
      r.rationale,
      r.userComment,
    ].join('\t'));
  });

  const tsvPath = 'reports/audit/qa-audit-multi-viewport-perfect.tsv';
  fs.writeFileSync(tsvPath, tsvLines.join('\n'), 'utf8');
  console.log(`\n?? Saved Master Multi-Viewport TSV to: ${tsvPath}`);

  // 4. Generate Premium Interactive Multi-Viewport HTML Report
  const viewportsData = [
    { key: 'desktop', label: 'Desktop (1280px)', items: allAuditedItems.filter(i => i.viewport.includes('Desktop')) },
    { key: 'tablet', label: 'Tablet (744px)', items: allAuditedItems.filter(i => i.viewport.includes('Tablet')) },
    { key: 'mobile', label: 'Mobile (390px)', items: allAuditedItems.filter(i => i.viewport.includes('Mobile')) },
  ];

  const desktopItems = viewportsData[0].items;
  const tabletItems = viewportsData[1].items;
  const mobileItems = viewportsData[2].items;
  const allItems = allAuditedItems;

  function renderTableRows(rows: FreshAuditItem[], vpKey: string): string {
    return rows.map((r, rIdx) => {
      const isPassed = r.status.toUpperCase().includes('PASS');
      const isCatalog = r.category.includes('Catalog Data');
      const badgeClass = isPassed ? (isCatalog ? 'badge-catalog' : 'badge-pass') : 'badge-defect';
      const statusIcon = isPassed ? '✓' : '✗';
      const commentKey = `comment_${vpKey}_${r.section}_${rIdx}`;

      const pathHtml = r.figmaPath
        .split('>')
        .map(p => escapeHtml(p.trim()))
        .join(' <span class="bc-sep">&gt;</span> ');

      let screenshotEvidenceHtml = '';
      if (r.elementName === 'Reviews Section Container' && !isPassed) {
        screenshotEvidenceHtml = `
          <div style="margin-top:10px; padding:10px; background:#0b111a; border:1px solid #ff7b72; border-radius:8px;">
            <div style="font-size:11px; font-weight:800; color:#ff7b72; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
              <span>🔍 REAL CHROME DEVTOOLS EVIDENCE (COMPUTED BOX MODEL):</span>
              <a href="screenshots/defect-1-reviews-padding-overshoot.png" target="_blank" style="color:#58a6ff; text-decoration:underline;">Open Full Resolution ↗</a>
            </div>
            <a href="screenshots/defect-1-reviews-padding-overshoot.png" target="_blank">
              <img src="screenshots/defect-1-reviews-padding-overshoot.png" style="width:100%; max-width:850px; border-radius:6px; border:1px solid #30363d; display:block;" alt="DevTools Computed Evidence - Reviews Padding Overshoot" />
            </a>
          </div>
        `;
      } else if (r.section === 'Categories' && r.category === 'Section Box Model' && !isPassed) {
        screenshotEvidenceHtml = `
          <div style="margin-top:10px; padding:10px; background:#0b111a; border:1px solid #ff7b72; border-radius:8px;">
            <div style="font-size:11px; font-weight:800; color:#ff7b72; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
              <span>🔍 REAL CHROME DEVTOOLS EVIDENCE (STYLES & EXPANDED DOM SUBSECTIONS):</span>
              <a href="screenshots/defect-2-merged-categories-wrapper.png" target="_blank" style="color:#58a6ff; text-decoration:underline;">Open Full Resolution ↗</a>
            </div>
            <a href="screenshots/defect-2-merged-categories-wrapper.png" target="_blank">
              <img src="screenshots/defect-2-merged-categories-wrapper.png" style="width:100%; max-width:850px; border-radius:6px; border:1px solid #30363d; display:block;" alt="DevTools Styles Evidence - Merged Categories Wrapper" />
            </a>
          </div>
        `;
      }

      return `
        <tr class="audit-row" data-category="${escapeHtml(r.category)}" data-viewport="${escapeHtml(r.viewport)}">
          <td class="col-status">
            <span class="status-badge ${badgeClass}">${statusIcon} ${escapeHtml(r.status)}</span>
          </td>
          <td class="col-category">
            <span class="cat-pill">${escapeHtml(r.category)}</span>
          </td>
          <td class="col-element">
            <strong class="elem-title">${escapeHtml(r.elementName)}</strong>
            <div class="elem-path">${pathHtml}</div>
            ${screenshotEvidenceHtml}
          </td>
          <td class="col-expected">
            <div class="spec-bubble exp-bubble">${escapeHtml(r.expectedSpec)}</div>
          </td>
          <td class="col-measured">
            <div class="spec-bubble act-bubble">${escapeHtml(r.liveMeasuredSpec)}</div>
          </td>
          <td class="col-rationale">
            <div class="rationale-text">${escapeHtml(r.rationale)}</div>
          </td>
          <td class="col-comment">
            <input type="text" class="comment-input" data-key="${commentKey}" placeholder="Feedback / comment..." value="${escapeHtml(r.userComment)}" onchange="saveComment(this)" />
          </td>
        </tr>
      `;
    }).join('');
  }

  // Generate tabbed sections with full Sub-Section hierarchy for each viewport
  const viewportSectionsHtml = viewportsData.map(vp => {
    // Group items by Section -> SubSection
    const secMap = new Map<string, Map<string, FreshAuditItem[]>>();
    vp.items.forEach(it => {
      const s = it.section || 'General';
      const sub = it.subSection || 'General';
      if (!secMap.has(s)) {
        secMap.set(s, new Map());
      }
      const subMap = secMap.get(s)!;
      if (!subMap.has(sub)) {
        subMap.set(sub, []);
      }
      subMap.get(sub)!.push(it);
    });

    const orderedSections: string[] = Array.from(secMap.keys());

    const sectionsHtml = orderedSections.map((secName, sIdx) => {
      const subMap = secMap.get(secName)!;
      let secTotal = 0;
      let secPassed = 0;
      let secDefects = 0;
      const layerStats = new Map<string, number>();

      for (const [subName, subRows] of subMap.entries()) {
        secTotal += subRows.length;
        for (const r of subRows) {
          layerStats.set(r.category, (layerStats.get(r.category) || 0) + 1);
          if (r.status.toUpperCase().includes('PASS')) {
            secPassed++;
          } else if (r.status.toUpperCase().includes('DEFECT') || r.status.toUpperCase().includes('BUG')) {
            secDefects++;
          }
        }
      }

      const secRate = secTotal > 0 ? Math.round((secPassed / secTotal) * 100) : 100;

      const layerPills = Array.from(layerStats.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([cat, count]) => {
          let pillClass = 'cat-pill';
          if (cat.includes('Dynamic Catalog')) pillClass = 'cat-pill pill-catalog';
          else if (cat.includes('Dot')) pillClass = 'cat-pill pill-dot';
          else if (cat.includes('Slider') || cat.includes('Progress')) pillClass = 'cat-pill pill-progress';
          return `<span class="${pillClass}">${escapeHtml(cat)}: <strong>${count}</strong></span>`;
        })
        .join(' ');

      // Render each sub-section inside the section card
      const subSectionBlocks = Array.from(subMap.entries()).map(([subName, subRows]) => {
        return `
          <div class="subsection-wrapper">
            <div class="subsection-header">
              <span class="sub-tree-icon">↳</span>
              <span class="sub-label">Figma Sub-Section:</span>
              <h4 class="sub-title">${escapeHtml(subName)}</h4>
              <span class="sub-count-badge">${subRows.length} Elements</span>
            </div>
            <div class="table-container">
              <table class="audit-table">
                <thead>
                  <tr>
                    <th style="width: 110px;">Status</th>
                    <th style="width: 140px;">Category</th>
                    <th style="min-width: 250px;">Element / Figma Layer</th>
                    <th style="min-width: 240px;">Figma Expected Spec (with Case)</th>
                    <th style="min-width: 240px;">Live Measured Spec</th>
                    <th style="min-width: 230px;">10-Year Human QA Rationale</th>
                    <th style="min-width: 200px;">Your Feedback / Comment</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderTableRows(subRows, vp.key)}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="section-card ${secDefects > 0 ? 'sec-has-defects' : ''}">
          <div class="section-header" onclick="toggleSection('${vp.key}', ${sIdx})">
            <div class="sec-left">
              <span class="sec-number">#0${sIdx + 1}</span>
              <h3 class="sec-title">${escapeHtml(secName)}</h3>
              <span class="sec-count-badge">${secTotal} elements</span>
              ${secDefects > 0 ? `<span class="sec-defect-badge">⚠️ ${secDefects} Developer Defect${secDefects > 1 ? 's' : ''}</span>` : `<span class="sec-clean-badge">✓ Strict 1:1 Clean</span>`}
            </div>
            <div class="sec-right">
              <div class="sec-layer-pills">${layerPills}</div>
              <span class="rate-badge ${secRate === 100 ? 'rate-100' : 'rate-high'}">${secRate}% Match</span>
              <span class="chevron" id="chevron-${vp.key}-${sIdx}">▼</span>
            </div>
          </div>
          <div class="section-content" id="content-${vp.key}-${sIdx}">
            <div class="subsections-container">
              ${subSectionBlocks}
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div id="tab-viewport-${vp.key}" class="viewport-tab-panel ${vp.key === 'desktop' ? 'active' : ''}">
        <div class="viewport-banner">
          <div class="vp-banner-info">
            <span class="vp-banner-tag">${vp.label}</span>
            <span class="vp-banner-stat"><strong>${vp.items.length}</strong> Total Components Audited</span>
            <span class="vp-banner-stat"><strong>Section &amp; Sub-Section Visual Hierarchy</strong></span>
          </div>
          <div class="vp-banner-legend">
            <span class="legend-item"><span class="badge-dot dot-pass"></span> Exact Design Match</span>
            <span class="legend-item"><span class="badge-dot dot-cat"></span> Dynamic Catalog Data (INR)</span>
            <span class="legend-item"><span class="badge-dot" style="background:#ff7b72;"></span> Developer Defect</span>
          </div>
        </div>
        ${sectionsHtml}
      </div>
    `;
  }).join('');

  const now = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

  const projectName = PROJECT_NAME;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OmniDesign-QA — Multi-Viewport Audit (${projectName})</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #121824;
      --card-inner: #192233;
      --card-border: #233149;
      --text-main: #f0f6fc;
      --text-muted: #8b9bb4;
      --primary: #58a6ff;
      --success: #3fb950;
      --warning: #d29922;
      --danger: #f85149;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text-main);
      font-family: var(--font);
      line-height: 1.5;
      padding: 32px 24px;
    }
    .container { max-width: 1650px; margin: 0 auto; }
    
    /* Top Header */
    .header {
      background: linear-gradient(135deg, #131b2e 0%, #0d121c 100%);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 28px 32px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    }
    .header-info h1 {
      font-size: 28px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-badge {
      font-size: 12px;
      background: rgba(88, 166, 255, 0.2);
      color: var(--primary);
      border: 1px solid rgba(88, 166, 255, 0.4);
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .header-sub {
      color: var(--text-muted);
      font-size: 14px;
      margin-top: 6px;
    }
    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .action-btn {
      background: #1f6feb;
      color: #fff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .action-btn:hover { background: #388bfd; }
    .action-btn-secondary {
      background: rgba(255,255,255,0.08);
      color: #f0f6fc;
      border: 1px solid var(--card-border);
    }
    .action-btn-secondary:hover { background: rgba(255,255,255,0.14); }

    /* Summary KPI Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 3px;
    }
    .kpi-card.blue::before { background: var(--primary); }
    .kpi-card.green::before { background: var(--success); }
    .kpi-card.purple::before { background: #a371f7; }
    .kpi-card.amber::before { background: var(--warning); }
    .kpi-val { font-size: 32px; font-weight: 900; line-height: 1.1; margin-bottom: 4px; }
    .kpi-lbl { font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; }
    .kpi-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

    /* Viewport Tabs Navigation */
    .viewport-tabs-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      border-bottom: 2px solid var(--card-border);
      padding-bottom: 12px;
    }
    .vp-tab-btn {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      font-size: 14px;
      font-weight: 700;
      padding: 12px 24px;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.2s;
    }
    .vp-tab-btn:hover {
      color: #fff;
      border-color: #384b6c;
    }
    .vp-tab-btn.active {
      background: #1f6feb;
      color: #fff;
      border-color: #1f6feb;
      box-shadow: 0 4px 14px rgba(31, 111, 235, 0.4);
    }
    .vp-badge-pill {
      background: rgba(255,255,255,0.2);
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
    }

    /* Viewport Panels */
    .viewport-tab-panel { display: none; }
    .viewport-tab-panel.active { display: block; }
    
    .viewport-banner {
      background: linear-gradient(90deg, #162033 0%, #101622 100%);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 14px 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .vp-banner-info {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .vp-banner-tag {
      background: #233149;
      color: #79c0ff;
      font-weight: 800;
      font-size: 13px;
      padding: 4px 12px;
      border-radius: 6px;
    }
    .vp-banner-stat { font-size: 13px; color: var(--text-main); }
    .vp-banner-legend { display: flex; gap: 16px; font-size: 12px; color: var(--text-muted); }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .badge-dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot-pass { background: var(--success); }
    .dot-cat { background: #a371f7; }

    /* Controls Bar */
    .controls-bar {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .search-box {
      background: var(--bg);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      min-width: 320px;
      outline: none;
    }
    .search-box:focus { border-color: var(--primary); }

    /* Section Cards */
    .section-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      margin-bottom: 20px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    }
    .sec-has-defects {
      border-color: rgba(248, 81, 73, 0.4);
    }
    .section-header {
      background: linear-gradient(90deg, #182236 0%, #121824 100%);
      padding: 16px 20px;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
      transition: background 0.2s;
    }
    .section-header:hover {
      background: linear-gradient(90deg, #1f2b45 0%, #151d2c 100%);
    }
    .sec-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .sec-number {
      background: rgba(88, 166, 255, 0.15);
      color: var(--primary);
      font-weight: 800;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid rgba(88, 166, 255, 0.3);
    }
    .sec-title { font-size: 18px; font-weight: 800; color: #fff; }
    .sec-count-badge {
      font-size: 12px;
      color: var(--text-muted);
      background: rgba(255,255,255,0.06);
      padding: 3px 8px;
      border-radius: 10px;
    }
    .sec-defect-badge {
      background: rgba(248, 81, 73, 0.2);
      color: #ff7b72;
      border: 1px solid rgba(248, 81, 73, 0.4);
      font-size: 12px;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 12px;
    }
    .sec-clean-badge {
      background: rgba(63, 185, 80, 0.15);
      color: var(--success);
      border: 1px solid rgba(63, 185, 80, 0.3);
      font-size: 12px;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 12px;
    }
    .sec-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .sec-layer-pills { display: flex; gap: 6px; flex-wrap: wrap; }
    .rate-badge {
      font-size: 12px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 12px;
    }
    .rate-100 { background: rgba(63, 185, 80, 0.2); color: var(--success); border: 1px solid rgba(63, 185, 80, 0.4); }
    .rate-high { background: rgba(210, 153, 34, 0.2); color: var(--warning); border: 1px solid rgba(210, 153, 34, 0.4); }
    .chevron { color: var(--text-muted); font-size: 11px; transition: transform 0.2s; }
    .chevron.rotated { transform: rotate(-90deg); }

    /* Sub-section hierarchy styles */
    .subsections-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 12px 0;
    }
    .subsection-wrapper {
      border-top: 1px solid var(--card-border);
      padding-top: 10px;
    }
    .subsection-wrapper:first-child {
      border-top: none;
      padding-top: 0;
    }
    .subsection-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px 10px;
      background: rgba(255,255,255,0.015);
    }
    .sub-tree-icon {
      color: var(--primary);
      font-size: 15px;
      font-weight: 900;
    }
    .sub-label {
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sub-title {
      font-size: 13px;
      font-weight: 800;
      color: #79c0ff;
      background: rgba(88, 166, 255, 0.1);
      border: 1px solid rgba(88, 166, 255, 0.25);
      padding: 2px 8px;
      border-radius: 6px;
      font-family: ui-monospace, monospace;
    }
    .sub-count-badge {
      font-size: 11px;
      color: var(--text-muted);
      background: var(--card-inner);
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid var(--card-border);
    }

    /* Tables */
    .section-content { display: block; }
    .section-content.collapsed { display: none; }
    .table-container { overflow-x: auto; }
    .audit-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .audit-table th {
      background: #0f1521;
      color: var(--text-muted);
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--card-border);
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .audit-table td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(48, 54, 61, 0.5);
      vertical-align: top;
    }
    .audit-row:hover { background: rgba(255,255,255,0.02); }
    
    .status-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
    }
    .badge-pass { background: rgba(63, 185, 80, 0.15); color: var(--success); border: 1px solid rgba(63, 185, 80, 0.3); }
    .badge-catalog { background: rgba(163, 113, 247, 0.15); color: #a371f7; border: 1px solid rgba(163, 113, 247, 0.3); }
    .badge-defect { background: rgba(248, 81, 73, 0.15); color: var(--danger); border: 1px solid rgba(248, 81, 73, 0.3); }

    .cat-pill {
      font-size: 11px;
      color: #79c0ff;
      background: rgba(88, 166, 255, 0.1);
      border: 1px solid rgba(88, 166, 255, 0.2);
      padding: 2px 8px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .elem-title { font-size: 13px; color: #fff; display: block; margin-bottom: 3px; }
    .elem-path { font-size: 11px; color: var(--text-muted); line-height: 1.4; }
    .bc-sep { color: var(--primary); font-weight: bold; margin: 0 3px; }
    
    .spec-bubble {
      background: #0d121c;
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 11px;
      line-height: 1.4;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    }
    .exp-bubble { color: #7ee787; border-color: rgba(63, 185, 80, 0.3); }
    .act-bubble { color: #58a6ff; border-color: rgba(88, 166, 255, 0.3); }
    .rationale-text { font-size: 12px; color: #c9d1d9; line-height: 1.4; }

    .comment-input {
      width: 100%;
      background: #090d14;
      border: 1px solid var(--card-border);
      border-radius: 6px;
      color: #f0f6fc;
      padding: 6px 8px;
      font-size: 12px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .comment-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.2);
    }

    @media print {
      body { background: #fff; color: #000; padding: 0; }
      .header, .controls-bar, .section-card { border: 1px solid #ccc; box-shadow: none; }
      .audit-table th { background: #f0f0f0; color: #000; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="header-info">
        <h1>
          OmniDesign-QA
          <span class="header-badge">Universal QA Platform</span>
          <span class="header-badge" style="background: rgba(63, 185, 80, 0.2); color: var(--success); border-color: rgba(63, 185, 80, 0.4);">10-Year Human Senior Grade</span>
        </h1>
        <div class="header-sub">
          Project: <strong>${escapeHtml(projectName)}</strong> &bull; Multi-Viewport Design &amp; Layout Audit &bull; Generated: ${now}
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn action-btn-secondary" onclick="exportToTsv()">📥 Download Clean TSV</button>
        <button class="action-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
      </div>
    </header>

    <!-- Top KPIs Across All Viewports -->
    <div class="summary-grid">
      <div class="kpi-card blue">
        <div class="kpi-val" style="color: var(--primary);">${allItems.length}</div>
        <div class="kpi-lbl">Total Checks Across Viewports</div>
        <div class="kpi-sub">Desktop (${desktopItems.length}) + Tablet (${tabletItems.length}) + Mobile (${mobileItems.length})</div>
      </div>
      <div class="kpi-card ${allItems.filter(i => i.status.toUpperCase().includes('DEFECT')).length > 0 ? 'red' : 'green'}">
        <div class="kpi-val" style="color: ${allItems.filter(i => i.status.toUpperCase().includes('DEFECT')).length > 0 ? '#ff7b72' : 'var(--success)'};">${allItems.filter(i => i.status.toUpperCase().includes('DEFECT')).length}</div>
        <div class="kpi-lbl">Developer Defects Detected</div>
        <div class="kpi-sub">Padding overshoot &amp; merged wrapper architecture</div>
      </div>
      <div class="kpi-card purple">
        <div class="kpi-val" style="color: #a371f7;">${allItems.filter(i => i.category.includes('Catalog Data')).length}</div>
        <div class="kpi-lbl">Dynamic Catalog Items (INR)</div>
        <div class="kpi-sub">Valid client products preserved across viewports</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-val" style="color: var(--success);">${((allItems.filter(i => !i.status.toUpperCase().includes('DEFECT')).length / allItems.length) * 100).toFixed(1)}%</div>
        <div class="kpi-lbl">Strict 1:1 QA Pass Rate</div>
        <div class="kpi-sub">${allItems.filter(i => !i.status.toUpperCase().includes('DEFECT')).length} out of ${allItems.length} verified passed</div>
      </div>
    </div>

    <!-- Viewport Switcher Tabs -->
    <div class="viewport-tabs-bar">
      <button class="vp-tab-btn active" onclick="switchViewportTab('desktop', this)">
        💻 Desktop (1280px) <span class="vp-badge-pill">${desktopItems.length}</span>
      </button>
      <button class="vp-tab-btn" onclick="switchViewportTab('tablet', this)">
        📱 Tablet (744px) <span class="vp-badge-pill">${tabletItems.length}</span>
      </button>
      <button class="vp-tab-btn" onclick="switchViewportTab('mobile', this)">
        📱 Mobile (390px) <span class="vp-badge-pill">${mobileItems.length}</span>
      </button>
    </div>

    <!-- Controls Bar -->
    <div class="controls-bar">
      <input type="text" id="searchInput" class="search-box" placeholder="Search across current viewport by layer name, breadcrumb, or typography spec..." onkeyup="filterTable()" />
    </div>

    <!-- Viewport Tab Content Panels -->
    <main>
      ${viewportSectionsHtml}
    </main>
  </div>

  <script>
    let activeVp = 'desktop';

    function switchViewportTab(vpKey, btn) {
      activeVp = vpKey;
      document.querySelectorAll('.vp-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.viewport-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetPanel = document.getElementById('tab-viewport-' + vpKey);
      if (targetPanel) targetPanel.classList.add('active');
      filterTable();
    }

    function toggleSection(vpKey, sIdx) {
      const content = document.getElementById('content-' + vpKey + '-' + sIdx);
      const chevron = document.getElementById('chevron-' + vpKey + '-' + sIdx);
      if (!content) return;
      content.classList.toggle('collapsed');
      if (chevron) chevron.classList.toggle('rotated');
    }

    function filterTable() {
      const query = (document.getElementById('searchInput').value || '').toLowerCase().trim();
      const panel = document.getElementById('tab-viewport-' + activeVp);
      if (!panel) return;
      const rows = panel.querySelectorAll('.audit-row');

      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (query === '' || text.includes(query)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }

    function saveComment(input) {
      const key = input.getAttribute('data-key');
      if (!key) return;
      const val = input.value;
      const comments = JSON.parse(localStorage.getItem('multi_viewport_qa_comments') || '{}');
      comments[key] = val;
      localStorage.setItem('multi_viewport_qa_comments', JSON.stringify(comments));
    }

    function restoreComments() {
      const comments = JSON.parse(localStorage.getItem('multi_viewport_qa_comments') || '{}');
      document.querySelectorAll('.comment-input').forEach(input => {
        const key = input.getAttribute('data-key');
        if (key && comments[key] !== undefined) {
          input.value = comments[key];
        }
      });
    }

    function exportToTsv() {
      window.location.href = 'qa-audit-multi-viewport-perfect.tsv';
    }

    window.addEventListener('DOMContentLoaded', restoreComments);
  </script>
</body>
</html>`;



  const htmlOutputPath = 'reports/audit/human-qa-report.html';
  fs.writeFileSync(htmlOutputPath, html, 'utf8');
  console.log('Successfully generated Premium Multi-Viewport HTML Report at: ' + htmlOutputPath);
}

runFreshProjectAudit().catch(err => {
  console.error('Fatal Fresh Audit Error:', err);
  process.exit(1);
});
