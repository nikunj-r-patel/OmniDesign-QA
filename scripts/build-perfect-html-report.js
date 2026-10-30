const fs = require('fs');
const path = require('path');
require('dotenv').config();

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const subSecToShot = {
  'Frame 155 > Frame 154': 'defect-frame-154-hero.png',
  'Frame 155 > Frame 167': 'defect-frame-167-stats.png',
  'Frame 155 > Frame 106': 'defect-frame-106-proof.png',
  'Frame 155 > Frame 177': 'defect-frame-177-portfolio.png',
  'Frame 155 > Frame 176': 'defect-frame-176-services.png',
  'Frame 155 > Frame 175': 'defect-frame-175-ai-solutions.png',
  'Frame 155 > Frame 174': 'defect-frame-174-industries.png',
  'Frame 155 > Frame 153': 'defect-frame-153-platform.png',
  'Frame 155 > Component 124': 'defect-component-124-apps.png',
  'Frame 155 > Frame 314': 'defect-frame-314-process.png',
  'Frame 155 > Frame 172': 'defect-frame-172-reviews.png',
  'Frame 155 > Frame 171': 'defect-frame-171-faq.png',
  'Frame 155 > Frame 310': 'defect-frame-310-cta.png',
  'Frame 155 > Frame 315': 'defect-frame-315-contact.png',
  'Component 70 > 4': 'defect-component-70-footer.png',
  'Component 70 > 3': 'defect-component-70-footer.png',
  'Component 70 > 2': 'defect-component-70-footer.png',
  'Component 70 > 1': 'defect-component-70-footer.png',
  'Component 70 > Component 69': 'defect-component-70-footer.png',
  'Frame 186 > Frame 184': 'defect-frame-186-search.png'
};

const subSecMeta = {
  'Frame 155 > Frame 154': { title: 'HERO H1 TYPOGRAPHY DEFECT', badge: 'Weight Mismatch', note: 'Culprit CSS: font-weight: 700; (Figma spec: Black 900)' },
  'Frame 155 > Frame 167': { title: 'METRICS & STATS TYPOGRAPHY DEFECT', badge: 'Missing Counter / Size Defect', note: 'Culprit CSS: font-size: 50px; (Figma spec: 16px label)' },
  'Frame 155 > Frame 106': { title: 'CLIENT PROOF TYPOGRAPHY DEFECT', badge: 'Style & Size Mismatch', note: 'Culprit CSS: font-size: 12px; font-style: normal; (Figma spec: 70px Medium Italic)' },
  'Frame 155 > Frame 177': { title: 'PORTFOLIO & SELECTED WORK TYPOGRAPHY DEFECT', badge: 'Font Family & Size Mismatch', note: 'Culprit CSS: font-family: var(--font-primary); font-size: 50px; (Figma spec: JetBrains Mono 12px)' },
  'Frame 155 > Frame 176': { title: 'ECOMMERCE SERVICES TYPOGRAPHY DEFECT', badge: 'Font Family & Weight Mismatch', note: 'Culprit CSS: font-weight: 400; (Figma spec: JetBrains Mono Bold 700)' },
  'Frame 155 > Frame 175': { title: 'AI SOLUTIONS TYPOGRAPHY DEFECT', badge: 'Font Family & Weight Mismatch', note: 'Culprit CSS: font-weight: 400; (Figma spec: JetBrains Mono Bold 700)' },
  'Frame 155 > Frame 174': { title: 'INDUSTRIES TYPOGRAPHY DEFECT', badge: 'Weight & Size Mismatch', note: 'Culprit CSS: font-weight: 900; (Figma spec: JetBrains Mono 12px Bold 700)' },
  'Frame 155 > Frame 153': { title: 'WHY BRISTM PLATFORM TYPOGRAPHY DEFECT', badge: 'Display Font Size Overshoot', note: 'Culprit CSS: font-size: 50px; (Figma spec: 70px Bold 700)' },
  'Frame 155 > Component 124': { title: 'BRISTM APPS TYPOGRAPHY DEFECT', badge: 'Mono Eyebrow Font Defect', note: 'Culprit CSS: font-family: var(--font-primary); (Figma spec: JetBrains Mono)' },
  'Frame 155 > Frame 314': { title: 'PROCESS STEPS TYPOGRAPHY DEFECT', badge: 'Font Family & Scale Defect', note: 'Culprit CSS: font-size: 50px; (Figma spec: JetBrains Mono 12px)' },
  'Frame 155 > Frame 172': { title: 'REVIEWS & TESTIMONIALS TYPOGRAPHY DEFECT', badge: 'Font Family & Size Mismatch', note: 'Culprit CSS: font-size: 14px; font-weight: 400; (Figma spec: JetBrains Mono 12px Bold 700)' },
  'Frame 155 > Frame 171': { title: 'FAQ ACCORDION TYPOGRAPHY DEFECT', badge: 'Size & Weight Mismatch', note: 'Culprit CSS: font-size: 50px; font-weight: 700; (Figma spec: 22px Regular 400)' },
  'Frame 155 > Frame 310': { title: 'CONSULTATION CTA BUTTON TYPOGRAPHY DEFECT', badge: 'Button Size Overshoot', note: 'Culprit CSS: font-size: 20px; (Figma spec: 14px Bold 700)' },
  'Frame 155 > Frame 315': { title: 'CONTACT / LET US BUILD TYPOGRAPHY DEFECT', badge: 'Display Scale Defect (-44px)', note: 'Culprit CSS: font-size: 16px; font-weight: 400; (Figma spec: 60px Bold 700)' },
  'Component 70 > 4': { title: 'FOOTER NAVIGATION TYPOGRAPHY DEFECT', badge: 'Header Weight Defect', note: 'Culprit CSS: font-size: 14px; font-weight: 700; (Figma spec: 18px Black 900)' },
  'Component 70 > 3': { title: 'FOOTER COLUMN APPS TYPOGRAPHY DEFECT', badge: 'Header Weight Defect', note: 'Culprit CSS: font-size: 16px; font-weight: 400; (Figma spec: 18px Black 900)' },
  'Component 70 > 2': { title: 'FOOTER COLUMN AI SOLUTIONS TYPOGRAPHY DEFECT', badge: 'Header Weight Defect', note: 'Culprit CSS: font-size: 16px; font-weight: 400; (Figma spec: 18px Black 900)' },
  'Component 70 > 1': { title: 'FOOTER COLUMN ECOMMERCE TYPOGRAPHY DEFECT', badge: 'Header Weight Defect', note: 'Culprit CSS: font-size: 16px; font-weight: 400; (Figma spec: 18px Black 900)' },
  'Component 70 > Component 69': { title: 'FOOTER SUB-ITEMS TYPOGRAPHY DEFECT', badge: 'Sub-item Weight Defect', note: 'Culprit CSS: font-weight: 400; (Figma spec: Bold 700)' },
  'Frame 186 > Frame 184': { title: 'INTERACTIVE SEARCH PROMPT DEFECT', badge: 'Prompt Size Overshoot (+36px)', note: 'Culprit CSS: font-size: 50px; (Figma spec: 14px Regular 400)' }
};

const tsvPath = 'reports/audit/qa-audit-multi-viewport-perfect.tsv';
const lines = fs.readFileSync(tsvPath, 'utf8').split('\n').filter(Boolean);

const allItems = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].replace(/[\r\n]+/g, ' ').trim();
  if (!line) continue;
  const p = line.split('\t');
  if (p.length < 7 || !p[6]) continue;
  allItems.push({
    viewport: p[0] || 'XL Desktop (1920px)',
    section: p[1] || 'General',
    subSection: p[2] || 'General',
    category: p[3] || 'General',
    elementName: p[4] || 'Element',
    figmaPath: p[5] || p[4] || '',
    status: p[6] || 'PASSED',
    expectedSpec: p[7] || '',
    liveMeasuredSpec: p[8] || '',
    difference: p[9] || 'None',
    severity: p[10] || 'NONE',
    rationale: p[11] || '',
    userComment: p[12] || ''
  });
}

const viewports = Array.from(new Set(allItems.map(i => i.viewport)));
const viewportsData = viewports.map(v => {
  const key = v.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return {
    key,
    label: v,
    items: allItems.filter(i => i.viewport === v)
  };
});

function renderTableRows(rows, vpKey) {
  // Track whether we already showed the screenshot card for this subsection
  const shownSubSecs = new Set();

  return rows.map((r, rIdx) => {
    const isPassed = r.status.toUpperCase().includes('PASS');
    const isCatalog = r.category.includes('Catalog Data');
    const badgeClass = isPassed ? (isCatalog ? 'badge-catalog' : 'badge-pass') : 'badge-defect';
    const statusIcon = isPassed ? '✔' : '✖';
    const commentKey = `comment_${vpKey}_${r.section}_${rIdx}`;

    const pathHtml = r.figmaPath
      .split('>')
      .map(p => escapeHtml(p.trim()))
      .join(' <span class="bc-sep">&gt;</span> ');

    const subKey = (r.section + ' > ' + r.subSection).trim();
    let screenshotEvidenceHtml = '';

    // Show screenshot card on the first defect of each defective subsection
    if (!isPassed && subSecToShot[subKey] && !shownSubSecs.has(subKey)) {
      shownSubSecs.add(subKey);
      const shot = subSecToShot[subKey];
      const meta = subSecMeta[subKey] || { title: 'REAL CHROME DEVTOOLS EVIDENCE', badge: 'Style Defect', note: '' };

      screenshotEvidenceHtml = `
        <div style="margin-top:10px; padding:10px; background:#0b111a; border:1px solid #ff7b72; border-radius:8px;">
          <div style="font-size:11px; font-weight:800; color:#ff7b72; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>🔍 REAL CHROME DEVTOOLS EVIDENCE (STYLES &amp; EXPANDED DOM SUBSECTIONS):</span>
            <a href="screenshots/${shot}" target="_blank" style="color:#58a6ff; text-decoration:underline;">Open Full Resolution ↗</a>
          </div>
          <a href="screenshots/${shot}" target="_blank">
            <img src="screenshots/${shot}" style="width:100%; max-width:850px; border-radius:6px; border:1px solid #30363d; display:block;" alt="DevTools Evidence - ${escapeHtml(meta.title)}" />
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

const viewportSectionsHtml = viewportsData.map(vp => {
  const secMap = new Map();
  vp.items.forEach(it => {
    const s = it.section || 'General';
    const sub = it.subSection || 'General';
    if (!secMap.has(s)) secMap.set(s, new Map());
    const subMap = secMap.get(s);
    if (!subMap.has(sub)) subMap.set(sub, []);
    subMap.get(sub).push(it);
  });

  const orderedSections = Array.from(secMap.keys());

  const sectionsHtml = orderedSections.map((secName, sIdx) => {
    const subMap = secMap.get(secName);
    let secTotal = 0;
    let secPassed = 0;
    let secDefects = 0;
    const layerStats = new Map();

    for (const [subName, subRows] of subMap.entries()) {
      secTotal += subRows.length;
      for (const r of subRows) {
        layerStats.set(r.category, (layerStats.get(r.category) || 0) + 1);
        if ((r.status || '').toUpperCase().includes('PASS')) secPassed++;
        else if ((r.status || '').toUpperCase().includes('DEFECT') || r.status.toUpperCase().includes('BUG')) secDefects++;
      }
    }

    const secRate = secTotal > 0 ? Math.round((secPassed / secTotal) * 100) : 100;

    const layerPills = Array.from(layerStats.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `<span class="cat-pill">${escapeHtml(cat)}: <strong>${count}</strong></span>`)
      .join(' ');

    const subSectionBlocks = Array.from(subMap.entries()).map(([subName, subRows]) => {
      return `
        <div class="subsection-wrapper">
          <div class="subsection-header">
            <span class="sub-tree-icon">↳</span>
            <span class="sub-label">FIGMA SUB-SECTION:</span>
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
            ${secDefects > 0 ? `<span class="sec-defect-badge">⚠ ${secDefects} Developer Defect${secDefects > 1 ? 's' : ''}</span>` : `<span class="sec-clean-badge">✔ Strict 1:1 Clean</span>`}
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
    <div id="tab-viewport-${vp.key}" class="viewport-tab-panel ${vp.key === viewportsData[0].key ? 'active' : ''}">
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

const projectName = process.env.PROJECT_NAME || 'Bristm';
const now = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

const totalItems = allItems.length;
const passedItems = allItems.filter(i => i.status.toUpperCase().includes('PASS')).length;
const defectItems = allItems.filter(i => i.status.toUpperCase().includes('DEFECT') || i.status.toUpperCase().includes('BUG')).length;
const overallRate = totalItems > 0 ? Math.round((passedItems / totalItems) * 100) : 100;

const tabButtonsHtml = viewportsData.map((vp, vIdx) => `
  <button class="vp-tab-btn ${vIdx === 0 ? 'active' : ''}" onclick="switchViewportTab('${vp.key}', this)">
    💻 ${escapeHtml(vp.label)} <span class="vp-badge-pill">${vp.items.length}</span>
  </button>
`).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OmniDesign-QA — Multi-Viewport Audit (${escapeHtml(projectName)})</title>
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
    .kpi-card.red::before { background: var(--danger); }
    .kpi-val { font-size: 32px; font-weight: 900; line-height: 1.1; margin-bottom: 4px; }
    .kpi-lbl { font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; }
    .kpi-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

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
    }
    .audit-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--card-border);
      vertical-align: top;
    }
    .audit-row:hover { background: rgba(255, 255, 255, 0.02); }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
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
        <button class="action-btn" onclick="window.print()">🖨 Print / Save PDF</button>
      </div>
    </header>

    <div class="summary-grid">
      <div class="kpi-card blue">
        <div class="kpi-val" style="color: var(--primary);">${totalItems}</div>
        <div class="kpi-lbl">Total Checks Across Viewports</div>
        <div class="kpi-sub">Desktop (${totalItems})</div>
      </div>
      <div class="kpi-card ${defectItems > 0 ? 'red' : 'green'}">
        <div class="kpi-val" style="color: ${defectItems > 0 ? '#ff7b72' : 'var(--success)'};">${defectItems}</div>
        <div class="kpi-lbl">Developer Defects Detected</div>
        <div class="kpi-sub">Typography mismatch &amp; structural defects</div>
      </div>
      <div class="kpi-card purple">
        <div class="kpi-val" style="color: #a371f7;">${allItems.filter(i => i.category.includes('Catalog Data')).length}</div>
        <div class="kpi-lbl">Dynamic Catalog Items</div>
        <div class="kpi-sub">Components and design specifications</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-val" style="color: var(--success);">${overallRate}%</div>
        <div class="kpi-lbl">Strict 1:1 QA Pass Rate</div>
        <div class="kpi-sub">${passedItems} out of ${totalItems} verified passed</div>
      </div>
    </div>

    <div class="viewport-tabs-bar">
      ${tabButtonsHtml}
    </div>

    <div class="controls-bar">
      <input type="text" id="searchInput" class="search-box" placeholder="Search across current viewport by layer name, breadcrumb, or typography spec..." onkeyup="filterTable()" />
    </div>

    <main>
      ${viewportSectionsHtml}
    </main>
  </div>

  <script>
    let activeVp = '${viewportsData[0].key}';

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

const outPath = 'reports/audit/human-qa-report.html';
fs.writeFileSync(outPath, html, 'utf8');
console.log('Successfully written perfect Irreverent-standard HTML report to:', outPath);
